import { Schema, model } from "mongoose";
import { v7 as uuidv7 } from "uuid";
// import { convertIcsCalendar, type IcsCalendar } from "ts-ics";
import type { IcsCalendar } from "ts-ics";

export type IEvent = {
  _id: string;
  userId: string;
  data: IcsCalendar;
};

const event = new Schema<IEvent>(
  {
    _id: { type: String, default: uuidv7 },
    userId: { type: String, required: true, ref: "User" },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

event.index({ userId: 1 });

export default model("Event", event);
