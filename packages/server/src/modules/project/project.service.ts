import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { Task } from '../../entities/task.entity';
import { TaskDependency } from '../../entities/task-dependency.entity';
import { TaskAssignee } from '../../entities/task-assignee.entity';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskDependency)
    private readonly depRepo: Repository<TaskDependency>,
    @InjectRepository(TaskAssignee)
    private readonly assigneeRepo: Repository<TaskAssignee>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(user?: any): Promise<Project[]> {
    if (user && user.role !== 'ADMIN') {
      // Find projects where user is assigned at least one task
      const assignedTaskIds = await this.assigneeRepo.find({
        where: { user_id: user.id },
        select: ['task_id'],
      });
      const ids = assignedTaskIds.map(a => a.task_id);
      
      if (ids.length === 0) {
        return [];
      }
      
      const tasks = await this.taskRepo.find({
        where: { id: { $in: ids } as any }, // We'll use In from typeorm
        select: ['project_id'],
      });
      const projectIds = [...new Set(tasks.map(t => t.project_id))];
      if (projectIds.length === 0) return [];
      
      // We must import In from 'typeorm' at the top, let's just use QueryBuilder
      return this.projectRepo.createQueryBuilder('project')
        .where('project.id IN (:...projectIds)', { projectIds })
        .orderBy('project.updated_at', 'DESC')
        .getMany();
    }
    return this.projectRepo.find({ order: { updated_at: 'DESC' } });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create(dto);
    return this.projectRepo.save(project);
  }

  async update(id: number, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepo.remove(project);
  }

  /** 获取项目统计信息（任务数、完成数等） */
  async getStats(id: number) {
    const totalTasks = await this.taskRepo.count({ where: { project_id: id } });
    const doneTasks = await this.taskRepo.count({ where: { project_id: id, status: 'DONE' } });
    const inProgressTasks = await this.taskRepo.count({ where: { project_id: id, status: 'IN_PROGRESS' } });
    return { totalTasks, doneTasks, inProgressTasks };
  }

  /** 填充演示数据 */
  async seed(projectId: number): Promise<{ message: string }> {
    const project = await this.findOne(projectId);

    // 确保有成员
    let users = await this.userRepo.find();
    
    // 如果只有之前我们改库的 sysAdmin 和 chenchao，为了保持原甘特图图谱丰富性，我们顺便插入演示开发人员
    const neededNames = ['张伟', '李娜', '王强', '赵敏', '刘洋', '周杰', '孙丽'];
    const existNames = users.map(u => u.display_name || u.username);
    
    const missingNames = neededNames.filter(n => !existNames.includes(n));
    if (missingNames.length > 0) {
      const hashed = await bcrypt.hash('123456', 10);
      const newUsersData = missingNames.map(name => ({
        username: 'user_' + Math.random().toString(36).substring(2, 7),
        password: hashed,
        display_name: name,
        role: 'USER'
      }));
      await this.userRepo.save(newUsersData.map(u => this.userRepo.create(u)));
      users = await this.userRepo.find();
    }

    const memberMap = new Map(users.map((m) => [m.display_name || m.username, m.id]));

    // 清除已有任务
    await this.taskRepo.delete({ project_id: projectId });

    // 创建任务 — 映射 oldId -> newId
    const idMap = new Map<number, number>();

    const tasksData = [
      { oldId: 1, name: '智能管理系统 v2.0', start: '2026-04-01', end: '2026-05-20', parentOldId: null, progress: 35, status: 'IN_PROGRESS', order: 1 },
      { oldId: 10, name: '需求分析', start: '2026-04-01', end: '2026-04-10', parentOldId: 1, progress: 100, status: 'DONE', order: 1 },
      { oldId: 101, name: '用户调研', start: '2026-04-01', end: '2026-04-04', parentOldId: 10, progress: 100, status: 'DONE', order: 1 },
      { oldId: 102, name: '需求文档编写', start: '2026-04-04', end: '2026-04-08', parentOldId: 10, progress: 100, status: 'DONE', order: 2 },
      { oldId: 103, name: '需求评审会议', start: '2026-04-09', end: '2026-04-09', parentOldId: 10, progress: 100, status: 'DONE', order: 3, isMilestone: true, color: '#E6A23C' },
      { oldId: 20, name: 'UI/UX 设计', start: '2026-04-10', end: '2026-04-20', parentOldId: 1, progress: 80, status: 'IN_PROGRESS', order: 2 },
      { oldId: 201, name: '原型设计', start: '2026-04-10', end: '2026-04-14', parentOldId: 20, progress: 100, status: 'DONE', order: 1 },
      { oldId: 202, name: '视觉设计', start: '2026-04-14', end: '2026-04-18', parentOldId: 20, progress: 70, status: 'IN_PROGRESS', order: 2, isCritical: true, actualStart: '2026-04-15', actualEnd: '2026-04-20' },
      { oldId: 203, name: '设计评审', start: '2026-04-20', end: '2026-04-20', parentOldId: 20, progress: 0, status: 'NOT_STARTED', order: 3, isMilestone: true },
      { oldId: 30, name: '前后端开发', start: '2026-04-21', end: '2026-05-10', parentOldId: 1, progress: 15, status: 'IN_PROGRESS', order: 3 },
      { oldId: 301, name: '后端 API 开发', start: '2026-04-21', end: '2026-05-02', parentOldId: 30, progress: 30, status: 'IN_PROGRESS', order: 1, isCritical: true },
      { oldId: 302, name: '前端页面开发', start: '2026-04-21', end: '2026-05-05', parentOldId: 30, progress: 20, status: 'IN_PROGRESS', order: 2 },
      { oldId: 303, name: '数据库设计', start: '2026-04-21', end: '2026-04-25', parentOldId: 30, progress: 100, status: 'DONE', order: 3, color: '#67C23A' },
      { oldId: 304, name: '前后端联调', start: '2026-05-05', end: '2026-05-10', parentOldId: 30, progress: 0, status: 'NOT_STARTED', order: 4, isCritical: true },
      { oldId: 40, name: '测试 & QA', start: '2026-05-10', end: '2026-05-18', parentOldId: 1, progress: 0, status: 'NOT_STARTED', order: 4 },
      { oldId: 401, name: '单元测试', start: '2026-05-10', end: '2026-05-13', parentOldId: 40, progress: 0, status: 'NOT_STARTED', order: 1 },
      { oldId: 402, name: '集成测试', start: '2026-05-13', end: '2026-05-16', parentOldId: 40, progress: 0, status: 'NOT_STARTED', order: 2 },
      { oldId: 403, name: 'Bug 修复', start: '2026-05-16', end: '2026-05-18', parentOldId: 40, progress: 0, status: 'BLOCKED', order: 3, color: '#F56C6C' },
      { oldId: 50, name: '🚀 正式上线', start: '2026-05-20', end: '2026-05-20', parentOldId: 1, progress: 0, status: 'NOT_STARTED', order: 5, isMilestone: true, isCritical: true, color: '#E6394A' },
    ];

    // 第一遍：创建所有任务（不带 parent_id）
    for (const t of tasksData) {
      const task = this.taskRepo.create({
        project_id: projectId,
        parent_id: null,
        name: t.name,
        start_time: t.start,
        end_time: t.end,
        progress: t.progress,
        status: t.status,
        order: t.order,
        is_milestone: (t as any).isMilestone || false,
        is_critical: (t as any).isCritical || false,
        color: (t as any).color || undefined,
        actual_start_time: (t as any).actualStart || undefined,
        actual_end_time: (t as any).actualEnd || undefined,
      });
      const saved = await this.taskRepo.save(task);
      idMap.set(t.oldId, saved.id);
    }

    // 第二遍：更新 parent_id
    for (const t of tasksData) {
      if (t.parentOldId !== null) {
        const newId = idMap.get(t.oldId)!;
        const newParentId = idMap.get(t.parentOldId)!;
        await this.taskRepo.update(newId, { parent_id: newParentId });
      }
    }

    // 依赖关系
    const depsData = [
      { taskOld: 102, depOld: 101, type: 'FS', lag: 0 },
      { taskOld: 103, depOld: 102, type: 'FS', lag: 1 },
      { taskOld: 201, depOld: 103, type: 'FS', lag: 0 },
      { taskOld: 202, depOld: 201, type: 'FS', lag: 0 },
      { taskOld: 203, depOld: 202, type: 'FS', lag: 0 },
      { taskOld: 301, depOld: 203, type: 'FS', lag: 0 },
      { taskOld: 302, depOld: 203, type: 'FS', lag: 0 },
      { taskOld: 302, depOld: 301, type: 'SS', lag: 0 },
      { taskOld: 303, depOld: 203, type: 'FS', lag: 0 },
      { taskOld: 304, depOld: 301, type: 'FF', lag: 0 },
      { taskOld: 304, depOld: 302, type: 'FS', lag: 0 },
      { taskOld: 401, depOld: 304, type: 'FS', lag: 0 },
      { taskOld: 402, depOld: 401, type: 'FS', lag: 0 },
      { taskOld: 403, depOld: 402, type: 'FS', lag: 0 },
      { taskOld: 50, depOld: 403, type: 'FS', lag: 2 },
    ];
    for (const d of depsData) {
      const dep = this.depRepo.create({
        task_id: idMap.get(d.taskOld)!,
        depends_on_task_id: idMap.get(d.depOld)!,
        type: d.type,
        lag: d.lag,
      });
      await this.depRepo.save(dep);
    }

    // 人员分配
    const assignData: { taskOld: number; memberName: string; role?: string; from?: string; to?: string }[] = [
      { taskOld: 101, memberName: '张伟' },
      { taskOld: 102, memberName: '李娜', role: '主笔' },
      { taskOld: 102, memberName: '张伟', role: '协助' },
      { taskOld: 103, memberName: '王强' },
      { taskOld: 201, memberName: '赵敏' },
      { taskOld: 202, memberName: '赵敏', role: '主设计', from: '2026-04-14', to: '2026-04-16' },
      { taskOld: 202, memberName: '周杰', role: '接手完成', from: '2026-04-16', to: '2026-04-18' },
      { taskOld: 301, memberName: '陈超', role: '开发' },
      { taskOld: 301, memberName: '刘洋', role: 'DBA' },
      { taskOld: 302, memberName: '张伟', role: '页面开发' },
      { taskOld: 302, memberName: '赵敏', role: '样式实现' },
      { taskOld: 302, memberName: '周杰', role: '组件开发' },
      { taskOld: 303, memberName: '刘洋' },
      { taskOld: 304, memberName: '陈超', role: '后端' },
      { taskOld: 304, memberName: '张伟', role: '前端' },
      { taskOld: 401, memberName: '孙丽' },
      { taskOld: 402, memberName: '孙丽' },
      { taskOld: 403, memberName: '陈超', role: '后端Bug', from: '2026-05-16', to: '2026-05-17' },
      { taskOld: 403, memberName: '张伟', role: '前端Bug', from: '2026-05-17', to: '2026-05-18' },
    ];
    for (const a of assignData) {
      const memberId = memberMap.get(a.memberName);
      if (memberId) {
        const assignee = this.assigneeRepo.create({
          task_id: idMap.get(a.taskOld)!,
          user_id: memberId,
          role: a.role || undefined,
          from_date: a.from || undefined,
          to_date: a.to || undefined,
        });
        await this.assigneeRepo.save(assignee);
      }
    }

    // 更新项目时间范围
    await this.projectRepo.update(projectId, {
      start_date: '2026-04-01',
      end_date: '2026-05-20',
    });

    return { message: `已为项目「${project.name}」填充 ${tasksData.length} 个任务` };
  }
}
