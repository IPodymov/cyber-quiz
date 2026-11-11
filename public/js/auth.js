import {initLayout, api} from './app.js';

const config = await initLayout();
if (config.user) location.replace('/profile.html');

const form = document.querySelector('[data-auth-form]');
const mode = form.dataset.authForm;
const formError = form.querySelector('[data-form-error]');
const submit = form.querySelector('[type=submit]');

function showErrors(message, details = {}) {
    formError.textContent = message;
    formError.hidden = !message;
    for (const input of form.querySelectorAll('input')) {
        const msg = details[input.name] || '';
        input.setAttribute('aria-invalid', String(Boolean(msg)));
        form.querySelector(`[data-error-for="${input.name}"]`).textContent = msg;
    }
    form.querySelector('[aria-invalid="true"]')?.focus();
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    submit.disabled = true;
    showErrors('');
    try {
        await api(`/auth/${mode}`, {method: 'POST', body});
        const next = new URLSearchParams(location.search).get('next');
        location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/quiz.html';
    } catch (err) {
        showErrors(err.message, err.details);
    } finally {
        submit.disabled = false;
    }
});
