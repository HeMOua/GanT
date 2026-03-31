import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { TaskDependency } from './task-dependency.entity';
import { TaskAssignee } from './task-assignee.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column({ nullable: true })
  parent_id: number | null;

  @Column({ length: 300 })
  name: string;

  @Column({ type: 'date' })
  start_time: string;

  @Column({ type: 'date' })
  end_time: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 'NOT_STARTED' })
  status: string; // NOT_STARTED | IN_PROGRESS | DONE | BLOCKED

  @Column({ default: false })
  is_milestone: boolean;

  @Column({ default: false })
  is_critical: boolean;

  @Column({ nullable: true })
  color: string;

  @Column({ default: 0 })
  order: number;

  @Column({ type: 'date', nullable: true })
  actual_start_time: string;

  @Column({ type: 'date', nullable: true })
  actual_end_time: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ─── Relations ────────────────────────────────────────

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Task, (task) => task.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Task;

  @OneToMany(() => Task, (task) => task.parent)
  children: Task[];

  @OneToMany(() => TaskDependency, (dep) => dep.task, { cascade: true })
  dependencies: TaskDependency[];

  @OneToMany(() => TaskAssignee, (assignee) => assignee.task, { cascade: true })
  assignees: TaskAssignee[];
}
