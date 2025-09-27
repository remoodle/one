import { User } from "./entity/User";
import { Event } from "./entity/Event";
import { Reminder } from "./entity/Reminder";
import { MongoDataSource } from "./data-source";

export const createMongo = () => {
  return {
    mongoDataSource: MongoDataSource,
    User,
    Event,
    Reminder,
  };
};
