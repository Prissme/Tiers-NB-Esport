'use strict';

const { loadEnvFile } = require('./load-env');

loadEnvFile({ warn: (message) => console.warn(message) });

const required = ['SUPABASE_URL', 'DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'];
const missing = required.filter((key) => !process.env[key]);

const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
if (!hasServiceKey) {
  missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)');
}

const optional = ['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const optionalMissing = optional.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  process.exit(1);
}

if (optionalMissing.length > 0) {
  console.warn('⚠️ Optional environment variables not set (bot can still run):');
  optionalMissing.forEach((key) => console.warn(`   - ${key}`));
}

console.log('✅ Bot required environment variables are set');
