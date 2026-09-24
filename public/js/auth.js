const form = document.querySelector('form');
const message = document.getElementById('message');
const isRegister = form.id === 'registerForm';

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const response = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        message.textContent = data.error || '요청에 실패했습니다.';
        return;
    }
    if (isRegister) {
        window.location.href = '/login.html';
        return;
    }
    window.location.href = '/';
});
