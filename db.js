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

const tableDefinitions = [
    {
        name: 'portfolio',
        sql: `
            CREATE TABLE IF NOT EXISTS portfolio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticker VARCHAR(32) NOT NULL UNIQUE,
                avg_price DECIMAL(20, 6) NOT NULL,
                quantity DECIMAL(20, 6) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'sell_history',
        sql: `
            CREATE TABLE IF NOT EXISTS sell_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticker VARCHAR(32) NOT NULL,
                sell_price DECIMAL(20, 6) NOT NULL,
                sell_quantity DECIMAL(20, 4) NOT NULL DEFAULT 0,
                sell_date DATETIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sell_history_ticker_date (ticker, sell_date)
            )
        `
    },
    {
        name: 'bank_accounts',
        sql: `
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_name VARCHAR(100) NOT NULL UNIQUE,
                account_type ENUM('CMA', 'GENERAL', 'SAVINGS', 'SECURITIES') NOT NULL DEFAULT 'GENERAL',
                balance DECIMAL(20, 4) NOT NULL DEFAULT 0,
                original_balance DECIMAL(20, 4) NOT NULL DEFAULT 0,
                currency VARCHAR(3) NOT NULL DEFAULT 'KRW',
                interest_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
                compounding_type ENUM('ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'trade_history',
        sql: `
            CREATE TABLE IF NOT EXISTS trade_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticker VARCHAR(32) NOT NULL,
                trade_type VARCHAR(4) NOT NULL,
                trade_date DATE NOT NULL,
                price DECIMAL(20, 6) NOT NULL,
                quantity DECIMAL(20, 6) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_trade_history_ticker_date (ticker, trade_date)
            )
        `
    },
    {
        name: 'buy_presets',
        sql: `
            CREATE TABLE IF NOT EXISTS buy_presets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                preset_name VARCHAR(100) NOT NULL UNIQUE,
                ticker VARCHAR(32) NOT NULL,
                buy_entries TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `
    },
    {
        name: 'compound_presets',
        sql: `
            CREATE TABLE IF NOT EXISTS compound_presets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                preset_name VARCHAR(100) NOT NULL UNIQUE,
                account_id INT NULL,
                interest_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
                compounding_type ENUM('ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY',
                years INT NOT NULL DEFAULT 10,
                payments TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `
    }
];

const initDatabase = async () => {
    let conn;

    try {
        conn = await pool.getConnection();
        for (const table of tableDefinitions) {
            await conn.query(table.sql);
            console.log(`데이터베이스 테이블 확인 완료: ${table.name}`);
        }
    } catch (error) {
        console.error('데이터베이스 초기화 실패:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
};

module.exports = pool;
module.exports.initDatabase = initDatabase;