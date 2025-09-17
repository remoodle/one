import { FlowProducer } from "bullmq";
import type { FlowChildJob, FlowJob, Job } from "bullmq";
import type { RepeatOptions, WorkerOptions } from "bullmq";
import { Queue } from "bullmq";
import { config } from "../config";
import { logger } from "../logger";
import { db } from "../db";

const queues = {
  EVENTS_SYNC: "events sync",
  EVENTS: "events update",
  REMINDERS: "reminders",
  TELEGRAM: "telegram",
} as const;

export type QueueName = (typeof queues)[keyof typeof queues];

const bullmqQueues = Object.values(queues).map((name) => {
  return new Queue(name, {
    connection: db.redisConnection,
  });
});

export const obliterateQueues = async () => {
  for (const queue of bullmqQueues) {
    await queue.obliterate({ force: true });
  }
};

export const closeQueues = async () => {
  for (const queue of bullmqQueues) {
    await queue.close();
  }
};

const jobs = {
  EVENTS_SCHEDULE_SYNC: "events::schedule-sync",
  EVENTS_UPDATE: "events::update",
  REMINDERS_CHECK: "reminders::check",
  TELEGRAM_SEND_MESSAGE: "telegram::send-message",
} as const;

export type JobName = (typeof jobs)[keyof typeof jobs];

type Task = {
  name: JobName;
  repeat?: Omit<RepeatOptions, "key">;
  opts?: Partial<WorkerOptions>;
};

export type Tasks = Task[];

export const tasks: Tasks = [
  {
    name: jobs.EVENTS_SCHEDULE_SYNC,
    repeat: {
      pattern: "0 */30 * * * *",
    },
  },
  {
    name: jobs.EVENTS_UPDATE,
    opts: {
      concurrency: 10,
    },
  },
  {
    name: jobs.REMINDERS_CHECK,
    opts: {
      concurrency: 50,
    },
  },
  {
    name: jobs.TELEGRAM_SEND_MESSAGE,
    opts: {
      concurrency: 5,
      limiter: {
        max: 30,
        duration: 1000,
      },
    },
  },
];

export type Processor = {
  jobName: JobName;
  process(job: Job): Promise<any>;
};

export const processors: Record<QueueName, Processor> = {
  [queues.EVENTS_SYNC]: {
    jobName: jobs.EVENTS_SCHEDULE_SYNC,
    process: async (job) => {
      const { userId } = job.data;

      const users = userId ? [{ userId }] : await wrapper.getActiveUsers();

      logger.info(
        { userId },
        `scheduling events sync for ${users.length} users`,
      );

      const flowProducer = new FlowProducer({
        connection: db.redisConnection,
      });

      const flows = users.map((user) => ({
        queueName: queues.REMINDERS,
        name: jobs.REMINDERS_CHECK,
        data: { userId: user.userId },
        children: [
          {
            queueName: queues.EVENTS,
            name: jobs.EVENTS_UPDATE,
            data: { userId: user.userId },
            opts: {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 1000,
              },
              deduplication: {
                id: user.userId,
              },
              ignoreDependencyOnFailure: true,
            },
          },
        ],
        opts: {
          deduplication: {
            id: user.userId,
          },
        },
      }));

      const trees = await flowProducer.addBulk(flows);

      return trees.length;
    },
  },
  [queues.EVENTS]: {
    jobName: jobs.EVENTS_UPDATE,
    process: async (job) => {
      const { userId } = job.data;

      logger.info({ userId }, `syncing events`);

      await syncEvents(userId);
    },
  },
  [queues.REMINDERS]: {
    jobName: jobs.REMINDERS_CHECK,
    process: async (job) => {
      const { userId } = job.data;

      logger.cluster.info({ userId }, `checking reminders`);

      const user = await db.user.findOne({ _id: userId });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const events = await db.event
        .find({ userId })
        .sort({ "data.timestart": 1 });

      if (!events.length) {
        return "no events";
      }

      const existingReminders = await db.reminder.find({ userId });

      const reminders = trackDeadlineReminders(
        user.settings.deadlineReminders.thresholds,
        events,
        existingReminders,
      );

      if (!reminders.length) {
        return "no deadline reminders";
      }

      const newReminders = reminders.map((reminder) => ({
        userId: reminder.userId,
        eventId: reminder.eventId,
        triggeredAt: reminder.triggeredAt,
      }));

      await db.reminder.insertMany(newReminders);

      const deadlineReminders = getCourseDeadlineReminders(events, reminders);

      if (
        user.telegramId &&
        user.settings.notifications["deadlineReminders::telegram"] !== 0
      ) {
        const message = formatDeadlineReminders(deadlineReminders);

        await queues[QueueName.TELEGRAM].add(
          JobName.TELEGRAM_SEND_MESSAGE,
          { userId, message },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            deduplication: {
              id: `${userId}::${message}`,
            },
          },
        );
      }

      return deadlineReminders;
    },
  },
  [queues.TELEGRAM]: {
    jobName: jobs.TELEGRAM_SEND_MESSAGE,
    process: async (job) => {
      const { userId, message } = job.data;

      logger.info({ userId }, `sending telegram message`);

      const user = await db.user.findOne({ _id: userId });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      if (!user.telegramId) {
        throw new Error(`User ${userId} has no telegramId`);
      }

      const telegram = new Telegram(config.telegram.token, user.telegramId);

      const response = await telegram.notify(message, {
        parseMode: "HTML",
        replyMarkup: [
          [
            {
              text: "Clear",
              callback_data: "remove_message",
            },
          ],
        ],
      });

      if (response.ok) {
        logger.info(
          {
            userId,
            name: user.name,
            message,
          },
          `sent telegram message`,
        );
      } else {
        logger.error(
          {
            userId,
            name: user.name,
            message,
            status: response.status,
            statusText: response.statusText,
          },
          `failed to send notification`,
        );
      }
    },
  },
};
