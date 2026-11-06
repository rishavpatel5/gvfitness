require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  console.log('[Supabase] Initialized real database connection.');
} else {
  console.warn('[Supabase] Credentials not provided or template used. Backend running in in-memory mock mode until Supabase credentials are configured in .env.');
}

module.exports = { supabase };
