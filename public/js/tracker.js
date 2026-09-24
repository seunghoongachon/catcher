import { formatKrw, getUsdKrwRate } from './currency.js';

const getValue = (id) => document.getElementById(id).value;
let sellHistoryDate = null;
let priceComparisonChart = null;
let usdKrwRate = null;
let buyEntryId = 0;
const formatAmount = (amount, currency) => currency === 'KRW'
    ? `₩${Number(amount).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}`
    : `$${Number(amount).toFixed(2)}`;
const formatSignedAmount = (amount, currency) => {
    const sign = Number(amount) > 0 ? '+' : Number(amount) < 0 ? '-' : '';
    return `${sign}${formatAmount(Math.abs(Number(amount)), currency)}`;
};
const formatAmountPair = (amount, currency, signed = false) => {
    const primary = signed ? formatSignedAmount(amount, currency) : formatAmount(amount, currency);
    if (currency !== 'USD' || !Number.isFinite(usdKrwRate)) {
        return primary;
    }
    const krw = signed ? formatSignedAmount(Number(amount) * usdKrwRate, 'KRW') : formatAmount(Number(amount) * usdKrwRate, 'KRW');
    return `${primary} · ${krw}`;
};

const formatChartDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '매도 시점'
        : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

let currentCurrency = 'USD';
let buyPresets = [];
const renderPriceComparisonChart = ({ history, currentPrice, sellEntries, buyEntries, currency }) => {
    currentCurrency = currency;
    const canvas = document.getElementById('priceComparisonChart');

    if (priceComparisonChart) {
        priceComparisonChart.destroy();
    }

    const fallbackDate = sellEntries[0]?.date || buyEntries[0]?.date || new Date();
    const quotes = history.length ? history : [{ date: fallbackDate, close: currentPrice }];
    const labels = quotes.map((quote) => formatChartDate(quote.date));
    const closestIndexForDate = (date) => quotes.reduce((closestIndex, quote, index) => {
        const closestDistance = Math.abs(new Date(quotes[closestIndex].date) - new Date(date));
        const distance = Math.abs(new Date(quote.date) - new Date(date));
        return distance < closestDistance ? index : closestIndex;
    }, 0);
    const currentIndex = quotes.length - 1;
    const sellMarkers = sellEntries.map((entry) => {
        const index = closestIndexForDate(entry.date);
        return quotes.map((quote, quoteIndex) => quoteIndex === index ? entry.price : null);
    });
    const buyMarkers = buyEntries.map((entry) => {
        const index = closestIndexForDate(entry.date);
        return quotes.map((quote, quoteIndex) => quoteIndex === index ? entry.price : null);
    });
    const currentMarker = quotes.map((quote, index) => index === currentIndex ? currentPrice : null);

    if (window.ChartZoom) {
        Chart.register(window.ChartZoom);
    }
    priceComparisonChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `주가 (${currency === 'KRW' ? '₩' : '$'})`,
                data: quotes.map((quote) => quote.close),
                borderColor: '#64748b',
                backgroundColor: 'rgba(100, 116, 139, 0.12)',
                borderWidth: 2,
                tension: 0.25,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4
            }, ...sellMarkers.map((data, index) => ({
                label: `매도 ${index + 1} (${sellEntries[index].price}달러 · ${sellEntries[index].quantity}주, 파란색)`,
                data,
                borderColor: 'transparent',
                backgroundColor: '#2563eb',
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#1d4ed8',
                pointBorderWidth: 3,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            })), ...buyMarkers.map((data, index) => ({
                label: `매수 ${index + 1} (${buyEntries[index].price}달러 · ${buyEntries[index].quantity}주, 빨간색)`,
                data,
                borderColor: 'transparent',
                backgroundColor: '#dc2626',
                pointBackgroundColor: '#dc2626',
                pointBorderColor: '#991b1b',
                pointBorderWidth: 3,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            })), {
                label: '현재가',
                data: currentMarker,
                borderColor: 'transparent',
                backgroundColor: '#16a34a',
                pointBackgroundColor: '#16a34a',
                pointBorderColor: '#15803d',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                showLine: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (context) => {
                            if (context.dataset.label.startsWith('매도 시점')) {
                                return `Sell Point (기준): ${formatAmount(context.parsed.y, currentCurrency)}`;
                            }
                            if (context.dataset.label.startsWith('매수')) {
                                return `${context.dataset.label}: ${formatAmount(context.parsed.y, currentCurrency)}`;
                            }
                            if (context.dataset.label === '현재가') {
                                return `Current Point: ${formatAmount(context.parsed.y, currentCurrency)}`;
                            }
                            return `주가: ${formatAmount(context.parsed.y, currentCurrency)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '최근 3개월 가격 추이'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: `가격 (${currentCurrency === 'KRW' ? '₩' : '$'})`
                    },
                    beginAtZero: false,
                    ticks: {
                        callback: (value) => currentCurrency === 'KRW' ? `₩${value}` : `$${value}`
                    }
                }
            }
        }
    });
};

const renderBuyEntry = (entry = {}) => {
    buyEntryId += 1;
    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end';
    row.dataset.buyEntry = 'true';
    row.innerHTML = `
        <div><label class="block text-xs font-semibold text-red-800 mb-1">매수일</label>
            <input type="date" class="buy-date w-full px-3 py-2 border border-gray-300 rounded-md" value="${entry.date || ''}"></div>
        <div><label class="block text-xs font-semibold text-red-800 mb-1">매수가 ($)</label>
            <input type="number" class="buy-price w-full px-3 py-2 border border-gray-300 rounded-md" min="0.01" step="0.01" placeholder="150.00" value="${entry.price || ''}"></div>
        <div><label class="block text-xs font-semibold text-red-800 mb-1">수량</label>
            <input type="number" class="buy-qty w-full px-3 py-2 border border-gray-300 rounded-md" min="1" step="1" placeholder="10" value="${entry.quantity || ''}"></div>
        <button type="button" class="remove-buy-entry h-10 px-3 rounded border border-red-200 text-red-600 hover:bg-red-100" aria-label="매수 내역 삭제">삭제</button>
    `;
    row.querySelector('.remove-buy-entry').addEventListener('click', () => {
        row.remove();
    });
    document.getElementById('buyEntries').appendChild(row);
};

const getBuyEntries = () => [...document.querySelectorAll('[data-buy-entry]')].map((row) => ({
    date: row.querySelector('.buy-date').value,
    price: Number(row.querySelector('.buy-price').value),
    quantity: Number(row.querySelector('.buy-qty').value)
})).filter((entry) => entry.date || Number.isFinite(entry.price) || Number.isFinite(entry.quantity));

const loadBuyPresets = async () => {
    try {
        const response = await fetch('/api/buy-presets');
        if (!response.ok) throw new Error('매수 프리셋 조회 실패');
        buyPresets = await response.json();
        const select = document.getElementById('buyPresetSelect');
        select.innerHTML = '<option value="">저장된 매수 프리셋 선택</option>';
        buyPresets.forEach((preset) => {
            const option = document.createElement('option');
            option.value = String(preset.id);
            option.textContent = `${preset.preset_name} (${preset.ticker})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('매수 프리셋 조회 에러:', error);
    }
};

const saveBuyPreset = async () => {
    const presetName = document.getElementById('buyPresetName').value.trim();
    const ticker = getValue('ticker').toUpperCase();
    const buyEntries = getBuyEntries();
    if (!presetName) {
        alert('프리셋 이름을 입력하세요.');
        return;
    }
    if (!ticker || buyEntries.length === 0 || buyEntries.some((entry) => (
        !entry.date || !Number.isFinite(entry.price) || entry.price <= 0
        || !Number.isFinite(entry.quantity) || entry.quantity <= 0
    ))) {
        alert('티커와 올바른 매수 내역을 입력하세요.');
        return;
    }
    try {
        const response = await fetch('/api/buy-presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ presetName, ticker, buyEntries })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || '매수 프리셋 저장 실패');
        alert('매수 프리셋이 저장되었습니다.');
        document.getElementById('buyPresetName').value = '';
        await loadBuyPresets();
    } catch (error) {
        console.error('매수 프리셋 저장 에러:', error);
        alert(error.message);
    }
};

const loadSelectedBuyPreset = () => {
    const selectedId = document.getElementById('buyPresetSelect').value;
    const preset = buyPresets.find((item) => String(item.id) === selectedId);
    if (!preset) {
        alert('불러올 매수 프리셋을 선택하세요.');
        return;
    }
    document.getElementById('ticker').value = preset.ticker;
    document.getElementById('buyEntries').innerHTML = '';
    (preset.buy_entries || []).forEach((entry) => renderBuyEntry(entry));
    calculateTracker();
};

const deleteSelectedBuyPreset = async () => {
    const select = document.getElementById('buyPresetSelect');
    if (!select.value) {
        alert('삭제할 매수 프리셋을 선택하세요.');
        return;
    }
    if (!confirm('선택한 매수 프리셋을 삭제할까요?')) return;
    try {
        const response = await fetch(`/api/buy-presets/${select.value}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || '매수 프리셋 삭제 실패');
        await loadBuyPresets();
    } catch (error) {
        console.error('매수 프리셋 삭제 에러:', error);
        alert(error.message);
    }
};

const renderSellEntry = (entry = {}) => {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end';
    row.dataset.sellEntry = 'true';
    row.innerHTML = `
        <div><label class="block text-xs font-semibold text-blue-800 mb-1">매도일</label>
            <input type="date" class="sell-date w-full px-3 py-2 border border-gray-300 rounded-md" value="${entry.date || ''}"></div>
        <div><label class="block text-xs font-semibold text-blue-800 mb-1">매도가 ($)</label>
            <input type="number" class="sell-price w-full px-3 py-2 border border-gray-300 rounded-md" min="0.01" step="0.01" placeholder="180.00" value="${entry.price || ''}"></div>
        <div><label class="block text-xs font-semibold text-blue-800 mb-1">수량</label>
            <input type="number" class="sell-qty w-full px-3 py-2 border border-gray-300 rounded-md" min="1" step="1" placeholder="10" value="${entry.quantity || ''}"></div>
        <button type="button" class="remove-sell-entry h-10 px-3 rounded border border-blue-200 text-blue-600 hover:bg-blue-100" aria-label="매도 내역 삭제">삭제</button>
    `;
    row.querySelector('.remove-sell-entry').addEventListener('click', () => row.remove());
    document.getElementById('sellEntries').appendChild(row);
};

const getSellEntries = () => [...document.querySelectorAll('[data-sell-entry]')].map((row) => ({
    date: row.querySelector('.sell-date').value,
    price: Number(row.querySelector('.sell-price').value),
    quantity: Number(row.querySelector('.sell-qty').value)
})).filter((entry) => entry.date || Number.isFinite(entry.price) || Number.isFinite(entry.quantity));

const registerParsedTrades = (trades) => {
    const ticker = trades[0] && trades[0].ticker;
    if (ticker) document.getElementById('ticker').value = ticker;
    trades.forEach((trade) => {
        const entry = {
            date: trade.tradeDate,
            price: trade.price,
            quantity: trade.quantity
        };
        if (trade.tradeType === 'BUY') {
            renderBuyEntry(entry);
        } else {
            renderSellEntry(entry);
        }
    });
};

const analyzeTradeScreenshot = async () => {
    const input = document.getElementById('screenshotInput');
    const status = document.getElementById('screenshotStatus');
    const file = input.files && input.files[0];
    if (!file) {
        status.textContent = '먼저 거래 스크린샷을 선택하세요.';
        status.className = 'mt-2 text-xs text-red-600';
        return;
    }

    const formData = new FormData();
    formData.append('screenshot', file);
    status.textContent = 'AI가 거래 내역을 분석하고 DB에 등록하는 중...';
    status.className = 'mt-2 text-xs text-indigo-700 animate-pulse';
    try {
        const response = await fetch('/api/parse-trade-screenshot', {
            method: 'POST',
            body: formData
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '이미지 분석 실패');
        registerParsedTrades(payload.trades);
        status.textContent = `${payload.trades.length}건의 거래를 분석해 자동 등록했습니다. 차트를 갱신하는 중...`;
        status.className = 'mt-2 text-xs text-green-600';
        await calculateTracker();
    } catch (error) {
        console.error('거래 스크린샷 분석 실패:', error);
        status.textContent = `분석 실패: ${error.message}`;
        status.className = 'mt-2 text-xs text-red-600';
    }
};

const saveSellHistory = async () => {
    const ticker = getValue('ticker').toUpperCase();
    const sellEntries = getSellEntries();

    if (!ticker || !sellEntries.length || sellEntries.some((entry) => !entry.date || !Number.isFinite(entry.price) || entry.price <= 0 || !Number.isFinite(entry.quantity) || entry.quantity <= 0)) {
        alert('티커와 매도 내역을 올바르게 입력하세요.');
        return;
    }

    try {
        for (const entry of sellEntries) {
            const response = await fetch('/api/sell-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    sellPrice: entry.price,
                    sellQty: entry.quantity,
                    sellDate: entry.date
                })
            });
            if (!response.ok) throw new Error('매도 내역 저장 실패');
        }
        alert('매도 내역 저장 성공!');
    } catch (error) {
        console.error(error);
    }
};

const loadSellHistory = async () => {
    const ticker = getValue('ticker').toUpperCase();

    try {
        const response = await fetch(`/api/sell-history/${ticker}`);
        const data = await response.json();

        if (data.length > 0) {
            document.getElementById('sellEntries').innerHTML = '';
            data.forEach((entry) => renderSellEntry({
                date: new Date(entry.sell_date).toISOString().slice(0, 10),
                price: entry.sell_price,
                quantity: entry.sell_quantity
            }));
            sellHistoryDate = data[0].sell_date;
        } else {
            alert('기록이 없습니다.');
        }
    } catch (error) {
        console.error(error);
    }
};

const calculateTracker = async () => {
    const ticker = getValue('ticker').toUpperCase();
    const buyEntries = getBuyEntries();
    const sellEntries = getSellEntries();
    const resultContent = document.getElementById('resultContent');

    document.getElementById('result').classList.remove('hidden');
    resultContent.innerHTML = '<p class="text-gray-500 animate-pulse">실시간 주가 불러오는 중...</p>';

    try {
        try {
            usdKrwRate = await getUsdKrwRate();
        } catch (error) {
            usdKrwRate = null;
            console.error('트래커 환율 조회 실패, USD 금액으로 계속 표시합니다.', error);
        }

        if (
            !ticker ||
            buyEntries.length === 0 && sellEntries.length === 0 ||
            sellEntries.some((entry) => !entry.date || Number.isNaN(new Date(entry.date).getTime())
                || !Number.isFinite(entry.price) || entry.price <= 0
                || !Number.isFinite(entry.quantity) || entry.quantity <= 0) ||
            buyEntries.some((entry) => !entry.date || Number.isNaN(new Date(entry.date).getTime())
                || !Number.isFinite(entry.price) || entry.price <= 0
                || !Number.isFinite(entry.quantity) || entry.quantity <= 0)
        ) {
            throw new Error('티커, 매도일·매도가·수량과 매수 내역을 올바르게 입력하세요.');
        }

        const response = await fetch(`/api/price/${ticker}`);
        if (!response.ok) {
            throw new Error('주가 통신 실패');
        }

        const data = await response.json();
        const currentPrice = Number(data.currentPrice);
        if (!Number.isFinite(currentPrice)) {
            throw new Error('현재가 데이터가 올바르지 않습니다.');
        }

        const currency = data.currency === 'KRW' ? 'KRW' : 'USD';
        const currencyLabel = (amount) => formatAmount(amount, currency);

        resultContent.innerHTML = `
            <div class="mb-3 pb-3 border-b border-gray-200">
                <span class="inline-block px-2 py-1 bg-gray-200 text-sm rounded font-bold mr-2">${data.ticker}</span>
                현재가: <span class="text-xl font-bold">${currencyLabel(currentPrice)}</span>
            </div>
            <div class="space-y-2">
                <p>🔴 매수 내역: <strong>${buyEntries.length}건</strong></p>
                <p>🔵 매도 내역: <strong>${sellEntries.length}건</strong></p>
                <p class="text-sm text-gray-500">실제 거래 시점과 가격을 차트에 표시했습니다.</p>
            </div>
        `;

        const allEntries = [...buyEntries, ...sellEntries];
        const earliestDate = new Date(Math.min(...allEntries.map((entry) => new Date(entry.date).getTime()))).toISOString();
        const query = new URLSearchParams({ buyDate: earliestDate });
        const historyResponse = await fetch(`/api/price/history/${encodeURIComponent(data.ticker)}?${query}`);
        const historyData = historyResponse.ok ? await historyResponse.json() : { quotes: [] };
        renderPriceComparisonChart({
            history: Array.isArray(historyData.quotes) ? historyData.quotes : [],
            currentPrice,
            sellEntries,
            buyEntries,
            currency
        });
    } catch (error) {
        resultContent.innerHTML = `<p class="text-red-500">에러 발생: ${error.message}</p>`;
    }
};

const runOpportunitySimulation = async () => {
    const ticker = getValue('opportunityTicker').toUpperCase();
    const targetPrice = Number(getValue('opportunitySellPrice'));
    const sellQty = Number(getValue('opportunitySellQty'));
    const result = document.getElementById('opportunityResult');
    result.classList.remove('hidden');
    result.innerHTML = '<p class="text-gray-500 animate-pulse">현재가 불러오는 중...</p>';

    try {
        usdKrwRate = await getUsdKrwRate().catch((error) => {
            console.error('매도 기회비용 환율 조회 실패', error);
            return null;
        });
        if (!ticker || !Number.isFinite(targetPrice) || targetPrice <= 0 || !Number.isFinite(sellQty) || sellQty <= 0) {
            throw new Error('티커, 가정 매도가, 매도 수량을 올바르게 입력하세요.');
        }

        const response = await fetch(`/api/price/${encodeURIComponent(ticker)}`);
        if (!response.ok) throw new Error('주가 통신 실패');
        const data = await response.json();
        const currentPrice = Number(data.currentPrice);
        if (!Number.isFinite(currentPrice)) throw new Error('현재가 데이터가 올바르지 않습니다.');

        const currency = data.currency === 'KRW' ? 'KRW' : 'USD';
        const priceDiff = currentPrice - targetPrice;
        const percentDiff = (priceDiff / targetPrice) * 100;
        const totalImpact = priceDiff * sellQty;
        const isMissedGain = totalImpact > 0;
        const amount = formatAmountPair(Math.abs(totalImpact), currency);
        result.innerHTML = `
            <div class="rounded-lg border p-4 ${isMissedGain ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}">
                <p class="font-bold">${data.ticker} 현재가: ${formatAmount(currentPrice, currency)}</p>
                <p class="mt-2">가정 매도가: ${formatAmount(targetPrice, currency)} · ${sellQty}주</p>
                <p class="mt-2 font-bold ${isMissedGain ? 'text-red-600' : 'text-green-600'}">
                    ${isMissedGain
                        ? `매도가 대비 : +${percentDiff.toFixed(2)}% 높음 (🚨 비싸짐)<br>발생한 기회비용: -${amount}`
                        : percentDiff < 0
                            ? `매도가 대비 : ${percentDiff.toFixed(2)}% 낮음 (✨ 싸게 매수 가능)<br>추가 확보 가능 금액: +${amount}`
                            : `매도가와 현재가가 같습니다.<br>기회비용: ${amount}`}
                </p>
            </div>`;
    } catch (error) {
        result.innerHTML = `<p class="text-red-500">에러 발생: ${error.message}</p>`;
    }
};

const loadOpportunityHistory = async () => {
    const ticker = getValue('opportunityTicker').toUpperCase();
    if (!ticker) {
        alert('종목 티커를 입력하세요.');
        return;
    }

    try {
        const response = await fetch(`/api/sell-history/${encodeURIComponent(ticker)}`);
        if (!response.ok) throw new Error('매도 기록 조회 실패');
        const data = await response.json();
        const latest = data[0];
        if (!latest) {
            alert('저장된 매도 기록이 없습니다.');
            return;
        }

        document.getElementById('opportunityTicker').value = latest.ticker || ticker;
        document.getElementById('opportunitySellPrice').value = latest.sell_price;
        if (Number(latest.sell_quantity) > 0) {
            document.getElementById('opportunitySellQty').value = latest.sell_quantity;
        }
        document.getElementById('opportunityResult').classList.add('hidden');
    } catch (error) {
        console.error('매도 기회비용 기록 조회 실패:', error);
        alert(error.message);
    }
};

const runBuySimulation = async () => {
    const ticker = getValue('simulationTicker').toUpperCase();
    const targetBuyPrice = Number(getValue('targetBuyPrice'));
    const buyQty = Number(getValue('buyQty'));
    const result = document.getElementById('simulationResult');
    result.classList.remove('hidden');
    result.innerHTML = '<p class="text-gray-500 animate-pulse">실시간 주가 불러오는 중...</p>';
    try {
        usdKrwRate = await getUsdKrwRate().catch((error) => {
            console.error('매수 시뮬레이션 환율 조회 실패', error);
            return null;
        });
        if (!ticker || !Number.isFinite(targetBuyPrice) || targetBuyPrice <= 0 || !Number.isFinite(buyQty) || buyQty <= 0) {
            throw new Error('티커, 목표 매수가, 매수 수량을 올바르게 입력하세요.');
        }
        const response = await fetch(`/api/price/${encodeURIComponent(ticker)}`);
        if (!response.ok) throw new Error('주가 통신 실패');
        const data = await response.json();
        const currentPrice = Number(data.currentPrice);
        const currency = data.currency === 'KRW' ? 'KRW' : 'USD';
        const profit = (currentPrice - targetBuyPrice) * buyQty;
        const rate = ((currentPrice - targetBuyPrice) / targetBuyPrice) * 100;
        const positive = profit >= 0;
        result.innerHTML = `<div class="${positive ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'} border rounded-lg p-4">
            <p class="font-bold">${data.ticker} 현재가: ${formatAmount(currentPrice, currency)}</p>
            <p class="mt-2">가정 매수가: ${formatAmount(targetBuyPrice, currency)} · 매수 수량: ${buyQty}주</p>
            <p class="mt-2 font-bold">${positive ? '✨' : '📉'} ${rate >= 0 ? '+' : ''}${rate.toFixed(2)}% ${positive ? '수익' : '손실'} 중 (${formatAmountPair(profit, currency, true)})</p>
        </div>`;
    } catch (error) {
        result.innerHTML = `<p class="text-red-500">에러 발생: ${error.message}</p>`;
    }
};

document.getElementById('saveBtn').addEventListener('click', saveSellHistory);
document.getElementById('loadBtn').addEventListener('click', loadSellHistory);
document.getElementById('calcBtn').addEventListener('click', calculateTracker);
document.getElementById('simulationBtn').addEventListener('click', runBuySimulation);
document.getElementById('opportunityBtn').addEventListener('click', runOpportunitySimulation);
document.getElementById('loadOpportunityHistoryBtn').addEventListener('click', loadOpportunityHistory);
document.getElementById('analyzeScreenshotBtn').addEventListener('click', analyzeTradeScreenshot);
document.getElementById('addBuyEntryBtn').addEventListener('click', () => renderBuyEntry());
document.getElementById('addSellEntryBtn').addEventListener('click', () => renderSellEntry());
document.getElementById('saveBuyPresetBtn').addEventListener('click', saveBuyPreset);
document.getElementById('loadBuyPresetBtn').addEventListener('click', loadSelectedBuyPreset);
document.getElementById('deleteBuyPresetBtn').addEventListener('click', deleteSelectedBuyPreset);
document.getElementById('zoomInBtn').addEventListener('click', () => priceComparisonChart?.zoom(1.4));
document.getElementById('zoomOutBtn').addEventListener('click', () => priceComparisonChart?.zoom(0.7));
document.getElementById('resetZoomBtn').addEventListener('click', () => priceComparisonChart?.resetZoom());
renderBuyEntry();
renderSellEntry();
loadBuyPresets();
