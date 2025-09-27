import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Event } from "./entity/Event";
import { Reminder } from "./entity/Reminder";

export const MongoDataSource = new DataSource({
  type: "mongodb",
  database: "remoodle-mini",
  synchronize: true,
  logging: false,
  entities: [User, Event, Reminder],
  migrations: [],
  subscribers: [],
});
