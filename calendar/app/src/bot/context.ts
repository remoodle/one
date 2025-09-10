import type { Context as DefaultContext, SessionFlavor } from "grammy";
import type { HydrateFlavor } from "@grammyjs/hydrate";
import type { Logger } from "../logger";

export interface SessionData {}

interface ExtendedContextFlavor {
  logger: Logger;
}

export type Context = HydrateFlavor<
  DefaultContext & ExtendedContextFlavor & SessionFlavor<SessionData>
>;
