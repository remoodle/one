import { InlineKeyboard } from "grammy";
import {
  deadlinesCallback,
  coursesListCallback,
  settingsCallback,
  aboutCallback,
  backToMenuCallback,
} from "../callback-data";

export const createMenuKeyboard = async (userId: number, userName: string) => {
  const keyboard = new InlineKeyboard()
    .text("Deadlines", deadlinesCallback.pack({}))
    .row()
    .text("Courses", coursesListCallback.pack({}))
    .row()
    .text("⚙️", settingsCallback.pack({}))
    .text("About", aboutCallback.pack({}));

  return {
    text: `👋 ${userName}`,
    keyboard,
  };
};

export const createBackToMenuKeyboard = () => {
  return new InlineKeyboard().text("Back ←", backToMenuCallback.pack({}));
};
