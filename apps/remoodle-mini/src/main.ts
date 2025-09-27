import { db } from "./db";
import { config } from "./config";
import { logger } from "./logger";
import { createBot } from "./bot";
import { ApiServer } from "./api/server";
import { SessionExtender } from "./worker/session-extender";

async function startPolling() {
  const bot = createBot(config.bot.token);

  onShutdown(async () => {
    await bot.stop();
  });

  await bot.init();

  logger.bot.info({
    msg: "Bot running...",
    username: bot.botInfo.username,
  });

  bot.start();
}

function onShutdown(cleanUp: () => Promise<void>) {
  let isShuttingDown = false;
  const handleShutdown = async () => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    await cleanUp();
  };
  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

async function startServices() {
  // Initialize database
  await db.mongoDataSource.initialize();
  logger.main.info({ msg: "Database initialized" });

  // Start API server
  const apiServer = new ApiServer(3001);
  await apiServer.start();

  // Start session extender
  const sessionExtender = new SessionExtender();
  sessionExtender.start();

  // Start Telegram bot
  const bot = createBot(config.bot.token);
  await bot.init();
  bot.start();

  logger.main.info({
    msg: "All services started",
    username: bot.botInfo.username,
  });

  // Setup shutdown handlers
  onShutdown(async () => {
    await bot.stop();
    sessionExtender.stop();
    await apiServer.stop();
    await db.mongoDataSource.destroy();
  });
}

// startPolling();

db.mongoDataSource
  .initialize()
  .then(async () => {
    await startServices();
  })
  .catch((error) => {
    logger.main.error({ error: error.message, stack: error.stack });
    process.exit(1);
  });
