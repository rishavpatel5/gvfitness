require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');

async function seed() {
  if (!supabase) {
    console.error('❌ Supabase client is not connected!');
    console.error('👉 Please make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env');
    process.exit(1);
  }

  const storePath = path.join(__dirname, '../../data/store.json');
  if (!fs.existsSync(storePath)) {
    console.error('❌ store.json not found at:', storePath);
    process.exit(1);
  }

  console.log('🔄 Reading data from backend/data/store.json...');
  const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));

  try {
    // 1. Expense Categories
    if (store.expense_categories?.length) {
      console.log(`📦 Syncing ${store.expense_categories.length} expense categories...`);
      const { error } = await supabase.from('expense_categories').upsert(store.expense_categories, { onConflict: 'name' });
      if (error) console.warn('Warning on expense_categories:', error.message);
    }

    // 2. Trainers
    if (store.trainers?.length) {
      console.log(`📦 Syncing ${store.trainers.length} trainers...`);
      const { error } = await supabase.from('trainers').upsert(store.trainers, { onConflict: 'id' });
      if (error) console.warn('Warning on trainers:', error.message);
    }

    // 3. Members
    if (store.members?.length) {
      console.log(`📦 Syncing ${store.members.length} members...`);
      const { error } = await supabase.from('members').upsert(store.members, { onConflict: 'id' });
      if (error) console.warn('Warning on members:', error.message);
    }

    // 4. Membership Periods
    if (store.membership_periods?.length) {
      console.log(`📦 Syncing ${store.membership_periods.length} membership periods...`);
      const { error } = await supabase.from('membership_periods').upsert(store.membership_periods, { onConflict: 'id' });
      if (error) console.warn('Warning on membership_periods:', error.message);
    }

    // 5. Invoices
    if (store.invoices?.length) {
      console.log(`📦 Syncing ${store.invoices.length} invoices...`);
      const { error } = await supabase.from('invoices').upsert(store.invoices, { onConflict: 'id' });
      if (error) console.warn('Warning on invoices:', error.message);
    }

    // 6. Payments
    if (store.payments?.length) {
      console.log(`📦 Syncing ${store.payments.length} payments...`);
      const { error } = await supabase.from('payments').upsert(store.payments, { onConflict: 'id' });
      if (error) console.warn('Warning on payments:', error.message);
    }

    // 7. Expenses
    if (store.expenses?.length) {
      console.log(`📦 Syncing ${store.expenses.length} expenses...`);
      const { error } = await supabase.from('expenses').upsert(store.expenses, { onConflict: 'id' });
      if (error) console.warn('Warning on expenses:', error.message);
    }

    // 8. Inquiries
    if (store.inquiries?.length) {
      console.log(`📦 Syncing ${store.inquiries.length} inquiries...`);
      const { error } = await supabase.from('inquiries').upsert(store.inquiries, { onConflict: 'id' });
      if (error) console.warn('Warning on inquiries:', error.message);
    }

    // 9. Devices Whitelist
    if (store.devices_whitelist?.length) {
      console.log(`📦 Syncing ${store.devices_whitelist.length} biometric devices...`);
      const { error } = await supabase.from('devices_whitelist').upsert(store.devices_whitelist, { onConflict: 'device_serial' });
      if (error) console.warn('Warning on devices_whitelist:', error.message);
    }

    console.log('✅ Sync to Supabase completed successfully!');
  } catch (err) {
    console.error('❌ Error during sync:', err.message);
  }
}

seed();

