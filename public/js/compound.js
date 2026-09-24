let accounts = [];
let chart;
let presets = [];

const formatKrw = (value) => `₩${Math.round(value).toLocaleString('ko-KR')}`;

const getAccountBalanceKrw = (account) => Number(account.balance) || 0;

const renderCompoundChart = (account, rate, type, yearsToCalculate = 10, payments = []) => {
    const principal = getAccountBalanceKrw(account);
    const annualRate = Math.max(0, Number(rate) || 0) / 100;
    const yearsCount = Math.min(100, Math.max(1, Math.floor(Number(yearsToCalculate) || 10)));
    const totalMonths = yearsCount * 12;
    const paymentMap = new Map();
    payments.forEach(({ month, amount }) => {
        paymentMap.set(month, (paymentMap.get(month) || 0) + amount);
    });
    const monthlyFactor = type === 'ANNUAL'
        ? Math.pow(1 + annualRate, 1 / 12)
        : 1 + annualRate / 12;
    const labels = [];
    const values = [];

    let value = principal;
    for (let month = 0; month <= totalMonths; month += 1) {
        labels.push(month === 0 ? '현재' : `${month}개월`);
        values.push(value);
        if (month < totalMonths) {
            const nextMonth = month + 1;
            if (paymentMap.has(nextMonth)) {
                value += paymentMap.get(nextMonth);
            }
            value *= monthlyFactor;
        }
    }

    const finalValue = values[values.length - 1];
    document.getElementById('compoundSummary').textContent =
        `${account.account_name} · 원금 ${formatKrw(principal)} · ${type === 'MONTHLY' ? '월복리' : '연복리'} ${Number(rate || 0).toFixed(2)}% · ${payments.length ? `추가납입 ${payments.length}회 · ` : ''}${yearsCount}년 후 ${formatKrw(finalValue)} (이자 ${formatKrw(finalValue - principal - payments.reduce((sum, payment) => sum + payment.amount, 0))})`;

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('compoundChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '예상 자산 (원)',
                data: values,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                fill: true,
                tension: 0.25,
                pointRadius: values.map((_, index) => paymentMap.has(index) ? 5 : 0),
                pointBackgroundColor: values.map((_, index) => paymentMap.has(index) ? '#db2777' : '#4f46e5'),
                pointBorderColor: values.map((_, index) => paymentMap.has(index) ? '#9d174d' : '#4f46e5'),
                pointHitRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { title: { display: true, text: '기간' }, ticks: { maxTicksLimit: 13 } },
                y: { title: { display: true, text: '자산 (₩)' }, ticks: { callback: (value) => formatKrw(value) } }
            },
            plugins: {
                tooltip: { callbacks: { label: (context) => `예상 자산: ${formatKrw(context.parsed.y)}` } }
            }
        }
    });
};

const populateAccounts = () => {
    const select = document.getElementById('compoundAccount');
    select.innerHTML = '<option value="">계좌를 선택하세요</option>';
    accounts.forEach((account) => {
        const option = document.createElement('option');
        option.value = String(account.id);
        option.textContent = `${account.account_name} (${formatKrw(getAccountBalanceKrw(account))})`;
        select.appendChild(option);
    });
};

const selectAccount = (accountId) => {
    const account = accounts.find((item) => String(item.id) === String(accountId));
    if (!account) return;
    document.getElementById('compoundAccount').value = String(account.id);
    document.getElementById('compoundRate').value = Number(account.interest_rate || 0);
    document.getElementById('compoundType').value = account.compounding_type || 'MONTHLY';
    window.switchTab('compound');
    renderCompoundChart(account, account.interest_rate, account.compounding_type || 'MONTHLY', document.getElementById('compoundYears').value, getPayments());
};

window.addEventListener('cash-assets-updated', (event) => {
    accounts = event.detail.accounts || [];
    populateAccounts();
});

document.addEventListener('click', (event) => {
    const button = event.target.closest('.account-compound-link');
    if (button) selectAccount(button.dataset.accountId);
});

document.getElementById('compoundAccount').addEventListener('change', (event) => {
    selectAccount(event.target.value);
});

const getPayments = () => Array.from(document.querySelectorAll('.compound-payment-row')).map((row) => ({
    month: Number(row.querySelector('.compound-payment-month').value),
    amount: Number(row.querySelector('.compound-payment-amount').value) * 10000
})).filter((payment) => payment.amount > 0);

const addPaymentRow = (month = 0, amount = 0) => {
    const row = document.createElement('div');
    row.className = 'compound-payment-row grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end';
    row.innerHTML = `
        <div><label class="block text-xs font-semibold text-gray-700 mb-1">납입 시점 (개월 후)</label>
            <input type="number" min="0" step="1" value="${month}" class="compound-payment-month w-full h-10 px-3 py-2 border border-gray-300 rounded-md">
        </div>
        <div><label class="block text-xs font-semibold text-gray-700 mb-1">납입 금액 (만원)</label>
            <input type="number" min="0" step="1" value="${amount / 10000}" class="compound-payment-amount w-full h-10 px-3 py-2 border border-gray-300 rounded-md">
        </div>
        <button type="button" class="remove-compound-payment h-10 px-3 rounded-md border border-red-200 text-red-600 hover:bg-red-50">삭제</button>
    `;
    document.getElementById('compoundPayments').appendChild(row);
};

const loadPresets = async () => {
    try {
        const response = await fetch('/api/compound-presets');
        if (!response.ok) throw new Error('복리 프리셋 조회 실패');
        presets = await response.json();
        const select = document.getElementById('compoundPresetSelect');
        select.innerHTML = '<option value="">저장된 프리셋 선택</option>';
        presets.forEach((preset) => {
            const option = document.createElement('option');
            option.value = String(preset.id);
            option.textContent = preset.preset_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
};

const setPayments = (payments) => {
    const container = document.getElementById('compoundPayments');
    container.innerHTML = '';
    (payments.length ? payments : [{ month: 0, amount: 0 }]).forEach((payment) => addPaymentRow(payment.month, payment.amount));
};

document.getElementById('addCompoundPaymentBtn').addEventListener('click', () => addPaymentRow());
document.getElementById('compoundPayments').addEventListener('click', (event) => {
    if (event.target.closest('.remove-compound-payment')) {
        event.target.closest('.compound-payment-row').remove();
    }
});

document.getElementById('compoundCalculateBtn').addEventListener('click', () => {
    const account = accounts.find((item) => String(item.id) === document.getElementById('compoundAccount').value);
    if (!account) {
        alert('계좌를 선택하세요.');
        return;
    }
    const yearsInput = document.getElementById('compoundYears');
    const years = Number(yearsInput.value);
    if (!Number.isInteger(years) || years < 1 || years > 100) {
        alert('계산 기간은 1년에서 100년 사이의 정수로 입력하세요.');
        yearsInput.focus();
        return;
    }
    const payments = getPayments();
    const invalidPayment = payments.find((payment) => !Number.isInteger(payment.month) || payment.month < 1 || payment.month > years * 12 || payment.amount < 0);
    if (invalidPayment) {
        alert(`추가납입 시점은 1~${years * 12}개월, 금액은 0원 이상으로 입력하세요.`);
        return;
    }
    renderCompoundChart(account, document.getElementById('compoundRate').value, document.getElementById('compoundType').value, years, payments);
});

document.getElementById('saveCompoundPresetBtn').addEventListener('click', async () => {
    const presetName = document.getElementById('compoundPresetName').value.trim();
    const accountId = document.getElementById('compoundAccount').value;
    const years = Number(document.getElementById('compoundYears').value);
    const payments = getPayments();
    if (!presetName) {
        alert('프리셋 이름을 입력하세요.');
        return;
    }
    if (!accountId) {
        alert('계좌를 선택하세요.');
        return;
    }
    try {
        const response = await fetch('/api/compound-presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                presetName,
                accountId,
                interestRate: document.getElementById('compoundRate').value,
                compoundingType: document.getElementById('compoundType').value,
                years,
                payments
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || '프리셋 저장 실패');
        alert('복리 프리셋이 저장되었습니다.');
        document.getElementById('compoundPresetName').value = '';
        await loadPresets();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

document.getElementById('loadCompoundPresetBtn').addEventListener('click', () => {
    const preset = presets.find((item) => String(item.id) === document.getElementById('compoundPresetSelect').value);
    if (!preset) {
        alert('불러올 프리셋을 선택하세요.');
        return;
    }
    if (preset.account_id) {
        selectAccount(preset.account_id);
    }
    document.getElementById('compoundRate').value = preset.interest_rate;
    document.getElementById('compoundType').value = preset.compounding_type;
    document.getElementById('compoundYears').value = preset.years;
    document.getElementById('compoundCalculateBtn').textContent = `${preset.years}년 계산`;
    setPayments(preset.payments || []);
});

document.getElementById('deleteCompoundPresetBtn').addEventListener('click', async () => {
    const select = document.getElementById('compoundPresetSelect');
    if (!select.value) {
        alert('삭제할 프리셋을 선택하세요.');
        return;
    }
    if (!confirm('선택한 복리 프리셋을 삭제할까요?')) return;
    const response = await fetch(`/api/compound-presets/${select.value}`, { method: 'DELETE' });
    if (!response.ok) {
        alert('프리셋 삭제에 실패했습니다.');
        return;
    }
    await loadPresets();
});
document.getElementById('compoundYears').addEventListener('input', (event) => {
    const years = Number(event.target.value);
    document.getElementById('compoundCalculateBtn').textContent =
        Number.isInteger(years) && years >= 1 && years <= 100 ? `${years}년 계산` : '계산하기';
});

addPaymentRow();
loadPresets();
