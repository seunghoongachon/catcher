const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username) || password.length < 8) {
        res.status(400).json({ error: '아이디는 3~30자의 영문, 숫자, 밑줄만 사용할 수 있고 비밀번호는 8자 이상이어야 합니다.' });
        return;
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const passwordHash = await bcrypt.hash(password, 12);
        await conn.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, passwordHash]);
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
            return;
        }
        console.error('회원가입 에러:', error);
        res.status(500).json({ error: '회원가입에 실패했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

router.post('/login', async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT id, username, password FROM users WHERE username = ?', [username]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            return;
        }
        delete req.session.demoUser;
        req.session.user = { id: user.id, username: user.username };
        res.json({ user: req.session.user });
    } catch (error) {
        console.error('로그인 에러:', error);
        res.status(500).json({ error: '로그인에 실패했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('로그아웃 에러:', error);
            res.status(500).json({ error: '로그아웃에 실패했습니다.' });
            return;
        }
        res.clearCookie('connect.sid');
        res.json({ message: '로그아웃되었습니다.' });
    });
});

router.get('/me', (req, res) => {
    res.json({ user: req.session.user || req.session.demoUser || null });
});

module.exports = router;
