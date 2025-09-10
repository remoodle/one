import type { ErrorHandler } from "grammy";
import type { Context } from "../context";
import { getUpdateInfo } from "../helpers/logging";

export const errorHandler: ErrorHandler<Context> = async (error) => {
  const { ctx } = error;

  ctx.logger.error({
    err: error.error,
    update: getUpdateInfo(ctx),
  });
};
