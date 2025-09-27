import { cleanEnv, str } from "envalid";
import "dotenv/config";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "test", "production", "staging"],
    default: "development",
  }),
  LOG_LEVEL: str({
    choices: ["trace", "debug", "info", "warn", "error", "fatal", "silent"],
    default: "info",
  }),

  VERSION_TAG: str({ default: "~" }),

  TELEGRAM_BOT_TOKEN: str(),
  UNI: str({ default: "aitu", choices: ["aitu"] }),

  REDIS_URI: str({ default: "redis://localhost:6379/1" }),
  MONGO_URI: str({ default: "mongodb://localhost:27017/remoodle-calendar" }),
});

export const config = {
  version: env.VERSION_TAG,
  logLevel: env.LOG_LEVEL,
  bot: {
    token: env.TELEGRAM_BOT_TOKEN,
  },
  redis: {
    uri: env.REDIS_URI,
  },
  mongo: {
    uri: env.MONGO_URI,
  },
};
