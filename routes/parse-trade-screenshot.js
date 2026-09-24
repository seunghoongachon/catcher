const express = require('express');
const multer = require('multer');
const pool = require('../db');
const YahooFinance = require('yahoo-finance2').default;
const { normalizeTicker } = require('../utils/ticker');

const router = express.Router();
const yahooFinance = new YahooFinance();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            callback(null, true);
            return;
        }
        callback(new Error('이미지 파일만 업로드할 수 있습니다.'));
    }
});
const uploadScreenshot = (req, res, next) => {
    upload.single('screenshot')(req, res, (error) => {
        if (error) {
            console.error('스크린샷 업로드 에러:', error);
            res.status(400).json({ error: error.message || '이미지 업로드 실패' });
            return;
        }
        next();
    });
};

const ensureTradeHistoryTable = async (conn) => {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS trade_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticker VARCHAR(32) NOT NULL,
            trade_type VARCHAR(4) NOT NULL,
            trade_date DATE NOT NULL,
            price DECIMAL(20, 6) NOT NULL,
            quantity DECIMAL(20, 6) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_trade_history_ticker_date (ticker, trade_date)
        )
    `);
};

const parseJsonResponse = (content) => {
    const cleaned = String(content || '')
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    const parsed = JSON.parse(cleaned);
    const trades = Array.isArray(parsed) ? parsed : parsed.trades;
    if (!Array.isArray(trades) || trades.length === 0) {
        throw new Error('이미지에서 거래 내역을 찾지 못했습니다.');
    }
    return trades;
};

const parseWithOpenAi = async (file) => {
    const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) {
        const error = new Error('OPENAI_API_KEY가 설정되지 않았습니다. 프로젝트 루트의 .env에 OPENAI_API_KEY를 추가하고 서버를 재시작하세요.');
        error.code = 'OPENAI_API_KEY_MISSING';
        error.statusCode = 503;
        throw error;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
            temperature: 0,
            response_format: { type: 'json_object' },
            messages: [{
                role: 'system',
                content: 'You extract stock transactions from brokerage screenshots. Return only JSON with a trades array. Never guess missing values; omit uncertain trades.'
            }, {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Extract every clearly visible transaction. Each trade must have ticker, tradeType (BUY or SELL), tradeDate (YYYY-MM-DD), price (number), and quantity (number). Normalize US symbols to uppercase and preserve Korean Yahoo suffixes such as .KS or .KQ when visible. Return {"trades":[...]} only.'
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                            detail: 'high'
                        }
                    }
                ]
            }]
        })
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error && payload.error.message ? payload.error.message : 'Vision API 호출 실패');
    }
    return parseJsonResponse(payload.choices && payload.choices[0] && payload.choices[0].message.content);
};

router.post('/', uploadScreenshot, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '분석할 이미지 파일을 선택하세요.' });
    }

    let conn;
    try {
        const extractedTrades = await parseWithOpenAi(req.file);
        const trades = extractedTrades.map((trade) => ({
            ticker: String(trade.ticker || '').trim().toUpperCase(),
            tradeType: String(trade.tradeType || '').trim().toUpperCase(),
            tradeDate: String(trade.tradeDate || '').trim(),
            price: Number(trade.price),
            quantity: Number(trade.quantity)
        })).filter((trade) => (
            trade.ticker &&
            ['BUY', 'SELL'].includes(trade.tradeType) &&
            /^\d{4}-\d{2}-\d{2}$/.test(trade.tradeDate) &&
            Number.isFinite(trade.price) && trade.price > 0 &&
            Number.isFinite(trade.quantity) && trade.quantity > 0
        ));

        if (trades.length === 0) {
            throw new Error('유효한 거래 데이터가 이미지에 없습니다.');
        }

        conn = await pool.getConnection();
        await ensureTradeHistoryTable(conn);
        const savedTrades = [];
        for (const trade of trades) {
            const normalizedTicker = await normalizeTicker(trade.ticker, yahooFinance);
            await conn.query(
                'INSERT INTO trade_history (ticker, trade_type, trade_date, price, quantity) VALUES (?, ?, ?, ?, ?)',
                [normalizedTicker, trade.tradeType, trade.tradeDate, trade.price, trade.quantity]
            );
            if (trade.tradeType === 'SELL') {
                await conn.query(`
                    ALTER TABLE sell_history
                    ADD COLUMN IF NOT EXISTS sell_quantity DECIMAL(20, 4) NOT NULL DEFAULT 0
                `);
                await conn.query(
                    'INSERT INTO sell_history (ticker, sell_price, sell_quantity, sell_date) VALUES (?, ?, ?, ?)',
                    [normalizedTicker, trade.price, trade.quantity, trade.tradeDate]
                );
            }
            savedTrades.push({ ...trade, ticker: normalizedTicker });
        }
        res.status(201).json({ trades: savedTrades });
    } catch (error) {
        console.error('거래 스크린샷 분석 에러:', error);
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 400;
        res.status(statusCode).json({
            error: error.message || '거래 스크린샷 분석 실패',
            code: error.code || 'TRADE_SCREENSHOT_PARSE_FAILED'
        });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
