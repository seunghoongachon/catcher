const mariadb = require('mariadb');

const CONNECTION_TIMEOUT = 10000;

const buildDatabaseUrl = (databaseUrl) => {
    if (!databaseUrl) {
        return null;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(databaseUrl);
    } catch (error) {
        throw new Error('DATABASE_URL이 올바른 MySQL/MariaDB 연결 URL이 아닙니다.', { cause: error });
    }

    if (!['mysql:', 'mariadb:'].includes(parsedUrl.protocol)) {
        throw new Error('DATABASE_URL은 mysql:// 또는 mariadb:// 형식이어야 합니다.');
    }

    parsedUrl.protocol = 'mariadb:';
    parsedUrl.searchParams.set('sslMode', 'REQUIRED');
    parsedUrl.searchParams.set('connectTimeout', String(CONNECTION_TIMEOUT));
    parsedUrl.searchParams.set('allowPublicKeyRetrieval', 'true');
    return parsedUrl.toString();
};

const dbConfig = buildDatabaseUrl(process.env.DATABASE_URL);

const pool = mariadb.createPool(dbConfig || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'qwer',
    database: process.env.DB_NAME || 'stock_tracker',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5,
    connectTimeout: CONNECTION_TIMEOUT,
    allowPublicKeyRetrieval: true
});

const tableDefinitions = [
    {
        name: 'portfolio',
        sql: `
            CREATE TABLE IF NOT EXISTS portfolio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                ticker VARCHAR(32) NOT NULL,
                avg_price DECIMAL(20, 6) NOT NULL,
                quantity DECIMAL(20, 6) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_portfolio_user_ticker (user_id, ticker),
                INDEX idx_portfolio_user_id (user_id),
                CONSTRAINT fk_portfolio_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    },
    {
        name: 'sell_history',
        sql: `
            CREATE TABLE IF NOT EXISTS sell_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                ticker VARCHAR(32) NOT NULL,
                sell_price DECIMAL(20, 6) NOT NULL,
                sell_quantity DECIMAL(20, 4) NOT NULL DEFAULT 0,
                sell_date DATETIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sell_history_ticker_date (ticker, sell_date),
                INDEX idx_sell_history_user_id (user_id),
                CONSTRAINT fk_sell_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    },
    {
        name: 'bank_accounts',
        sql: `
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                account_name VARCHAR(100) NOT NULL,
                account_type ENUM('CMA', 'GENERAL', 'SAVINGS', 'SECURITIES') NOT NULL DEFAULT 'GENERAL',
                balance DECIMAL(20, 4) NOT NULL DEFAULT 0,
                original_balance DECIMAL(20, 4) NOT NULL DEFAULT 0,
                currency VARCHAR(3) NOT NULL DEFAULT 'KRW',
                interest_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
                compounding_type ENUM('ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_bank_accounts_user_name (user_id, account_name),
                INDEX idx_bank_accounts_user_id (user_id),
                CONSTRAINT fk_bank_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    },
    {
        name: 'trade_history',
        sql: `
            CREATE TABLE IF NOT EXISTS trade_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                ticker VARCHAR(32) NOT NULL,
                trade_type VARCHAR(4) NOT NULL,
                trade_date DATE NOT NULL,
                price DECIMAL(20, 6) NOT NULL,
                quantity DECIMAL(20, 6) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_trade_history_ticker_date (ticker, trade_date),
                INDEX idx_trade_history_user_id (user_id),
                CONSTRAINT fk_trade_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    },
    {
        name: 'buy_presets',
        sql: `
            CREATE TABLE IF NOT EXISTS buy_presets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                preset_name VARCHAR(100) NOT NULL,
                ticker VARCHAR(32) NOT NULL,
                buy_entries TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_buy_presets_user_name (user_id, preset_name),
                INDEX idx_buy_presets_user_id (user_id),
                CONSTRAINT fk_buy_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    },
    {
        name: 'compound_presets',
        sql: `
            CREATE TABLE IF NOT EXISTS compound_presets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                preset_name VARCHAR(100) NOT NULL,
                account_id INT NULL,
                interest_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
                compounding_type ENUM('ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY',
                years INT NOT NULL DEFAULT 10,
                payments TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_compound_presets_user_name (user_id, preset_name),
                INDEX idx_compound_presets_user_id (user_id),
                CONSTRAINT fk_compound_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    }
];

const userTableDefinition = {
    name: 'users',
    sql: `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `
};

const scopedTables = [
    ['portfolio', 'fk_portfolio_user', 'idx_portfolio_user_id', 'uq_portfolio_user_ticker', 'ticker'],
    ['sell_history', 'fk_sell_history_user', 'idx_sell_history_user_id', null, null],
    ['bank_accounts', 'fk_bank_accounts_user', 'idx_bank_accounts_user_id', 'uq_bank_accounts_user_name', 'account_name'],
    ['trade_history', 'fk_trade_history_user', 'idx_trade_history_user_id', null, null],
    ['buy_presets', 'fk_buy_presets_user', 'idx_buy_presets_user_id', 'uq_buy_presets_user_name', 'preset_name'],
    ['compound_presets', 'fk_compound_presets_user', 'idx_compound_presets_user_id', 'uq_compound_presets_user_name', 'preset_name']
];

const ensureUserColumnsAndForeignKeys = async (conn) => {
    for (const [tableName, constraintName, indexName, compositeIndexName, uniqueColumn] of scopedTables) {
        const columns = await conn.query(
            `SELECT COUNT(*) AS count
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'user_id'`,
            [tableName]
        );
        if (Number(columns[0].count) === 0) {
            await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN user_id INT NULL`);
        }

        const indexes = await conn.query(
            `SELECT COUNT(*) AS count
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
            [tableName, indexName]
        );
        if (Number(indexes[0].count) === 0) {
            await conn.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (user_id)`);
        }

        if (compositeIndexName && uniqueColumn) {
            const oldIndexes = await conn.query(
                `SELECT DISTINCT INDEX_NAME
                 FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                   AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'
                   AND COLUMN_NAME = ?`,
                [tableName, uniqueColumn]
            );
            for (const oldIndex of oldIndexes) {
                if (oldIndex.INDEX_NAME !== compositeIndexName) {
                    await conn.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${oldIndex.INDEX_NAME}\``);
                }
            }
            const compositeIndexes = await conn.query(
                `SELECT COUNT(*) AS count
                 FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
                [tableName, compositeIndexName]
            );
            if (Number(compositeIndexes[0].count) === 0) {
                await conn.query(
                    `ALTER TABLE \`${tableName}\` ADD UNIQUE KEY \`${compositeIndexName}\` (user_id, \`${uniqueColumn}\`)`
                );
            }
        }

        const constraints = await conn.query(
            `SELECT COUNT(*) AS count
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
            [tableName, constraintName]
        );
        if (Number(constraints[0].count) === 0) {
            await conn.query(
                `ALTER TABLE \`${tableName}\`
                 ADD CONSTRAINT \`${constraintName}\`
                 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
            );
        }
    }
};

const initDatabase = async () => {
    let conn;

    try {
        conn = await pool.getConnection();
        await conn.query(userTableDefinition.sql);
        console.log('데이터베이스 테이블 확인 완료: users');
        for (const table of tableDefinitions) {
            await conn.query(table.sql);
            console.log(`데이터베이스 테이블 확인 완료: ${table.name}`);
        }
        await ensureUserColumnsAndForeignKeys(conn);
    } catch (error) {
        console.error('데이터베이스 초기화 실패:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
};

module.exports = pool;
module.exports.initDatabase = initDatabase;