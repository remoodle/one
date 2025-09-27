import { Queue } from "bullmq";
import { db } from "../db";
import { objectEntries } from "../library/utils";

export const queues = {
  EVENTS_SYNC: "events sync",
  EVENTS: "events update",
  REMINDERS: "reminders",
  TELEGRAM: "telegram",
} as const;

export type QueueName = (typeof queues)[keyof typeof queues];

export const queueMap = objectEntries(queues).reduce(
  (map, [key, name]) => {
    map[key as QueueName] = new Queue(name, {
      connection: db.redisConnection,
    });
    return map;
  },
  {} as Record<QueueName, Queue>,
);

export const obliterateQueues = async () => {
  for (const queue of Object.values(queueMap)) {
    await queue.obliterate({ force: true });
  }
};

export const closeQueues = async () => {
  for (const queue of Object.values(queueMap)) {
    await queue.close();
  }
};
