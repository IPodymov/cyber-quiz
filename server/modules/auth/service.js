const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {HttpError} = require('../../errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Хэш-заглушка для сравнения, когда пользователь не найден
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function createAuthService({repos, config}) {
    function publicUser(user) {
        return {id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt};
    }

    function issueToken(user) {
        return jwt.sign(
            {sub: user.id, email: user.email, name: user.name, role: user.role},
            config.auth.jwtSecret,
            {expiresIn: config.auth.tokenTtlSeconds},
        );
    }

    function validateRegistration({name, email, password}) {
        const errors = {};
        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
            errors.name = 'Имя: от 2 до 50 символов';
        }
        if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254) {
            errors.email = 'Введите корректный e-mail';
        }
        if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
            errors.password = 'Пароль: от 8 до 128 символов';
        }
        if (Object.keys(errors).length) throw new HttpError(400, 'Проверьте поля формы', errors);
    }

    async function register(input) {
        validateRegistration(input);
        const email = input.email.trim().toLowerCase();
        const passwordHash = await bcrypt.hash(input.password, 12);
        try {
            const user = await repos.users.create({email, name: input.name.trim(), passwordHash});
            return {user: publicUser(user), token: issueToken(user)};
        } catch (err) {
            if (err.code === 'DUPLICATE') throw new HttpError(409, 'Этот e-mail уже зарегистрирован', {email: 'Уже используется'});
            throw err;
        }
    }

    async function login({email, password}) {
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new HttpError(400, 'Введите e-mail и пароль');
        }
        const user = await repos.users.findByEmail(email.trim().toLowerCase());
        // Сравниваем даже при отсутствии пользователя, чтобы время ответа не выдавало существование e-mail
        const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
        if (!user || !ok) throw new HttpError(401, 'Неверный e-mail или пароль');
        return {user: publicUser(user), token: issueToken(user)};
    }

    async function me(userId) {
        const user = await repos.users.findById(userId);
        return user ? publicUser(user) : null;
    }

    return {register, login, me};
}

module.exports = {createAuthService};
