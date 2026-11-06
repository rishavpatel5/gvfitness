require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Client } = require('pg');

async function resetData() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Neither DIRECT_URL nor DATABASE_URL found in backend/.env');
    process.exit(1);
  }

  let safeConnStr = connectionString;
  try {
    const url = new URL(connectionString);
    if (url.password && url.password.includes('@')) {
      url.password = encodeURIComponent(url.password);
      safeConnStr = url.toString();
    }
  } catch (e) {}

  const client = new Client({ connectionString: safeConnStr });

  try {
    console.log('🔄 Connecting to database to clear test data...');
    await client.connect();

    // Truncate all transaction and member tables, preserving schema, trainers, and categories
    await client.query(`
      TRUNCATE TABLE 
        payments,
        invoices,
        membership_periods,
        attendance_sessions,
        attendance_raw,
        inquiries,
        notification_logs,
        expenses,
        members
      CASCADE;
    `);

    console.log('✅ All member, invoice, payment, and test attendance data wiped clean!');
    console.log('✨ Database is now at a 100% FRESH START: 0 members, 0 invoices.');

    const res = await client.query('SELECT count(*) FROM members;');
    console.log('📊 Current member count:', res.rows[0].count);

  } catch (err) {
    console.error('❌ Error resetting data:', err.message);
  } finally {
    await client.end();
  }
}

resetData();

