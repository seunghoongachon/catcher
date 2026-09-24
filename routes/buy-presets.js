const express = require('express');
const pool = require('../db');

const router = express.Router();

const ensureTable = async (conn) => {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS buy_presets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            preset_name VARCHAR(100) NOT NULL UNIQUE,
            ticker VARCHAR(32) NOT NULL,
            buy_entries TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

const normalizeEntries = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error('매수 내역을 하나 이상 입력하세요.');
    }
    const normalized = entries.map((entry) => ({
        date: String(entry.date || '').trim(),
        price: Number(entry.price),
        quantity: Number(entry.quantity)
    }));
    if (normalized.some((entry) => !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
        || !Number.isFinite(entry.price) || entry.price <= 0
        || !Number.isFinite(entry.quantity) || entry.quantity <= 0)) {
        throw new Error('매수일, 매수가, 수량을 올바르게 입력하세요.');
    }
    return normalized;
};

router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await ensureTable(conn);
        const rows = await conn.query('SELECT * FROM buy_presets ORDER BY updated_at DESC');
        res.json(rows.map((row) => ({
            ...row,
            buy_entries: JSON.parse(row.buy_entries || '[]')
        })));
    } catch (error) {
        console.error('매수 프리셋 조회 에러:', error);
        res.status(500).json({ error: '매수 프리셋 조회 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.post('/', async (req, res) => {
    const { presetName, ticker, buyEntries } = req.body;
    let conn;
    try {
        const name = String(presetName || '').trim();
        const normalizedTicker = String(ticker || '').trim().toUpperCase();
        if (!name || name.length > 100 || !normalizedTicker) {
            return res.status(400).json({ error: '프리셋 이름과 티커를 입력하세요.' });
        }
        const normalizedEntries = normalizeEntries(buyEntries);
        conn = await pool.getConnection();
        await ensureTable(conn);
        await conn.query(`
            INSERT INTO buy_presets (preset_name, ticker, buy_entries)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                ticker = VALUES(ticker),
                buy_entries = VALUES(buy_entries)
        `, [name, normalizedTicker, JSON.stringify(normalizedEntries)]);
        res.status(201).json({ message: '매수 프리셋이 저장되었습니다.' });
    } catch (error) {
        console.error('매수 프리셋 저장 에러:', error);
        res.status(400).json({ error: error.message || '매수 프리셋 저장 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await ensureTable(conn);
        await conn.query('DELETE FROM buy_presets WHERE id = ?', [Number(req.params.id)]);
        res.json({ message: '매수 프리셋이 삭제되었습니다.' });
    } catch (error) {
        console.error('매수 프리셋 삭제 에러:', error);
        res.status(500).json({ error: '매수 프리셋 삭제 실패' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
