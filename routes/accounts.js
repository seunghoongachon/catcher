const express = require('express');
const pool = require('../db');
const YahooFinance = require('yahoo-finance2').default;

const router = express.Router();
const yahooFinance = new YahooFinance();

const ensureAccountColumns = async (conn) => {
    await conn.query(`
        ALTER TABLE bank_accounts
        ADD COLUMN IF NOT EXISTS original_balance DECIMAL(20, 4) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'KRW',
        ADD COLUMN IF NOT EXISTS compounding_type ENUM('ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY'
    `);
    await conn.query(`
        ALTER TABLE bank_accounts
        MODIFY COLUMN account_type ENUM('CMA', 'GENERAL', 'SAVINGS', 'SECURITIES')
        NOT NULL DEFAULT 'GENERAL'
    `);
};

router.post('/', async (req, res) => {
    const { accountName, accountType, balance, currency = 'KRW', interestRate, compoundingType = 'MONTHLY' } = req.body;
    let conn;

    try {
        const numericBalance = Number(balance);
        if (!accountName || !Number.isFinite(numericBalance) || numericBalance < 0) {
            return res.status(400).json({ error: '계좌명과 유효한 잔고를 입력하세요.' });
        }
        if (!['GENERAL', 'CMA', 'SAVINGS', 'SECURITIES'].includes(accountType)) {
            return res.status(400).json({ error: '지원하지 않는 계좌 유형입니다.' });
        }
        if (!['KRW', 'USD'].includes(currency)) {
            return res.status(400).json({ error: '지원하지 않는 통화입니다.' });
        }
        if (!['ANNUAL', 'MONTHLY'].includes(compoundingType)) {
            return res.status(400).json({ error: '지원하지 않는 복리 방식입니다.' });
        }

        conn = await pool.getConnection();
        await ensureAccountColumns(conn);
        let usdKrwRate = 1;
        if (currency === 'USD') {
            const quote = await yahooFinance.quote('USDKRW=X');
            usdKrwRate = Number(quote && quote.regularMarketPrice);
            if (!Number.isFinite(usdKrwRate) || usdKrwRate <= 0) {
                throw new Error('USD/KRW 환율을 찾을 수 없습니다.');
            }
        }
        const balanceKrw = numericBalance * usdKrwRate;
        await conn.query(
            `INSERT INTO bank_accounts
                (user_id, account_name, account_type, balance, original_balance, currency, interest_rate, compounding_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                account_type = VALUES(account_type),
                balance = VALUES(balance),
                original_balance = VALUES(original_balance),
                currency = VALUES(currency),
                interest_rate = VALUES(interest_rate),
                compounding_type = VALUES(compounding_type)`,
            [req.user.id, accountName, accountType, balanceKrw, numericBalance, currency, Number(interestRate) || 0, compoundingType]
        );
        res.status(201).json({ message: '계좌 정보가 업데이트되었습니다.', exchangeRate: usdKrwRate });
    } catch (error) {
        console.error('계좌 저장 에러:', error);
        res.status(500).json({ error: 'DB 저장 실패' });
    } finally {
        if (conn) conn.release();
    }
});

router.get('/', async (req, res) => {
    let conn;

    try {
        conn = await pool.getConnection();
        await ensureAccountColumns(conn);
        const rows = await conn.query(
            'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY updated_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('계좌 조회 에러:', error);
        res.status(500).json({ error: 'DB 조회 실패' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
