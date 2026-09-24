const koreanCodePattern = /^\d{6}$/;
const koreanSymbolPattern = /^\d{6}\.(KS|KQ)$/;

const isKoreanTicker = (ticker) => koreanSymbolPattern.test(String(ticker).toUpperCase());

const normalizeTicker = async (value, yahooFinance) => {
    const input = String(value || '').trim().toUpperCase();
    if (!input) {
        throw new Error('티커가 필요합니다.');
    }
    if (!koreanCodePattern.test(input)) {
        return input;
    }

    const candidates = [];
    for (const suffix of ['.KS', '.KQ']) {
        const candidate = `${input}${suffix}`;
        try {
            const quote = await yahooFinance.quote(candidate);
            if (quote && Number.isFinite(Number(quote.regularMarketPrice))) {
                const exchange = String(quote.fullExchangeName || quote.exchange || '').toUpperCase();
                const isKospi = suffix === '.KS' && (exchange.includes('KSE') || exchange.includes('KOSPI'));
                const isKosdaq = suffix === '.KQ' && exchange.includes('KOSDAQ');
                candidates.push({ candidate, isCorrectMarket: isKospi || isKosdaq });
            }
        } catch (error) {
            console.warn(`한국 주식 티커 조회 실패 (${candidate}):`, error.message);
        }
    }
    const marketMatch = candidates.find((candidate) => candidate.isCorrectMarket);
    if (marketMatch) {
        return marketMatch.candidate;
    }
    if (candidates.length > 0) {
        return candidates[0].candidate;
    }
    throw new Error(`한국 주식 코드(${input})를 KOSPI/KOSDAQ에서 찾을 수 없습니다.`);
};

module.exports = { isKoreanTicker, normalizeTicker };
