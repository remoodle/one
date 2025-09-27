import { env, config } from "./config";
import pino from "pino";

const pinoOptions: pino.LoggerOptions = {
  base: undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  level: config.logLevel,
  transport: {
    targets: [
      ...(env.isDev
        ? [
            {
              target: "pino-pretty",
              level: config.logLevel,
              options: {
                ignore: "pid,hostname",
                colorize: true,
                translateTime: true,
              },
            },
          ]
        : [
            {
              target: "pino/file",
              level: config.logLevel,
              options: {},
            },
          ]),
    ],
  },
};

export const pinoLogger = pino(pinoOptions);

export const logger = {
  main: pinoLogger.child({ module: "main" }),
  bot: pinoLogger.child({ module: "bot" }),
  api: pinoLogger.child({ module: "api" }),
  worker: pinoLogger.child({ module: "worker" }),
};

export type Logger = typeof pinoLogger;
