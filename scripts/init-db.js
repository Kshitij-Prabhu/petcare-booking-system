// Runs sql/schema.sql against the MySQL server defined in .env.local, using
// the `mysql` CLI client (so DELIMITER-based stored procedure/trigger
// definitions in schema.sql work exactly as written — the mysql2 Node
// driver does not understand the DELIMITER client command).
//
// Usage: npm run db:init
require('dotenv').config({ path: '.env.local' });
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');

const host = process.env.MYSQL_HOST || 'localhost';
const port = process.env.MYSQL_PORT || '3306';
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';

console.log(`Running sql/schema.sql against ${user}@${host}:${port} ...`);

const args = ['-h', host, '-P', port, '-u', user];
if (password) args.push(`-p${password}`);

const sql = fs.readFileSync(schemaPath, 'utf8');
const result = spawnSync('mysql', args, { input: sql, stdio: ['pipe', 'inherit', 'inherit'] });

if (result.error) {
  console.error('\nCould not find the `mysql` CLI client on PATH.');
  console.error('Install the MySQL client, or run manually:');
  console.error(`  mysql -h ${host} -P ${port} -u ${user} -p < sql/schema.sql`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error('Schema import failed — see MySQL error output above.');
  process.exit(result.status);
}
console.log('Schema created successfully.');
