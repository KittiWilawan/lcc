import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wpcxqlnprpknxfsbqbeu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwY3hxbG5wcnBrbnhmc2JxYmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzUxMTcsImV4cCI6MjA5NzI1MTExN30.OK3sXx2xK6bJE_N7Rv7oc6akZzBcO6abSlrtMXAuUDg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  console.log('⏳ กำลังทดสอบสมัครสมาชิกเพื่อเช็ค Database...');
  
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'ระบบทดสอบอัตโนมัติ',
        phone: '0812345678',
      }
    }
  });

  if (error) {
    console.error('❌ สมัครสมาชิกไม่สำเร็จ:');
    console.dir(error, { depth: null });
  } else {
    console.log('✅ สมัครสมาชิกสำเร็จ! (แปลว่าระบบเชื่อมกับ Supabase ได้แล้ว)');
    console.log('👤 อีเมลที่ใช้ทดสอบ:', testEmail);
    console.log('👉 ระบบน่าจะสร้างข้อมูล Profile ใน Database เรียบร้อยแล้ว (เพราะ Trigger ทำงานไปแล้ว)');
  }
}

testDatabase();
