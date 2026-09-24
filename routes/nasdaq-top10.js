const express = require('express');
const YahooFinance = require('yahoo-finance2').default;
const { normalizeTicker } = require('../utils/ticker');

const router = express.Router();
const yahooFinance = new YahooFinance();

const DEFAULT_WATCHLIST = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN',
    'META', 'TSLA', 'AVGO', 'COST', 'NFLX'
];

router.get('/', async (req, res) => {
    try {
        const requestedSymbols = typeof req.query.symbols === 'string'
            ? req.query.symbols.split(',')
            : DEFAULT_WATCHLIST;
        const symbols = [...new Set(requestedSymbols
            .map((symbol) => symbol.trim().toUpperCase())
            .filter((symbol) => /^[A-Z0-9.-]{1,10}$/.test(symbol)))].slice(0, 50);

        if (symbols.length === 0) {
            return res.status(400).json({ error: '조회할 티커를 하나 이상 입력하세요.' });
        }

        const quotes = await Promise.all(
            symbols.map(async (symbol) => {
                try {
                    const normalizedSymbol = await normalizeTicker(symbol, yahooFinance);
                    const quote = await yahooFinance.quote(normalizedSymbol);
                    const currentPrice = Number(quote && quote.regularMarketPrice);
                    const previousClose = Number(quote && quote.regularMarketPreviousClose);
                    const change = Number(quote && quote.regularMarketChange);
                    const safeChange = Number.isFinite(change)
                        ? change
                        : Number.isFinite(previousClose)
                            ? currentPrice - previousClose
                            : 0;
                    const rawChangePercent = Number(quote && quote.regularMarketChangePercent);
                    const safeChangePercent = Number.isFinite(rawChangePercent)
                        ? rawChangePercent
                        : previousClose > 0
                            ? (safeChange / previousClose) * 100
                            : 0;

                    if (!Number.isFinite(currentPrice)) {
                        throw new Error(`${symbol} 현재가를 찾을 수 없습니다.`);
                    }

                    return {
                        ticker: quote.symbol || normalizedSymbol,
                        name: quote.longName || quote.shortName || quote.symbol || normalizedSymbol,
                        currentPrice,
                        currency: quote.currency || 'USD',
                        marketState: quote.marketState || null,
                        change: safeChange,
                        changePercent: safeChangePercent
                    };
                } catch (error) {
                    console.error(`${symbol} 주가 조회 실패:`, error);
                    return null;
                }
            })
        );

        const validQuotes = quotes.filter(Boolean);
        res.json(validQuotes);
    } catch (error) {
        console.error('나스닥 Top 10 주가 연동 에러:', error);
        res.status(500).json({
            error: '나스닥 Top 10 주가 연동 실패'
        });
    }
});

module.exports = router;
