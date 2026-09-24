let portfolioState = [];
import { formatKrw, getUsdKrwRate } from './currency.js';
let usdKrwRate = null;
let cashAssetTotal = 0;
let stockDailyChangeKrw = 0;
const DEMO_CURRENT_PRICES = {
    AAPL: 195.25,
    NVDA: 132.40,
    '005930.KS': 78300
};

const formatUsd = (amount) => `$${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;
const formatPrice = (amount, currency) => currency === 'KRW'
    ? `₩${Number(amount).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}`
    : formatUsd(amount);
const formatSignedKrw = (amount) => `${amount >= 0 ? '+' : '-'}₩${Math.abs(amount).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
const changeClass = (amount) => amount >= 0 ? 'text-green-600' : 'text-red-500';

const updateAssetSummary = (data) => {
    const stockTotalKrw = data.reduce((total, item) => total + item.evalAmountKrw, 0);
    const stockTotalUsd = data.reduce((total, item) => total + item.evalAmountUsd, 0);
    const combinedTotalKrw = stockTotalKrw === null
        ? null
        : stockTotalKrw + cashAssetTotal;

    document.getElementById('stockAssetTotal').textContent = stockTotalKrw === null
        ? '환율 조회 대기'
        : `₩${stockTotalKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    document.getElementById('stockAssetUsd').textContent = `${formatUsd(stockTotalUsd)} 기준`;
    const stockChangeRate = stockTotalKrw - stockDailyChangeKrw > 0
        ? (stockDailyChangeKrw / (stockTotalKrw - stockDailyChangeKrw)) * 100
        : 0;
    const stockChangeElement = document.getElementById('stockAssetChange');
    stockChangeElement.className = `text-xs ${changeClass(stockDailyChangeKrw)}`;
    stockChangeElement.textContent = `전일대비 ${formatSignedKrw(stockDailyChangeKrw)} (${stockChangeRate >= 0 ? '+' : ''}${stockChangeRate.toFixed(2)}%)`;
    document.getElementById('cashAssetTotal').textContent =
        `₩${cashAssetTotal.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    document.getElementById('combinedAssetTotal').textContent = combinedTotalKrw === null
        ? '환율 조회 대기'
        : `₩${combinedTotalKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`;
    const combinedChangeRate = combinedTotalKrw - stockDailyChangeKrw > 0
        ? (stockDailyChangeKrw / (combinedTotalKrw - stockDailyChangeKrw)) * 100
        : 0;
    const combinedChangeElement = document.getElementById('combinedAssetChange');
    combinedChangeElement.className = `text-xs ${changeClass(stockDailyChangeKrw)}`;
    combinedChangeElement.textContent = `전일대비 ${formatSignedKrw(stockDailyChangeKrw)} (${combinedChangeRate >= 0 ? '+' : ''}${combinedChangeRate.toFixed(2)}%)`;
};

const renderPortfolio = (data) => {
    const tbody = document.getElementById('portfolioBody');
    const totalTbody = document.getElementById('totalPortfolioBody');
    tbody.innerHTML = '';

    stockDailyChangeKrw = data.reduce((total, item) => total + item.dailyChangeKrw, 0);

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">저장된 포트폴리오가 없습니다.</td></tr>';
        totalTbody.innerHTML = tbody.innerHTML;
        updateAssetSummary(data);
        return;
    }

    const renderStockRow = (item) => {
        const profitRate = item.investAmount > 0
            ? ((item.evalAmount - item.investAmount) / item.investAmount) * 100
            : 0;
        const colorClass = profitRate >= 0 ? 'text-green-600' : 'text-red-500';
        const sign = profitRate > 0 ? '+' : '';

        return `
            <tr class="portfolio-stock-row border-b border-gray-100">
                <td class="p-3 font-bold text-indigo-700">
                    ${item.name || item.ticker}<br>
                    <span class="text-[10px] text-gray-400 font-normal">${item.ticker}</span><br>
                    <span class="text-[10px] text-gray-500 font-normal">
                        평단 ${formatPrice(item.avg_price, item.currency)}
                        → 현재 ${formatPrice(item.currentPrice, item.currency)}
                    </span>
                </td>
                <td class="p-3 text-right">${item.quantity}주</td>
                <td class="p-3 font-semibold text-gray-800 text-right">
                    ${formatPrice(item.investAmount, item.currency)}<br>
                    <span class="text-[10px] font-normal">₩${item.investAmountKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span>
                </td>
                <td class="p-3 font-bold ${colorClass} text-right">
                    ${formatPrice(item.evalAmount, item.currency)}<br>
                    <span class="text-[10px] font-normal">₩${item.evalAmountKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span><br>
                    <span class="text-[10px]">(${sign}${profitRate.toFixed(2)}%)</span>
                </td>
                <td class="p-3 font-bold ${changeClass(item.dailyChangeKrw)} text-right">
                    ${formatPrice(item.currency === 'USD' ? item.dailyChangeUsd : item.dailyChangeKrw, item.currency)}<br>
                    <span class="text-[10px] font-normal">${formatSignedKrw(item.dailyChangeKrw)}</span><br>
                    <span class="text-[10px]">(${item.dailyChangePercent >= 0 ? '+' : ''}${item.dailyChangePercent.toFixed(2)}%)</span>
                </td>
            </tr>
        `;
    };

    const renderSubtotalRow = (label, items, className) => {
        const investKrw = items.reduce((sum, item) => sum + item.investAmountKrw, 0);
        const evalKrw = items.reduce((sum, item) => sum + item.evalAmountKrw, 0);
        const dailyKrw = items.reduce((sum, item) => sum + item.dailyChangeKrw, 0);
        const investUsd = items.reduce((sum, item) => sum + item.investAmountUsd, 0);
        const evalUsd = items.reduce((sum, item) => sum + item.evalAmountUsd, 0);
        const dailyUsd = items.reduce((sum, item) => sum + item.dailyChangeUsd, 0);
        const profitRate = investKrw > 0 ? ((evalKrw - investKrw) / investKrw) * 100 : 0;
        const previousEvalKrw = evalKrw - dailyKrw;
        const dailyRate = previousEvalKrw > 0 ? (dailyKrw / previousEvalKrw) * 100 : 0;
        const colorClass = profitRate >= 0 ? 'text-green-700' : 'text-red-600';
        const sign = profitRate > 0 ? '+' : '';

        return `
            <tr class="${className} font-bold">
                <td colspan="2" class="p-3 text-right">${label}:</td>
                <td class="p-3 text-right">₩${investKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}<br><span class="text-[10px] font-normal">${formatUsd(investUsd)}</span></td>
                <td class="p-3 text-right ${colorClass}">₩${evalKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}<br><span class="text-[10px] font-normal">${formatUsd(evalUsd)}</span><br><span class="text-[10px]">(${sign}${profitRate.toFixed(2)}%)</span></td>
                <td class="p-3 text-right ${changeClass(dailyKrw)}">${formatUsd(dailyUsd)}<br>${formatSignedKrw(dailyKrw)}<br><span class="text-[10px]">(${dailyKrw >= 0 ? '+' : ''}${dailyRate.toFixed(2)}%)</span></td>
            </tr>
        `;
    };

    const domesticStocks = data.filter((item) => item.currency === 'KRW');
    const overseasStocks = data.filter((item) => item.currency !== 'KRW');
    const renderGroup = (label, items, marketClass) => {
        if (items.length === 0) return '';
        return `
            <tr class="portfolio-group portfolio-group-${marketClass}">
                <td colspan="5" class="font-extrabold">${label} <span class="font-medium opacity-70">${items.length}종목</span></td>
            </tr>
            ${items.map(renderStockRow).join('')}
            ${renderSubtotalRow(`${label} 소계`, items, 'portfolio-subtotal')}
        `;
    };

    tbody.innerHTML = [
        renderGroup('국내 주식', domesticStocks, 'domestic'),
        renderGroup('해외 주식', overseasStocks, 'overseas'),
        renderSubtotalRow('전체 주식 총합계', data, 'portfolio-total')
    ].join('');
    totalTbody.innerHTML = tbody.innerHTML;
    updateAssetSummary(data);
};

const savePortfolio = async () => {
    const ticker = document.getElementById('portTicker').value.trim().toUpperCase();
    const avgPrice = document.getElementById('portPrice').value;
    const quantity = document.getElementById('portQty').value;

    if (!ticker || !avgPrice || !quantity) {
        alert('정보를 모두 입력하세요.');
        return;
    }

    try {
        const response = await fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, avgPrice, quantity })
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('portTicker').value = result.ticker || ticker;
            alert('주식 포트폴리오 저장 완료!');
            document.getElementById('loadPortBtn').click();
            return;
        }
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || '포트폴리오 저장에 실패했습니다.');
    } catch (error) {
        console.error(error);
    }
};

const updateStockMarketFields = () => {
    const isKorean = document.getElementById('portMarket').value === 'KR';
    const ticker = document.getElementById('portTicker');
    const koreanSearch = document.getElementById('portKoreanSearch');
    document.getElementById('portPriceLabel').textContent = isKorean ? '평단가 (₩)' : '평단가 ($)';
    document.getElementById('portTickerLabel').textContent = isKorean ? '종목번호' : '티커';
    ticker.classList.toggle('hidden', isKorean);
    koreanSearch.classList.toggle('hidden', !isKorean);
    ticker.placeholder = isKorean ? '검색 결과에서 선택' : 'AAPL';
    document.getElementById('portPrice').placeholder = isKorean ? '예: 70000' : '예: 150.50';
    document.getElementById('stockSearchResults').innerHTML = '';
};

const searchKoreanStocks = async (event) => {
    const query = event.target.value.trim();
    const results = document.getElementById('stockSearchResults');
    if (query.length < 2) {
        results.innerHTML = '';
        return;
    }
    try {
        const response = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('종목 검색 실패');
        const stocks = await response.json();
        const koreanStocks = stocks.filter((stock) => /\.K[QS]$/.test(stock.symbol));
        results.innerHTML = koreanStocks.length
            ? `<div class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                ${koreanStocks.slice(0, 8).map((stock) => `
                    <button type="button" data-stock-symbol="${stock.symbol}" data-stock-name="${stock.name}"
                        class="block w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm">
                        <strong>${stock.name}</strong>
                        <span class="text-xs text-gray-500 ml-2">${stock.symbol} · ${stock.market}</span>
                    </button>`).join('')}
            </div>`
            : '<p class="absolute left-0 right-0 mt-1 bg-white border rounded-md p-3 text-xs text-gray-500">검색 결과가 없습니다.</p>';
    } catch (error) {
        console.error(error);
        results.innerHTML = '<p class="absolute left-0 right-0 mt-1 bg-white border rounded-md p-3 text-xs text-red-500">종목 검색에 실패했습니다.</p>';
    }
};

const loadPortfolio = async () => {
    const tbody = document.getElementById('portfolioBody');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500 animate-pulse">실시간 주가 연동 중...</td></tr>';

    try {
        try {
            usdKrwRate = await getUsdKrwRate();
        } catch (error) {
            usdKrwRate = null;
            console.error('환율 조회 실패, USD 금액으로 계속 표시합니다.', error);
        }

        const response = await fetch('/api/portfolio');
        if (!response.ok) {
            throw new Error(`포트폴리오 조회 실패 (${response.status})`);
        }
        const dbData = await response.json();
        const enrichedData = dbData.map(async (item) => {
            const averagePrice = Number(item.avg_price);
            const quantity = Number(item.quantity);
            let currentPrice = DEMO_CURRENT_PRICES[item.ticker] || averagePrice;
            let priceData = {
                currency: item.ticker.endsWith('.KS') || item.ticker.endsWith('.KQ') ? 'KRW' : 'USD',
                name: item.ticker
            };

            try {
                const priceResponse = await fetch(`/api/price/${item.ticker}`);
                if (priceResponse.ok) {
                    const remotePriceData = await priceResponse.json();
                    if (Number.isFinite(Number(remotePriceData.currentPrice))) {
                        currentPrice = Number(remotePriceData.currentPrice);
                    }
                    priceData = { ...priceData, ...remotePriceData };
                }
            } catch (error) {
                console.error(`${item.ticker} 주가 연동 실패`, error);
            }

            if (!Number.isFinite(currentPrice)) {
                currentPrice = averagePrice;
            }
            const currency = priceData && priceData.currency === 'KRW' ? 'KRW' : 'USD';
            const investAmount = averagePrice * quantity;
            const previousClose = Number(priceData.previousClose);
            const dailyChange = Number.isFinite(previousClose) ? currentPrice - previousClose : 0;
            const evalAmount = currentPrice * quantity;
            const safeRate = Number.isFinite(usdKrwRate) ? usdKrwRate : 1;
            const investAmountKrw = currency === 'KRW' ? investAmount : investAmount * safeRate;
            const evalAmountKrw = currency === 'KRW' ? evalAmount : evalAmount * safeRate;
            const dailyChangeKrw = (currency === 'KRW' ? dailyChange : dailyChange * safeRate) * item.quantity;
            const dailyChangeUsd = currency === 'USD'
                ? dailyChange * item.quantity
                : dailyChange * item.quantity / safeRate;
            return { ...item, name: priceData.name || item.ticker, currentPrice, currency, investAmount, evalAmount, investAmountKrw, evalAmountKrw, dailyChange, dailyChangeKrw, dailyChangeUsd, dailyChangePercent: previousClose > 0 ? (dailyChange / previousClose) * 100 : 0, investAmountUsd: currency === 'USD' ? investAmount : investAmount / safeRate, evalAmountUsd: currency === 'USD' ? evalAmount : evalAmount / safeRate };
        });

        portfolioState = await Promise.all(enrichedData);
        portfolioState.sort((a, b) => b.evalAmountKrw - a.evalAmountKrw);
        renderPortfolio(portfolioState);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">데이터 조회 실패</td></tr>';
    }
};

window.addEventListener('cash-assets-updated', (event) => {
    cashAssetTotal = Number(event.detail.totalCash) || 0;
    updateAssetSummary(portfolioState);
});

document.getElementById('savePortBtn').addEventListener('click', savePortfolio);
document.getElementById('loadPortBtn').addEventListener('click', loadPortfolio);
document.getElementById('sortInvestBtn').addEventListener('click', () => {
    portfolioState.sort((a, b) => b.investAmountKrw - a.investAmountKrw);
    renderPortfolio(portfolioState);
});
document.getElementById('sortEvalBtn').addEventListener('click', () => {
    portfolioState.sort((a, b) => b.evalAmountKrw - a.evalAmountKrw);
    renderPortfolio(portfolioState);
});
document.getElementById('sortQtyBtn').addEventListener('click', () => {
    portfolioState.sort((a, b) => b.quantity - a.quantity);
    renderPortfolio(portfolioState);
});
document.getElementById('portMarket').addEventListener('change', updateStockMarketFields);
document.getElementById('portKoreanSearch').addEventListener('input', searchKoreanStocks);
document.getElementById('stockSearchResults').addEventListener('click', (event) => {
    const button = event.target.closest('[data-stock-symbol]');
    if (!button) return;
    document.getElementById('portTicker').value = button.dataset.stockSymbol;
    document.getElementById('portKoreanSearch').value = button.dataset.stockName;
    document.getElementById('stockSearchResults').innerHTML = '';
});
updateStockMarketFields();

export const loadInitialPortfolio = loadPortfolio;
