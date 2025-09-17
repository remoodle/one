import { createRedisConnection } from "./connection";

export const createRedis = (redisURI: string) => {
  const redisConnection = createRedisConnection(redisURI);

  return {
    redisConnection,
  };
};
