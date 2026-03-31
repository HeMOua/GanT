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
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(@Req() req: any) {
    const projects = await this.projectService.findAll(req.user);
    // 附带统计信息
    const result = await Promise.all(
      projects.map(async (p) => {
        const stats = await this.projectService.getStats(p.id);
        return { ...p, ...stats };
      }),
    );
    return result;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.findOne(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('只有管理员可以创建项目');
    return this.projectService.create(dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('只有管理员可以编辑项目');
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('只有管理员可以删除项目');
    return this.projectService.remove(id);
  }

  @Post(':id/seed')
  seed(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('只有管理员可以填充演示数据');
    return this.projectService.seed(id);
  }
}
