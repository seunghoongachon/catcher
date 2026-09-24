require('dotenv').config();

const express = require('express');
const path = require('path');
const { initDatabase } = require('./db');

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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/price', priceRoutes);
app.use('/api/sell-history', sellHistoryRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/nasdaq-top10', nasdaqTop10Routes);
app.use('/api/exchange-rate', exchangeRateRoutes);
app.use('/api/stock-search', stockSearchRoutes);
app.use('/api/compound-presets', compoundPresetRoutes);
app.use('/api/parse-trade-screenshot', parseTradeScreenshotRoutes);
app.use('/api/buy-presets', buyPresetRoutes);

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
