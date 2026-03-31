import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_dependencies')
export class TaskDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  task_id: number;

  @Column()
  depends_on_task_id: number;

  @Column({ default: 'FS' })
  type: string; // FS | SS | FF

  @Column({ default: 0 })
  lag: number;

  // ─── Relations ────────────────────────────────────────

  @ManyToOne(() => Task, (task) => task.dependencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'depends_on_task_id' })
  dependsOnTask: Task;
}
