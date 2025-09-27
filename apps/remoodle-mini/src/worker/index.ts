import type { WorkerOptions } from "bullmq";
import { Worker } from "bullmq";
import { logger } from "../logger";
import { config } from "../config";
import { db } from "../db";
import { tasks, type Tasks } from "./tasks";
import { queueMap, obliterateQueues, closeQueues } from "./queues";
import { processors, getQueueProcessor } from "./processor";

const upsertSchedulers = async (tasks: Tasks) => {
  const repeatableTasks = tasks.filter((task) => task.repeat);

  for (const task of repeatableTasks) {
    const [queueName] = getQueueProcessor(task.jobName);

    const queue = queueMap[queueName];

    await queue.upsertJobScheduler(task.jobName, task.repeat!, {
      opts: {
        backoff: 3,
        attempts: 6,
        removeOnFail: false,
      },
    });
  }
};

const workers: Worker[] = [];

const defaultWorkerOptions: WorkerOptions = {
  connection: db.redisConnection,
  removeOnComplete: { age: 3600 }, // keep up to 1 hour
  removeOnFail: { age: 3600 }, // keep up to 1 hour
};

const spawnWorkers = async (tasks: Tasks) => {
  for (const task of tasks) {
    const [queueName, { process }] = getQueueProcessor(task.jobName);

    const worker = new Worker(queueName, process, {
      ...defaultWorkerOptions,
      ...task.opts,
    });

    workers.push(worker);
  }
};

const run = async () => {
  logger.worker.info("starting cluster...");

  // if (config.cluster.scheduler.enabled && config.cluster.queues.prune) {
  //   logger.cluster.info("obliterating queues...");
  //   await obliterateQueues();
  // }

  // if (config.worker.scheduler.enabled) {
  logger.worker.info("upserting schedulers...");
  await upsertSchedulers(tasks);
  // }

  logger.worker.info("spawning workers...");
  await spawnWorkers(tasks);
};

run().catch((e) => {
  logger.worker.error(e);
  process.exit(1);
});

export const closeWorkers = async () => {
  for (const worker of workers) {
    await worker.close();
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.worker.info(`received ${signal}, closing server...`);
  await closeQueues();
  await closeWorkers();
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
