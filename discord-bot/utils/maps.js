'use strict';

const { MAP_ROTATION } = require('../config/constants');

function isMissingShieldColumnError(message) {
  if (typeof message !== 'string') {
    return false;
  }

  return (
    message.includes("Could not find the 'shield_active' column") ||
    message.includes("Could not find the 'shield_threshold' column")
  );
}


function pickRandomMaps(count) {
  const available = MAP_ROTATION.slice();
  const selections = [];

  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  for (let i = 0; i < Math.min(count, available.length); i += 1) {
    selections.push(available[i]);
  }

  return selections;
}


module.exports = { isMissingShieldColumnError, pickRandomMaps };
