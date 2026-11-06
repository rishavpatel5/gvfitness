require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function seed() {
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
  const storePath = path.join(__dirname, '../../data/store.json');

  if (!fs.existsSync(storePath)) {
    console.error('❌ store.json not found at:', storePath);
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));

  try {
    console.log('🔄 Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // 1. Trainers
    if (store.trainers?.length) {
      console.log(`📦 Seeding ${store.trainers.length} trainers...`);
      for (const t of store.trainers) {
        await client.query(`
          INSERT INTO trainers (id, name, phone, is_active)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, is_active = EXCLUDED.is_active;
        `, [t.id, t.name, t.phone || null, t.is_active !== false]);
      }
    }

    // 2. Expense Categories
    if (store.expense_categories?.length) {
      console.log(`📦 Seeding ${store.expense_categories.length} expense categories...`);
      for (const cat of store.expense_categories) {
        await client.query(`
          INSERT INTO expense_categories (id, name, is_custom)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET id = EXCLUDED.id;
        `, [cat.id, cat.name, cat.is_custom || false]);
      }
    }

    // 3. Members
    if (store.members?.length) {
      console.log(`📦 Seeding ${store.members.length} members...`);
      for (const m of store.members) {
        await client.query(`
          INSERT INTO members (id, member_code, device_user_id, name, phone, dob, gender, fitness_level, emergency_contact, notes, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET 
            member_code = EXCLUDED.member_code,
            device_user_id = EXCLUDED.device_user_id,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            dob = EXCLUDED.dob,
            gender = EXCLUDED.gender,
            fitness_level = EXCLUDED.fitness_level,
            emergency_contact = EXCLUDED.emergency_contact,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status;
        `, [
          m.id,
          m.member_code,
          m.device_user_id || null,
          m.name,
          m.phone,
          m.dob || null,
          m.gender || 'Male',
          m.fitness_level || 'Beginner',
          m.emergency_contact || null,
          m.notes || null,
          m.status || 'Active'
        ]);
      }
    }

    const validMemberIds = new Set(store.members.map(m => m.id));

    // 4. Membership Periods
    const validPeriods = (store.membership_periods || []).filter(p => validMemberIds.has(p.member_id));
    if (validPeriods.length) {
      console.log(`📦 Seeding ${validPeriods.length} membership periods...`);
      for (const p of validPeriods) {
        await client.query(`
          INSERT INTO membership_periods (id, member_id, membership_type, trainer_id, duration_months, start_date, end_date, package_price, discount_type, discount_value, final_payable, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            end_date = EXCLUDED.end_date,
            final_payable = EXCLUDED.final_payable;
        `, [
          p.id,
          p.member_id,
          p.membership_type,
          p.trainer_id || null,
          p.duration_months || 1,
          p.start_date,
          p.end_date,
          p.package_price || 0,
          p.discount_type || 'none',
          p.discount_value || 0,
          p.final_payable || 0,
          p.status || 'Active',
          p.notes || null
        ]);
      }
    }

    // 5. Invoices
    const validInvoices = (store.invoices || []).filter(inv => validMemberIds.has(inv.member_id));
    const validInvoiceIds = new Set(validInvoices.map(inv => inv.id));
    if (validInvoices.length) {
      console.log(`📦 Seeding ${validInvoices.length} invoices...`);
      for (const inv of validInvoices) {
        await client.query(`
          INSERT INTO invoices (id, invoice_number, member_id, membership_period_id, total_amount, status, public_token)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `, [
          inv.id,
          inv.invoice_number,
          inv.member_id,
          inv.membership_period_id || null,
          inv.total_amount || 0,
          inv.status || 'Paid',
          inv.public_token || ('tok_' + inv.id)
        ]);
      }
    }

    // 6. Payments
    const validPayments = (store.payments || []).filter(pay => validInvoiceIds.has(pay.invoice_id));
    if (validPayments.length) {
      console.log(`📦 Seeding ${validPayments.length} payments...`);
      for (const pay of validPayments) {
        await client.query(`
          INSERT INTO payments (id, invoice_id, amount, payment_method, payment_date)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING;
        `, [
          pay.id,
          pay.invoice_id,
          pay.amount || 0,
          pay.payment_method || 'Cash',
          pay.payment_date || new Date().toISOString().split('T')[0]
        ]);
      }
    }

    // 7. Expenses
    if (store.expenses?.length) {
      console.log(`📦 Seeding ${store.expenses.length} expenses...`);
      for (const exp of store.expenses) {
        await client.query(`
          INSERT INTO expenses (id, category_id, category_name, title, amount, payment_method, expense_date, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `, [
          exp.id,
          exp.category_id || null,
          exp.category_name || 'General',
          exp.title,
          exp.amount || 0,
          exp.payment_method || 'Cash',
          exp.expense_date || new Date().toISOString().split('T')[0],
          exp.notes || null
        ]);
      }
    }

    // 8. Inquiries
    if (store.inquiries?.length) {
      console.log(`📦 Seeding ${store.inquiries.length} inquiries...`);
      for (const inq of store.inquiries) {
        await client.query(`
          INSERT INTO inquiries (id, name, phone, preferred_type, source, status, is_completed, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `, [
          inq.id,
          inq.name,
          inq.phone,
          inq.preferred_type || 'GT',
          inq.source || 'Walk-in',
          inq.status || 'New',
          inq.is_completed || false,
          inq.notes || null
        ]);
      }
    }

    // 9. Devices Whitelist
    if (store.devices_whitelist?.length) {
      console.log(`📦 Seeding ${store.devices_whitelist.length} biometric devices...`);
      for (const dev of store.devices_whitelist) {
        await client.query(`
          INSERT INTO devices_whitelist (device_serial, device_name, is_active)
          VALUES ($1, $2, $3)
          ON CONFLICT (device_serial) DO NOTHING;
        `, [
          dev.device_serial,
          dev.device_name || 'eSSL K90 Pro',
          dev.is_active !== false
        ]);
      }
    }

    console.log('\n🎉 SUCCESS! All data from store.json has been synced to your Supabase PostgreSQL database.');

  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await client.end();
  }
}

seed();
