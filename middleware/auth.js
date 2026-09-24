const isLoggedIn = (req, res, next) => {
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
