import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { TaskDependency } from '../../entities/task-dependency.entity';
import { TaskAssignee } from '../../entities/task-assignee.entity';
import { CreateTaskDto, UpdateTaskDto, CreateDependencyDto, CreateAssigneeDto } from './dto/task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskDependency)
    private readonly depRepo: Repository<TaskDependency>,
    @InjectRepository(TaskAssignee)
    private readonly assigneeRepo: Repository<TaskAssignee>,
  ) {}

  /**
   * 获取项目的全部任务（含依赖和分配人员信息）
   * 返回格式适配前端 GanttTask 接口
   */
  async findByProject(projectId: number) {
    const tasks = await this.taskRepo.find({
      where: { project_id: projectId },
      relations: ['dependencies', 'dependencies.dependsOnTask', 'assignees', 'assignees.user'],
      order: { order: 'ASC', id: 'ASC' },
    });

    // 转化为前端 GanttTask 格式
    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start_time: task.start_time,
      end_time: task.end_time,
      parent_id: task.parent_id,
      progress: task.progress,
      status: task.status,
      is_milestone: task.is_milestone,
      is_critical: task.is_critical,
      color: task.color,
      order: task.order,
      actual_start_time: task.actual_start_time,
      actual_end_time: task.actual_end_time,
      dependencies: task.dependencies?.map((d) => ({
        task_id: d.depends_on_task_id,
        type: d.type,
        lag: d.lag,
        _dep_id: d.id, // 前端可用来删除
      })),
      assignees: task.assignees?.map((a) => ({
        _assignee_id: a.id,
        name: a.user?.display_name || a.user?.username || '',
        user_id: a.user_id,
        role: a.role,
        from: a.from_date,
        to: a.to_date,
      })),
    }));
  }

  async create(projectId: number, dto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepo.create({
      ...dto,
      project_id: projectId,
    });
    return this.taskRepo.save(task);
  }

  async update(id: number, dto: UpdateTaskDto, user: any): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id }, relations: ['assignees'] });
    if (!task) throw new NotFoundException('任务不存在');

    if (user.role !== 'ADMIN') {
      const isAssignee = task.assignees.some(a => a.user_id === user.id);
      if (!isAssignee) {
        throw new ForbiddenException('只有项目管理员或此任务负责人可修改任务');
      }
      
      // 普通人员只能提交进度和状态的更新
      const restrictedDto: UpdateTaskDto = {};
      if (dto.progress !== undefined) restrictedDto.progress = dto.progress;
      if (dto.status !== undefined) restrictedDto.status = dto.status;
      if (dto.actual_start_time !== undefined) restrictedDto.actual_start_time = dto.actual_start_time;
      if (dto.actual_end_time !== undefined) restrictedDto.actual_end_time = dto.actual_end_time;
      
      Object.assign(task, restrictedDto);
    } else {
      Object.assign(task, dto);
    }
    
    return this.taskRepo.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');
    await this.taskRepo.remove(task);
  }

  // ─── 依赖管理 ─────────────────────────────────────────

  async addDependency(taskId: number, dto: CreateDependencyDto): Promise<TaskDependency> {
    const dep = this.depRepo.create({
      task_id: taskId,
      depends_on_task_id: dto.depends_on_task_id,
      type: dto.type,
      lag: dto.lag ?? 0,
    });
    return this.depRepo.save(dep);
  }

  async removeDependency(depId: number): Promise<void> {
    const dep = await this.depRepo.findOne({ where: { id: depId } });
    if (!dep) throw new NotFoundException('依赖关系不存在');
    await this.depRepo.remove(dep);
  }

  // ─── 人员分配 ─────────────────────────────────────────

  async addAssignee(taskId: number, dto: CreateAssigneeDto): Promise<TaskAssignee> {
    const assignee = this.assigneeRepo.create({
      task_id: taskId,
      user_id: dto.user_id,
      role: dto.role,
      from_date: dto.from_date,
      to_date: dto.to_date,
    });
    return this.assigneeRepo.save(assignee);
  }

  async removeAssignee(assigneeId: number): Promise<void> {
    const assignee = await this.assigneeRepo.findOne({ where: { id: assigneeId } });
    if (!assignee) throw new NotFoundException('分配关系不存在');
    await this.assigneeRepo.remove(assignee);
  }
}
