const { Pool } = require('pg');

// Never use SSL for localhost connections
const connectionString = process.env.DATABASE_URL;
const useSSL = connectionString && !connectionString.includes('localhost') && process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

console.log('Database config: SSL=' + useSSL + ', URL=' + (connectionString ? connectionString.replace(/:[^:@]+@/, ':***@') : 'not set'));

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool
};
