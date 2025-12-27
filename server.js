const fs = require('fs');
const http = require('http');
const path = require('path');
const next = require('next');
const { handleApiRequest, sendText } = require('./api');

loadEnv();

const DEFAULT_PORT = process.env.PORT || 3000;

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  try {
    const buffer = fs.readFileSync(envPath, 'utf8');
    buffer
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
          return;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
          process.env[key] = value;
        }
      });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Unable to read .env file:', error.message);
    }
  }
}

// 🤖 LANCER LE BOT DISCORD
function startDiscordBot() {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    console.warn('⚠️  Discord bot disabled: DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set');
    return;
  }

  console.log('🤖 Starting Discord bot...');

  try {
    // Importer et lancer le bot unifié
    const { startUnifiedBot } = require('./discord-bot/unified-bot.js');
    Promise.resolve(startUnifiedBot()).catch((error) => {
      console.error('❌ Failed to start unified Discord bot:', error);
    });
  } catch (error) {
    console.error('❌ Failed to start Discord bot:', error.message);
  }
}

async function createServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const app = next({ dev: isDev });
  const handle = app.getRequestHandler();

  await app.prepare();

  return http.createServer(async (req, res) => {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) {
        return;
      }

      await handle(req, res);
    } catch (error) {
      console.error('Unexpected server error:', error);
      if (!res.headersSent) {
        sendText(res, 500, 'Internal Server Error');
      } else {
        res.end();
      }
    }
  });
}

if (require.main === module) {
  createServer()
    .then((server) => {
      server.listen(DEFAULT_PORT, () => {
        console.log(`✅ Server listening on port ${DEFAULT_PORT}`);

        // 🤖 Lancer le bot après le serveur
        startDiscordBot();
      });
    })
    .catch((error) => {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    });
}

module.exports = { createServer };
