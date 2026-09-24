let usdKrwPromise;

export const getUsdKrwRate = async () => {
    if (!usdKrwPromise) {
        usdKrwPromise = fetch('/api/exchange-rate/usd-krw')
            .then(async (response) => {
                const payload = await response.json().catch(() => null);
                if (!response.ok || !payload || !Number.isFinite(Number(payload.rate))) {
                    throw new Error(payload && payload.error
                        ? payload.error
                        : 'USD/KRW 환율 조회 실패');
                }
                return Number(payload.rate);
            })
            .catch((error) => {
                usdKrwPromise = null;
                throw error;
            });
    }

    return usdKrwPromise;
};

export const formatKrw = (usdAmount, exchangeRate) => (
    Number.isFinite(Number(exchangeRate)) && Number.isFinite(Number(usdAmount))
        ? `₩${(Number(usdAmount) * Number(exchangeRate)).toLocaleString('ko-KR', {
            maximumFractionDigits: 0
        })}`
        : '환율 조회 대기'
);
