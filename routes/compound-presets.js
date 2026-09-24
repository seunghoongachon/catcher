const express = require('express');
const pool = require('../db');

const router = express.Router();

const ensureTable = async (conn) => {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS compound_presets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            preset_name VARCHAR(100) NOT NULL UNIQUE,
            account_id INT NULL,
            interest_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
            compounding_type ENUM('ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY',
            years INT NOT NULL DEFAULT 10,
            payments TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await ensureTable(conn);
        const rows = await conn.query('SELECT * FROM compound_presets ORDER BY updated_at DESC');
        res.json(rows.map((row) => ({
            ...row,
            payments: JSON.parse(row.payments || '[]')
        })));
    } catch (error) {
        console.error('복리 프리셋 조회 에러:', error);
        res.status(500).json({ error: '복리 프리셋 조회 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.post('/', async (req, res) => {
    const { presetName, accountId = null, interestRate, compoundingType, years, payments = [] } = req.body;
    let conn;
    try {
        const numericRate = Number(interestRate);
        const numericYears = Number(years);
        if (!presetName || presetName.length > 100 || !Number.isFinite(numericRate) || numericRate < 0
            || !['ANNUAL', 'MONTHLY'].includes(compoundingType)
            || !Number.isInteger(numericYears) || numericYears < 1 || numericYears > 100
            || !Array.isArray(payments)) {
            return res.status(400).json({ error: '프리셋 입력값이 올바르지 않습니다.' });
        }
        const normalizedPayments = payments.map((payment) => ({
            month: Number(payment.month),
            amount: Number(payment.amount)
        }));
        if (normalizedPayments.some((payment) => !Number.isInteger(payment.month)
            || payment.month < 1 || payment.month > numericYears * 12
            || !Number.isFinite(payment.amount) || payment.amount < 0)) {
            return res.status(400).json({ error: '추가납입 입력값이 올바르지 않습니다.' });
        }
        conn = await pool.getConnection();
        await ensureTable(conn);
        await conn.query(`
            INSERT INTO compound_presets
                (preset_name, account_id, interest_rate, compounding_type, years, payments)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                account_id = VALUES(account_id),
                interest_rate = VALUES(interest_rate),
                compounding_type = VALUES(compounding_type),
                years = VALUES(years),
                payments = VALUES(payments)
        `, [presetName.trim(), accountId ? Number(accountId) : null, numericRate, compoundingType, numericYears, JSON.stringify(normalizedPayments)]);
        res.status(201).json({ message: '복리 프리셋이 저장되었습니다.' });
    } catch (error) {
        console.error('복리 프리셋 저장 에러:', error);
        res.status(500).json({ error: '복리 프리셋 저장 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.delete('/:id', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await ensureTable(conn);
        await conn.query('DELETE FROM compound_presets WHERE id = ?', [Number(req.params.id)]);
        res.json({ message: '복리 프리셋이 삭제되었습니다.' });
    } catch (error) {
        console.error('복리 프리셋 삭제 에러:', error);
        res.status(500).json({ error: '복리 프리셋 삭제 실패' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
