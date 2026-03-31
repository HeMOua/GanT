import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

/** 项目-成员 关联表（项目级别的成员管理） */
@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @Column()
  user_id: number;

  @Column({ default: 'MEMBER' })
  role: string; // OWNER | ADMIN | MEMBER

  @ManyToOne(() => Project, (p) => p.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (u) => u.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
