import { Schema, model } from "mongoose";
import { v7 as uuidv7 } from "uuid";

export const DEFAULT_THRESHOLDS = ["3h", "6h", "1d"];

export type UserSettings = {
  deadlineReminders: {
    thresholds: string[];
  };
};

export type IUser = {
  _id: string;
  telegramId?: number;
  settings: UserSettings;
};

const deadlineRemindersSchema = new Schema(
  {
    thresholds: {
      type: [String],
      default: DEFAULT_THRESHOLDS,
      required: true,
    },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: uuidv7 },
    telegramId: { type: Number },
    settings: {
      deadlineReminders: {
        type: deadlineRemindersSchema,
        default: {},
        required: true,
      },
    },
  },
  { timestamps: true },
);

userSchema.index({ telegramId: 1 }, { unique: true });

export default model("User", userSchema);
