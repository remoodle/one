import { InlineKeyboard } from "grammy";
import { config } from "../../../config";
import { getMiniAppUrl } from "../helpers/get-mini-app-url";
import {
  deadlinesCallback,
  coursesListCallback,
  settingsCallback,
  aboutCallback,
  backToMenuCallback,
} from "../callback-data";

export const createMenuKeyboard = async (userId: number, userName: string) => {
  const url = await getMiniAppUrl(userId, config.frontend.url);

  const keyboard = new InlineKeyboard()
    .text("Deadlines", deadlinesCallback.pack({ type: "menu" }))
    .row()
    .text("Courses", coursesListCallback.pack({}))
    .row()
    .text("⚙️", settingsCallback.pack({}))
    .text("About", aboutCallback.pack({}))
    .row()
    .webApp("🌐 Website", url);

  return {
    text: `👋 ${userName}`,
    keyboard,
  };
};

export const createBackToMenuKeyboard = () => {
  return new InlineKeyboard().text("Back ←", backToMenuCallback.pack({}));
};
