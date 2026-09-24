import { formatKrw, getUsdKrwRate } from './currency.js';

const tickerList = document.getElementById('watchlist');
const refreshButton = document.getElementById('refreshWatchlist');
const watchlistForm = document.getElementById('watchlistForm');
const tickerInput = document.getElementById('watchlistTicker');
const message = document.getElementById('watchlistMessage');
const updatedAt = document.getElementById('watchlistUpdatedAt');
const WATCHLIST_KEY = 'stock-tracker-watchlist';
const defaultWatchlist = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'];
let watchlist = loadWatchlist();
let usdKrwRate = null;

function loadWatchlist() {
    try {
        const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
        return Array.isArray(saved) && saved.length > 0 ? saved : defaultWatchlist;
    } catch (error) {
        console.error('관심종목 저장값을 불러오지 못했습니다.', error);
        return defaultWatchlist;
    }
}

const saveWatchlist = () => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
};

const getSafeChangePercent = (item) => {
    const value = Number(item.changePercent);
    return Number.isFinite(value) ? value : 0;
};

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderNasdaqTop10 = (tickers) => {
    tickerList.innerHTML = tickers.map((item) => `
        <li class="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
            <div class="min-w-0">
                <p class="font-bold text-gray-800">
                    ${escapeHtml(item.ticker)}
                    <button type="button" data-remove-ticker="${escapeHtml(item.ticker)}"
                        class="ml-1 text-xs text-gray-400 hover:text-red-500" aria-label="${escapeHtml(item.ticker)} 삭제">×</button>
                </p>
                <p class="truncate text-xs text-gray-500">${escapeHtml(item.name)}</p>
            </div>
            <div class="shrink-0 text-right">
                <p class="font-semibold text-gray-900">$${Number(item.currentPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</p>
                <p class="text-[10px] text-gray-500">${formatKrw(item.currentPrice, usdKrwRate)}</p>
                <p class="text-xs font-bold ${
                    getSafeChangePercent(item) > 0
                        ? 'text-red-600'
                        : getSafeChangePercent(item) < 0
                            ? 'text-blue-600'
                            : 'text-gray-500'
                }">
                    ${
                        getSafeChangePercent(item) > 0
                            ? '▲'
                            : getSafeChangePercent(item) < 0
                                ? '▼'
                                : '—'
                    }
                    ${
                        getSafeChangePercent(item) > 0 ? '+' : ''
                    }${getSafeChangePercent(item).toFixed(2)}%
                </p>
            </div>
        </li>
    `).join('');
};

const loadNasdaqTop10 = async () => {
    refreshButton.disabled = true;
    refreshButton.textContent = '조회 중...';

    try {
        if (!usdKrwRate) {
            try {
                usdKrwRate = await getUsdKrwRate();
            } catch (error) {
                usdKrwRate = null;
                console.error('관심종목 환율 조회 실패, USD 금액으로 계속 표시합니다.', error);
            }
        }
        if (watchlist.length === 0) {
            tickerList.innerHTML = '<li class="py-4 text-center text-sm text-gray-500">관심종목을 추가하세요.</li>';
            return;
        }

        const response = await fetch(`/api/nasdaq-top10?symbols=${encodeURIComponent(watchlist.join(','))}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload && payload.error
                ? payload.error
                : `나스닥 Top 10 조회 실패 (${response.status})`);
        }

        const tickers = payload;
        if (!Array.isArray(tickers)) {
            throw new Error('나스닥 Top 10 응답 형식이 올바르지 않습니다.');
        }
        if (tickers.length === 0) {
            throw new Error('현재 조회 가능한 나스닥 종목이 없습니다.');
        }

        renderNasdaqTop10(tickers);
        const returnedTickers = new Set(tickers.map((item) => item.ticker));
        const unavailableTickers = watchlist.filter((ticker) => !returnedTickers.has(ticker));
        if (unavailableTickers.length > 0) {
            message.textContent = `조회할 수 없는 티커: ${unavailableTickers.join(', ')}`;
            message.classList.remove('hidden');
        }
        updatedAt.textContent = usdKrwRate
            ? `환율 $1 = ${formatKrw(1, usdKrwRate)} · 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`
            : `환율 조회 실패 · USD 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
    } catch (error) {
        console.error(error);
        tickerList.innerHTML = `
            <li class="py-4 text-center text-sm text-red-500">
                ${error.message}
            </li>
        `;
        updatedAt.textContent = '업데이트 실패';
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = '새로고침';
    }
};

watchlistForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const ticker = tickerInput.value.trim().toUpperCase();
    message.classList.add('hidden');

    if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
        message.textContent = '올바른 티커를 입력하세요.';
        message.classList.remove('hidden');
        return;
    }
    if (watchlist.includes(ticker)) {
        message.textContent = '이미 추가된 관심종목입니다.';
        message.classList.remove('hidden');
        return;
    }

    watchlist.push(ticker);
    saveWatchlist();
    tickerInput.value = '';
    message.classList.add('hidden');
    tickerList.insertAdjacentHTML(
        'beforeend',
        `<li class="py-2 text-center text-xs text-gray-500" data-pending-ticker="${escapeHtml(ticker)}">
            ${escapeHtml(ticker)} 조회 중...
        </li>`
    );
    loadNasdaqTop10();
});

tickerList.addEventListener('click', (event) => {
    const button = event.target instanceof Element
        ? event.target.closest('[data-remove-ticker]')
        : null;
    if (!button) return;

    const tickerToRemove = button.dataset.removeTicker;
    watchlist = watchlist.filter((ticker) => ticker !== tickerToRemove);
    saveWatchlist();
    message.classList.add('hidden');
    loadNasdaqTop10();
});

refreshButton.addEventListener('click', loadNasdaqTop10);
loadNasdaqTop10();
setInterval(loadNasdaqTop10, 60 * 1000);
