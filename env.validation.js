'use strict';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID'
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  process.exit(1);
}

console.log('✅ All required environment variables are set');
