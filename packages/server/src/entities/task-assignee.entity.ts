import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_assignees')
export class TaskAssignee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  task_id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  role: string; // 此任务中的角色

  @Column({ type: 'date', nullable: true })
  from_date: string;

  @Column({ type: 'date', nullable: true })
  to_date: string;

  // ─── Relations ────────────────────────────────────────

  @ManyToOne(() => Task, (task) => task.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, (u) => u.taskAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
