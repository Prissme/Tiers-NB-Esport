'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const { loadEnvFile } = require('./load-env');

const LOG_PREFIX = '[Server]';
const DISCORD_BOT_NODE_MODULES = path.join(__dirname, 'discord-bot', 'node_modules');
const DISCORD_BOT_DISCORD_JS = path.join(DISCORD_BOT_NODE_MODULES, 'discord.js');

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function errorLog(...args) {
  console.error(LOG_PREFIX, ...args);
}

function validateEnv(requiredKeys, label, { optionalKeys = [] } = {}) {
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    warn(`Variables manquantes (${label}) : ${missing.join(', ')}`);
    return false;
  }
  log(`Variables critiques OK (${label}).`);

  const optionalMissing = optionalKeys.filter((key) => !process.env[key]);
  if (optionalMissing.length > 0) {
    warn(`Variables optionnelles absentes (${label}) : ${optionalMissing.join(', ')}`);
  }

  return true;
}

function hasSupabaseServiceKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
}

function ensureDiscordBotDependencies() {
  if (fs.existsSync(DISCORD_BOT_DISCORD_JS)) {
    return true;
  }

  warn('discord.js introuvable pour le bot, installation des dépendances...');

  try {
    const installResult = spawnSync('npm', ['install', '--omit=dev'], {
      cwd: path.join(__dirname, 'discord-bot'),
      stdio: 'inherit'
    });

    if (installResult.status !== 0) {
      warn('Installation des dépendances du bot échouée.');
      return false;
    }

    return fs.existsSync(DISCORD_BOT_DISCORD_JS);
  } catch (err) {
    warn('Impossible d’installer les dépendances du bot:', err);
    return false;
  }
}

async function startBotSafely() {
  if (process.env.SKIP_BOT_START === '1') {
    warn('Démarrage du bot ignoré (SKIP_BOT_START=1).');
    return;
  }

  const botHasEnv =
    validateEnv(['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'SUPABASE_URL'], 'bot') && hasSupabaseServiceKey();

  if (!botHasEnv) {
    warn(
      'Démarrage du bot annulé : variables manquantes ou clé Supabase absente (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_KEY).'
    );
    return;
  }

  try {
    if (!ensureDiscordBotDependencies()) {
      warn('Le bot ne peut pas démarrer sans discord.js.');
      return;
    }
    const { startUnifiedBot } = require('./discord-bot/unified-bot');
    await startUnifiedBot();
  } catch (err) {
    errorLog('Le bot a échoué, le serveur web reste actif :', err);
  }
}

loadEnvFile({ warn });

const dev = process.env.NODE_ENV !== 'production';
const quiet = process.env.NODE_ENV === 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const optionalWebMissing = [];
if (!publicSupabaseUrl) {
  optionalWebMissing.push('NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL)');
}
if (!publicSupabaseAnonKey) {
  optionalWebMissing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_ANON_KEY)');
}
if (optionalWebMissing.length) {
  warn(
    `Supabase client-side non configuré (${optionalWebMissing.join(
      ', '
    )}). Certaines pages (admin) afficheront un message d'erreur sans casser le site.`
  );
} else {
  log('Supabase client-side configuré (web).');
}

const standaloneServerPath = path.join(__dirname, '.next', 'standalone', 'server.js');
const useStandalone = !dev && fs.existsSync(standaloneServerPath);

if (useStandalone) {
  log('Démarrage du serveur Next.js standalone.');
  const serverProcess = spawn('node', [standaloneServerPath], { stdio: 'inherit' });

  serverProcess.on('exit', (code, signal) => {
    if (signal) {
      errorLog(`Le serveur standalone s'est arrêté (signal: ${signal}).`);
      process.exit(1);
    }
    if (code !== null) {
      if (code !== 0) {
        errorLog(`Le serveur standalone s'est arrêté avec le code ${code}.`);
      }
      process.exit(code);
    }
  });

  setTimeout(() => {
    startBotSafely();
  }, 2000);
} else {
  const next = require('next');
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
}
