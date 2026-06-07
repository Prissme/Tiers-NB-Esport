'use strict';

function parseDurationToMs(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)\s*(m|min|h|d|j)?$/i);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = (match[2] || 'm').toLowerCase();
  if (unit === 'h') {
    return amount * 60 * 60 * 1000;
  }
  if (unit === 'd' || unit === 'j') {
    return amount * 24 * 60 * 60 * 1000;
  }

  return amount * 60 * 1000;
}


function formatDurationMinutes(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes} min`;
}

function formatDiscordTimestamp(dateInput, style = 'R') {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) {
    return null;
  }

  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}


module.exports = { parseDurationToMs, formatDurationMinutes, formatDiscordTimestamp };
