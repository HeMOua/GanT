import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { Task } from '../../entities/task.entity';
import { TaskDependency } from '../../entities/task-dependency.entity';
import { TaskAssignee } from '../../entities/task-assignee.entity';
import { User } from '../../entities/user.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      Task,
      TaskDependency,
      TaskAssignee,
      User,
    ]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
