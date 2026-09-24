const mariadb = require('mariadb');

// Aiven의 DATABASE_URL은 'mysql://'로 시작하므로 mariadb 드라이버가 읽을 수 있게 'mariadb://'로 교체
let dbConfig = process.env.DATABASE_URL;
if (dbConfig && dbConfig.startsWith('mysql://')) {
    dbConfig = dbConfig.replace('mysql://', 'mariadb://');
}

const pool = mariadb.createPool(dbConfig || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'qwer',
    database: process.env.DB_NAME || 'stock_tracker',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5
});

module.exports = pool;