import event from "./models/Event";
import reminder from "./models/Reminder";
import user from "./models/User";
import { createMongoDBConnection } from "./connection";

export const createMongo = (mongoURI: string) => {
  createMongoDBConnection(mongoURI);

  return {
    event,
    reminder,
    user,
  };
};
