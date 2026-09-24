require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDatabase } = require('./db');
const { isLoggedIn } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/price');
const sellHistoryRoutes = require('./routes/sell-history');
const portfolioRoutes = require('./routes/portfolio');
const accountRoutes = require('./routes/accounts');
const nasdaqTop10Routes = require('./routes/nasdaq-top10');
const exchangeRateRoutes = require('./routes/exchange-rate');
const stockSearchRoutes = require('./routes/stock-search');
const compoundPresetRoutes = require('./routes/compound-presets');
const parseTradeScreenshotRoutes = require('./routes/parse-trade-screenshot');
const buyPresetRoutes = require('./routes/buy-presets');

const app = express();
const PORT = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET
    || (process.env.NODE_ENV === 'production' ? null : 'development-only-session-secret');

if (!sessionSecret) {
    throw new Error('프로덕션 환경에서는 SESSION_SECRET 환경 변수가 필요합니다.');
}
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(express.json());
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));
app.get('/', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/sell-history', isLoggedIn, sellHistoryRoutes);
app.use('/api/portfolio', isLoggedIn, portfolioRoutes);
app.use('/api/accounts', isLoggedIn, accountRoutes);
app.use('/api/nasdaq-top10', nasdaqTop10Routes);
app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/stock-search', stockSearchRoutes);
app.use('/api/compound-presets', isLoggedIn, compoundPresetRoutes);
app.use('/api/parse-trade-screenshot', isLoggedIn, parseTradeScreenshotRoutes);
app.use('/api/buy-presets', isLoggedIn, buyPresetRoutes);

const startServer = async () => {
    await initDatabase();
    app.listen(PORT, () => {
        console.log(`서버 실행: http://localhost:${PORT}`);
    });
};

startServer().catch((error) => {
    console.error('서버 시작 실패:', error);
    process.exitCode = 1;
});
