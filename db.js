const mariadb = require('mariadb');

// DATABASE_URL(Aiven)이 있으면 그것을 쓰고, 없으면 기존 로컬 개별 변수들을 사용
const pool = mariadb.createPool(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'qwer',
    database: process.env.DB_NAME || 'stock_tracker',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5
});

module.exports = pool;