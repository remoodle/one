import { Composer } from "grammy";
import type { Context } from "../context";
import { logHandle } from "../helpers/logging";

const composer = new Composer<Context>();

const feature = composer.chatType("private");

feature.command("start", logHandle("command-start"), async (ctx) => {
  await ctx.reply("Welcome");
});

export { composer as welcomeFeature };
