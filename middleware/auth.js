const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.demoUser && req.method === 'GET') {
        req.user = req.session.demoUser;
        req.demoMode = true;
        next();
        return;
    }

    if (req.session && req.session.demoUser) {
        res.status(403).json({ error: '데모 화면에서는 데이터를 변경할 수 없습니다.' });
        return;
    }

    if (req.session && req.session.user) {
        req.user = req.session.user;
        next();
        return;
    }

    if (req.path.startsWith('/api/')) {
        res.status(401).json({ error: '로그인이 필요합니다.' });
        return;
    }
    res.redirect('/login.html');
};

module.exports = { isLoggedIn };
