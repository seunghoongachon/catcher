const express = require('express');
const pool = require('../db');
const YahooFinance = require('yahoo-finance2').default;
const { normalizeTicker } = require('../utils/ticker');

const router = express.Router();
const yahooFinance = new YahooFinance();

router.post('/', async (req, res) => {
    const { ticker, avgPrice, quantity } = req.body;
    let conn;

    try {
        conn = await pool.getConnection();
        const normalizedTicker = await normalizeTicker(ticker, yahooFinance);
        await conn.query(
            `INSERT INTO portfolio (user_id, ticker, avg_price, quantity)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                avg_price = VALUES(avg_price),
                quantity = VALUES(quantity)`,
            [req.user.id, normalizedTicker, avgPrice, quantity]
        );
        res.status(201).json({ message: '포트폴리오가 업데이트되었습니다.', ticker: normalizedTicker });
    } catch (error) {
        console.error('포트폴리오 저장 에러:', error);
        res.status(500).json({ error: 'DB 저장 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.get('/', async (req, res) => {
    let conn;

    try {
        conn = await pool.getConnection();
        const rows = await conn.query(
            'SELECT * FROM portfolio WHERE user_id = ? ORDER BY updated_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('포트폴리오 조회 에러:', error);
        res.status(500).json({ error: 'DB 조회 실패' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
