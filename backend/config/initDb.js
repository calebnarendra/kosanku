const fs = require('fs');
const path = require('path');
const pool = require('./db');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDatabaseSchema() {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const maxAttempts = Number(process.env.DB_INIT_MAX_ATTEMPTS || 20);
  const delayMs = Number(process.env.DB_INIT_RETRY_DELAY_MS || 3000);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      await pool.query(schemaSql);
      console.log('Database schema is ready');
      return;
    } catch (error) {
      lastError = error;
      console.error(`Database init attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

module.exports = ensureDatabaseSchema;
