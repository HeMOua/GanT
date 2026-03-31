import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as bcrypt from 'bcrypt';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Req() req: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.userService.findAll();
  }

  @Post()
  async create(@Req() req: any, @Body() dto: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    const defaultPassword = dto.password || '123456';
    const hashed = await bcrypt.hash(defaultPassword, 10);
    return this.userService.create({
      username: dto.username,
      password: hashed,
      display_name: dto.display_name,
      role: dto.role || 'USER'
    });
  }

  @Patch(':id/role')
  async updateRole(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body('role') role: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.userService.updateRole(id, role);
  }
}
