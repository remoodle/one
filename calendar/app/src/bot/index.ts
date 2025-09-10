import { Bot as TelegramBot, MemorySessionStorage } from "grammy";
import { hydrate } from "@grammyjs/hydrate";
import { logger } from "../logger";
import { env } from "../config";
import type { Context, SessionData } from "./context";
import { errorHandler } from "./handlers/error";
import { session } from "./middleware/session";
import { updateLogger } from "./middleware/update-logger";
import { welcomeFeature } from "./features/welcome";

function getSessionKey(ctx: Omit<Context, "session">) {
  return ctx.chat?.id.toString();
}

export function createBot(token: string) {
  const bot = new TelegramBot<Context>(token);

  bot.use(async (ctx, next) => {
    ctx.logger = logger.child({
      update_id: ctx.update.update_id,
    });

    await next();
  });

  const protectedBot = bot.errorBoundary(errorHandler);

  // Middlewares
  if (env.isDev) {
    protectedBot.use(updateLogger());
  }
  protectedBot.use(hydrate());
  protectedBot.use(
    session({
      getSessionKey,
      storage: new MemorySessionStorage<SessionData>(),
    }),
  );

  // Handlers
  protectedBot.use(welcomeFeature);

  return bot;
}

export type Bot = ReturnType<typeof createBot>;
