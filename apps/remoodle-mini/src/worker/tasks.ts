import type { RepeatOptions, WorkerOptions } from "bullmq";

export const jobs = {
  EVENTS_SCHEDULE_SYNC: "events::schedule-sync",
  EVENTS_UPDATE: "events::update",
  REMINDERS_CHECK: "reminders::check",
  TELEGRAM_SEND_MESSAGE: "telegram::send-message",
} as const;

export type JobName = (typeof jobs)[keyof typeof jobs];

type Task = {
  jobName: JobName;
  repeat?: Omit<RepeatOptions, "key">;
  opts?: Partial<WorkerOptions>;
};

export type Tasks = Task[];

export const tasks: Tasks = [
  {
    jobName: jobs.EVENTS_SCHEDULE_SYNC,
    repeat: {
      pattern: "0 */30 * * * *",
    },
  },
  {
    jobName: jobs.EVENTS_UPDATE,
    opts: {
      concurrency: 10,
    },
  },
  {
    jobName: jobs.REMINDERS_CHECK,
    opts: {
      concurrency: 50,
    },
  },
  {
    jobName: jobs.TELEGRAM_SEND_MESSAGE,
    opts: {
      concurrency: 5,
      limiter: {
        max: 30,
        duration: 1000,
      },
    },
  },
];
