const express = require('express');
const pool = require('../db');
const YahooFinance = require('yahoo-finance2').default;
const { normalizeTicker } = require('../utils/ticker');

const router = express.Router();
const yahooFinance = new YahooFinance();

const ensureSellQuantityColumn = async (conn) => {
    await conn.query(`
        ALTER TABLE sell_history
        ADD COLUMN IF NOT EXISTS sell_quantity DECIMAL(20, 4) NOT NULL DEFAULT 0
    `);
};

router.post('/', async (req, res) => {
    const { ticker, sellPrice, sellQty = 0, sellDate } = req.body;
    let conn;

    try {
        conn = await pool.getConnection();
        await ensureSellQuantityColumn(conn);
        const normalizedTicker = await normalizeTicker(ticker, yahooFinance);
        await conn.query(
            'INSERT INTO sell_history (user_id, ticker, sell_price, sell_quantity, sell_date) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, normalizedTicker, Number(sellPrice), Number(sellQty) || 0, sellDate || new Date()]
        );
        res.status(201).json({ message: '매도 기록이 성공적으로 저장되었습니다.' });
    } catch (error) {
        console.error('DB 저장 에러:', error);
        res.status(500).json({ error: 'DB 저장 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.get('/:ticker', async (req, res) => {
    let conn;

    try {
        conn = await pool.getConnection();
        await ensureSellQuantityColumn(conn);
        const ticker = await normalizeTicker(req.params.ticker, yahooFinance);
        const rows = await conn.query(
            'SELECT * FROM sell_history WHERE user_id = ? AND ticker = ? ORDER BY sell_date DESC, id DESC',
            [req.user.id, ticker]
        );
        res.json(rows);
    } catch (error) {
        console.error('DB 조회 에러:', error);
        res.status(500).json({ error: 'DB 조회 실패' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
