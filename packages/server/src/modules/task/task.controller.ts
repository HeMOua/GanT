import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto, CreateDependencyDto, CreateAssigneeDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  /** 获取项目所有任务（含层级、依赖、分配） */
  @Get('projects/:projectId/tasks')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.taskService.findByProject(projectId);
  }

  /** 创建任务 */
  @Post('projects/:projectId/tasks')
  create(
    @Req() req: any,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateTaskDto,
  ) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.taskService.create(projectId, dto);
  }

  /** 更新任务 */
  @Patch('tasks/:id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(id, dto, req.user);
  }

  /** 删除任务 */
  @Delete('tasks/:id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.taskService.remove(id);
  }

  // ─── 依赖 ─────────────────────────────────────────────

  @Post('tasks/:id/dependencies')
  addDependency(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDependencyDto,
  ) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.taskService.addDependency(id, dto);
  }

  @Delete('tasks/:taskId/dependencies/:depId')
  removeDependency(@Req() req: any, @Param('depId', ParseIntPipe) depId: number) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.taskService.removeDependency(depId);
  }

  // ─── 人员分配 ─────────────────────────────────────────

  @Post('tasks/:id/assignees')
  addAssignee(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAssigneeDto,
  ) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.taskService.addAssignee(id, dto);
  }

  @Delete('tasks/:taskId/assignees/:assigneeId')
  removeAssignee(@Req() req: any, @Param('assigneeId', ParseIntPipe) assigneeId: number) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.taskService.removeAssignee(assigneeId);
  }
}
