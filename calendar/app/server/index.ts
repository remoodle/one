import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ScheduleData } from "./types.d";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.get("/api/groups", async (c) => {
  const schedule = await c.env.SCHEDULE_BUCKET.get("main.json");

  const group = c.req.query("group");

  if (!schedule) {
    return c.json({ error: "Schedule not found" }, 500);
  }

  const scheduleData: ScheduleData = await schedule.json();

  if (group) {
    return c.json(scheduleData[group] ?? []);
  }

  return c.json(Object.keys(scheduleData));
});

export default app;
