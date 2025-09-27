import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "int", unique: true })
  moodleId!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "timestamp" })
  timestart!: Date;

  @Column({ type: "int", default: 0 })
  timeduration!: number;

  @Column({ type: "int" })
  courseId!: number;

  @Column({ type: "varchar" })
  courseName!: string;

  @Column({ type: "varchar", nullable: true })
  courseShortname?: string;

  @Column({ type: "int", nullable: true })
  categoryId?: number;

  @Column({ type: "varchar", nullable: true })
  categoryName?: string;

  @Column({ type: "varchar" })
  eventtype!: string;

  @Column({ type: "boolean", default: true })
  visible!: boolean;

  @Column({ type: "timestamp" })
  timemodified!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
