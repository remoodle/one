import { Hono } from "hono";

type ScheduleData = {
    [key: string]: {
        id: string;
        start: string;
        end: string;
        courseName: string;
        location: string;
        isOnline: boolean;
        teacher: string;
        type: "lecture" | "practice";
    }[];
};

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/groups", async (c) => {
    const schedule = await c.env.SCHEDULE_BUCKET.get("main.json");

    if (!schedule) {
        return c.json({ error: "Schedule not found" }, 404);
    }

    const scheduleData: ScheduleData = await schedule.json();

    return c.json(Object.keys(scheduleData));
});

app.get("/schedule/:group", async (c) => {
    const group = c.req.param("group");
    const schedule = await c.env.SCHEDULE_BUCKET.get("main.json");

    if (!schedule) {
        return c.json({ error: "Schedule not found" }, 404);
    }

    const scheduleData: ScheduleData = await schedule.json();

    return c.json(scheduleData[group] ?? []);
});

export default app;
