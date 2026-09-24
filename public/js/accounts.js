const saveAccount = async () => {
    const accountType = document.getElementById('accType').value;
    const accountName = document.getElementById('accName').value;
    const balance = document.getElementById('accBalance').value;
    const currency = document.getElementById('accCurrency').value;
    const interestRate = document.getElementById('accRate').value || 0;

    if (!accountName || !balance) {
        alert('계좌명과 잔고를 입력하세요.');
        return;
    }

    try {
        const response = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accountName,
                accountType,
                balance,
                currency,
                interestRate,
                compoundingType: document.getElementById('accCompounding').value
            })
        });

        if (response.ok) {
            alert('계좌 정보가 저장되었습니다!');
            document.getElementById('loadAccBtn').click();
            return;
        }
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || '계좌 정보 저장에 실패했습니다.');
    } catch (error) {
        console.error(error);
        alert('서버와 통신하지 못했습니다. 잠시 후 다시 시도하세요.');
    }
};

const loadAccounts = async () => {
    const tbody = document.getElementById('accountBody');
    const totalTbody = document.getElementById('totalAccountBody');

    try {
        const response = await fetch('/api/accounts');
        const data = await response.json();

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">저장된 계좌가 없습니다.</td></tr>';
            totalTbody.innerHTML = tbody.innerHTML;
            window.dispatchEvent(new CustomEvent('cash-assets-updated', {
                detail: { totalCash: 0, accounts: [] }
            }));
            return;
        }

        tbody.innerHTML = '';
        let totalCash = 0;

        data.forEach((item) => {
            totalCash += Number(item.balance);
            const typeLabel = item.account_type === 'CMA'
                ? 'CMA'
                : item.account_type === 'SAVINGS' ? '예적금'
                    : item.account_type === 'SECURITIES' ? '증권 예수금' : '일반';
            const currency = item.currency === 'USD' ? 'USD' : 'KRW';
            const storedOriginalBalance = Number(item.original_balance);
            const originalBalance = currency === 'KRW' && storedOriginalBalance === 0
                ? Number(item.balance)
                : storedOriginalBalance;
            const balanceLabel = currency === 'USD'
                ? `$${originalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `₩${originalBalance.toLocaleString('ko-KR')}`;

            tbody.innerHTML += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3"><span class="px-2 py-1 bg-gray-200 rounded text-xs font-semibold text-gray-600">${typeLabel}</span></td>
                    <td class="p-3 font-bold text-teal-700"><button type="button" class="account-compound-link hover:underline" data-account-id="${item.id}" data-account-name="${item.account_name}">${item.account_name}</button></td>
                    <td class="p-3 font-semibold text-gray-800 text-right">${balanceLabel}</td>
                    <td class="p-3 text-right">₩${Number(item.balance).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</td>
                    <td class="p-3 text-right">${item.interest_rate}%</td>
                </tr>
            `;
        });

        tbody.innerHTML += `
            <tr class="bg-teal-50 font-bold text-teal-900 border-t-2 border-teal-200">
                <td colspan="2" class="p-3 text-right">총 현금 자산:</td>
                <td colspan="3" class="p-3 text-right">₩${totalCash.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</td>
            </tr>
        `;
        totalTbody.innerHTML = tbody.innerHTML;
        window.dispatchEvent(new CustomEvent('cash-assets-updated', {
            detail: { totalCash, accounts: data }
        }));
    } catch (error) {
        console.error(error);
    }
};

document.getElementById('saveAccBtn').addEventListener('click', saveAccount);
document.getElementById('loadAccBtn').addEventListener('click', loadAccounts);
document.getElementById('accCurrency').addEventListener('change', (event) => {
    const isUsd = event.target.value === 'USD';
    document.getElementById('accBalanceLabel').textContent = isUsd ? '잔고 (달러)' : '잔고 (원)';
    document.getElementById('accBalance').placeholder = isUsd ? '5000' : '5000000';
});

export const loadInitialAccounts = loadAccounts;
