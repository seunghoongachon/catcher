const express = require('express');
const YahooFinance = require('yahoo-finance2').default;

const router = express.Router();
const yahooFinance = new YahooFinance();

router.get('/usd-krw', async (req, res) => {
    try {
        const quote = await yahooFinance.quote('USDKRW=X');
        const rate = Number(quote && quote.regularMarketPrice);

        if (!Number.isFinite(rate) || rate <= 0) {
            throw new Error('USD/KRW 환율을 찾을 수 없습니다.');
        }

        res.json({
            base: 'USD',
            quote: 'KRW',
            rate,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('환율 연동 에러:', error);
        res.status(502).json({ error: 'USD/KRW 환율 조회 실패' });
    }
});

module.exports = router;
