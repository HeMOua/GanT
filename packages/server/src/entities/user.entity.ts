import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TaskAssignee } from './task-assignee.entity';
import { ProjectMember } from './project-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column()
  password: string; // bcrypt hashed

  @Column({ length: 100, nullable: true })
  display_name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 'USER' })
  role: string; // ADMIN | USER

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TaskAssignee, (ta) => ta.user)
  taskAssignments: TaskAssignee[];

  @OneToMany(() => ProjectMember, (pm) => pm.user)
  projects: ProjectMember[];
}
