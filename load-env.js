'use strict';

const fs = require('fs');
const path = require('path');

function loadEnvFile({ warn } = {}) {
  const envPath = path.join(__dirname, '.env');
  const logWarn = warn || console.warn;
  if (!fs.existsSync(envPath)) {
    logWarn('Fichier .env introuvable, poursuite avec les variables déjà définies.');
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

module.exports = { loadEnvFile };
