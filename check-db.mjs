import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wpcxqlnprpknxfsbqbeu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwY3hxbG5wcnBrbnhmc2JxYmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzUxMTcsImV4cCI6MjA5NzI1MTExN30.OK3sXx2xK6bJE_N7Rv7oc6akZzBcO6abSlrtMXAuUDg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  console.log('🔍 Checking if "profiles" table exists...');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    console.error('❌ Error checking table:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ The "profiles" table EXISTS!');
  }
}

checkTable();
