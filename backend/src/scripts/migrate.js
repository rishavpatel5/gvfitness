require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Neither DIRECT_URL nor DATABASE_URL found in backend/.env');
    process.exit(1);
  }

  // Ensure %40 encoding if password contains unencoded @
  let safeConnStr = connectionString;
  try {
    const url = new URL(connectionString);
    if (url.password && url.password.includes('@')) {
      url.password = encodeURIComponent(url.password);
      safeConnStr = url.toString();
    }
  } catch (e) {
    // Keep as is if URL constructor fails
  }

  const client = new Client({ connectionString: safeConnStr });

  try {
    console.log('🔄 Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const schemaPath = path.join(__dirname, '../../schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ schema.sql not found at:', schemaPath);
      process.exit(1);
    }

    console.log('📄 Reading schema.sql...');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🚀 Executing schema migration...');
    await client.query(sql);
    console.log('✅ Schema migration executed successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables present in Supabase public schema:');
    res.rows.forEach(r => console.log('   ✓ ' + r.table_name));

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await client.end();
  }
}

migrate();

