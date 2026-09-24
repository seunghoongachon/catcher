const express = require('express');
const YahooFinance = require('yahoo-finance2').default;
const { isKoreanTicker, normalizeTicker } = require('../utils/ticker');

const router = express.Router();
const yahooFinance = new YahooFinance();
const koreanStockNames = {
    '000660.KS': 'SK하이닉스',
    '005930.KS': '삼성전자',
    '005935.KS': '삼성전자우'
};

router.get('/:ticker', async (req, res) => {
    try {
        const ticker = await normalizeTicker(req.params.ticker, yahooFinance);
        const quote = await yahooFinance.quote(ticker);

        if (!quote) {
            throw new Error('티커를 찾을 수 없습니다.');
        }

        res.json({
            ticker: quote.symbol,
            currentPrice: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose,
            currency: isKoreanTicker(ticker) ? 'KRW' : (quote.currency || 'USD'),
            isKorean: isKoreanTicker(ticker),
            name: koreanStockNames[ticker] || quote.longName || quote.shortName || quote.symbol
        });
    } catch (error) {
        console.error('주가 연동 에러:', error);
        res.status(500).json({ error: '주가 연동 실패' });
    }
});

router.get('/history/:ticker', async (req, res) => {
    try {
        const ticker = await normalizeTicker(req.params.ticker, yahooFinance);
        const endDate = new Date();
        const requestedDates = [req.query.sellDate, req.query.buyDate]
            .filter(Boolean)
            .map((value) => new Date(value))
            .filter((date) => !Number.isNaN(date.getTime()));
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);

        const earliestRequestedDate = requestedDates.sort((left, right) => left - right)[0];
        if (earliestRequestedDate && earliestRequestedDate < startDate) {
            startDate.setTime(earliestRequestedDate.getTime());
        }

        const chart = await yahooFinance.chart(ticker, {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });
        const quotes = (chart && chart.quotes ? chart.quotes : [])
            .filter((quote) => Number.isFinite(Number(quote.close)))
            .map((quote) => ({
                date: quote.date,
                close: Number(quote.close)
            }));

        res.json({
            ticker,
            currency: isKoreanTicker(ticker) ? 'KRW' : (chart.meta && chart.meta.currency) || 'USD',
            quotes
        });
    } catch (error) {
        console.error('주가 이력 연동 에러:', error);
        res.status(500).json({ error: '주가 이력 연동 실패' });
    }
});

module.exports = router;
