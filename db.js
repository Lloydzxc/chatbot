const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',         // Database username
  host: 'localhost',        // Database server (localhost for local development)
  database: 'churchchatbot', // Database name
  password: 'password123',  // Your database password
  port: 5432                // PostgreSQL port (default is 5432)
});

module.exports = pool;
