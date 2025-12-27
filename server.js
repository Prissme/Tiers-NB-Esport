'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const next = require('next');

const { startUnifiedBot } = require('./discord-bot/unified-bot');

const LOG_PREFIX = '[Server]';

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function errorLog(...args) {
  console.error(LOG_PREFIX, ...args);
}

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    warn('Fichier .env introuvable, poursuite avec les variables déjà définies.');
    return;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  });
}

function validateEnv(requiredKeys, label) {
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    warn(`Variables manquantes (${label}) : ${missing.join(', ')}`);
    return false;
  }
  log(`Variables critiques OK (${label}).`);
  return true;
}

function hasSupabaseServiceKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
}

async function startBotSafely() {
  const botHasEnv =
    validateEnv(['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'SUPABASE_URL'], 'bot') && hasSupabaseServiceKey();

  if (!botHasEnv) {
    warn(
      'Démarrage du bot annulé : variables manquantes ou clé Supabase absente (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_KEY).'
    );
    return;
  }

  try {
    await startUnifiedBot();
  } catch (err) {
    errorLog('Le bot a échoué, le serveur web reste actif :', err);
  }
}

loadEnvFile();

const dev = process.env.NODE_ENV !== 'production';
const quiet = process.env.NODE_ENV === 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);

validateEnv(['SUPABASE_URL', 'SUPABASE_ANON_KEY'], 'web');

const app = next({ dev, hostname, port, quiet });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, hostname, () => {
      log(`Serveur Next.js prêt sur http://${hostname}:${port}`);

      // Démarrage différé du bot pour éviter le pic de mémoire au boot.
      setTimeout(() => {
        startBotSafely();
      }, 2000);
    });

    server.on('error', (err) => {
      errorLog('Erreur serveur:', err);
    });
  })
  .catch((err) => {
    errorLog('Erreur critique lors du démarrage Next.js:', err);
    process.exit(1);
  });
