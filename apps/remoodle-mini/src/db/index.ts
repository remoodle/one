import { createMongo } from "./mongo";
import { createRedis } from "./redis";
import { config } from "../config";

const redis = createRedis(config.redis.uri);
const mongo = createMongo(config.mongo.uri);

export const db = {
  ...redis,
  ...mongo,
};
