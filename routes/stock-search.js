const express = require('express');
const YahooFinance = require('yahoo-finance2').default;

const router = express.Router();
const yahooFinance = new YahooFinance();
const koreanAliases = new Map([
    ['삼성전자', 'Samsung Electronics'],
    ['삼성전자우', 'Samsung Electronics'],
    ['sk하이닉스', 'SK hynix'],
    ['현대차', 'Hyundai Motor'],
    ['현대자동차', 'Hyundai Motor'],
    ['카카오', 'Kakao'],
    ['네이버', 'Naver'],
    ['셀트리온', 'Celltrion'],
    ['에코프로비엠', 'EcoPro BM'],
    ['에코프로', 'EcoPro']
]);

router.get('/', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
        return res.json([]);
    }

    try {
        const searchQuery = koreanAliases.get(query.toLowerCase()) || query;
        const result = await yahooFinance.search(searchQuery);
        const quotes = (result.quotes || [])
            .filter((quote) => {
                const symbol = String(quote.symbol || '').toUpperCase();
                return /^[0-9]{6}\.(KS|KQ)$/.test(symbol)
                    || ['EQUITY', 'ETF'].includes(quote.quoteType);
            })
            .map((quote) => ({
                symbol: quote.symbol,
                name: quote.longname || quote.shortname || quote.symbol,
                exchange: quote.exchange || '',
                market: quote.exchDisp || quote.exchange || '',
                currency: quote.currency || (String(quote.symbol).match(/\.K[QS]$/) ? 'KRW' : 'USD')
            }))
            .filter((quote) => quote.symbol && quote.name);
        res.json(quotes);
    } catch (error) {
        console.error('종목 검색 에러:', error);
        res.status(502).json({ error: '종목 검색 실패' });
    }
});

module.exports = router;
