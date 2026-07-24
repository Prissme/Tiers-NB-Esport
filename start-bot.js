/**
 * @fileoverview Standalone entrypoint to start the unified Discord bot.
 * @module start-bot
 */

'use strict';

require('./env.validation');
require('./ensure-fetch');

const { startUnifiedBot } = require('./discord-bot/unified-bot');

/**
 * Starts the Discord bot and logs lifecycle events.
 *
 * @async
 * @returns {Promise<void>} Resolves once the bot is running.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

async function main() {
  console.log('🤖 Starting Discord bot...');

  try {
    await startUnifiedBot();
    console.log('✅ Bot is running');
  } catch (error) {
    console.error('❌ Bot failed:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('❌ Bot failed to start:', error);
  process.exit(1);
});
