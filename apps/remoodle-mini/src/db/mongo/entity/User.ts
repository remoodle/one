// import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

// @Entity()
// export class User {
//   @ObjectIdColumn()
//   id: ObjectId;

//   @Column()
//   moodleId: string;

//   @Column()
//   telegramId: string;
// }

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from "typeorm";

export const DEFAULT_THRESHOLDS = ["PT3H", "PT6H", "P1D"];

export enum NotificationLevel {
  OFF = 0,
  ON = 1,
  MANDATORY = 2,
}

export class NotificationSettings {
  @Column({
    type: "enum",
    enum: NotificationLevel,
    default: NotificationLevel.OFF,
  })
  deadlineReminders_telegram!: NotificationLevel;

  @Column({
    type: "enum",
    enum: NotificationLevel,
    default: NotificationLevel.ON,
  })
  gradeUpdates_telegram!: NotificationLevel;

  @Column({
    type: "enum",
    enum: NotificationLevel,
    default: NotificationLevel.ON,
  })
  courseChanges_telegram!: NotificationLevel;
}

export class DeadlineReminders {
  @Column("text", { array: true, default: DEFAULT_THRESHOLDS })
  thresholds!: string[];
}

@Entity()
@Unique(["moodleToken", "telegramId"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: false })
  name!: string;

  @Column({ type: "int", unique: true })
  moodleId!: number;

  @Column({ type: "varchar", unique: true })
  moodleToken!: string;

  @Column({ type: "bigint", unique: true })
  telegramId!: number | null;

  @Column(() => NotificationSettings, { prefix: "notifications" })
  notifications!: NotificationSettings;

  @Column(() => DeadlineReminders, { prefix: "deadline_reminders" })
  deadlineReminders!: DeadlineReminders;
}
