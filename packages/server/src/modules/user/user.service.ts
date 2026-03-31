import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(data: Partial<User>, inviteCode?: string): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { username: data.username } });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }
    
    let role = 'USER';
    const count = await this.userRepo.count();
    const expectedInviteCode = process.env.ADMIN_INVITE_CODE || 'GANT-ADMIN-2026';
    
    if (count === 0 || inviteCode === expectedInviteCode) {
      role = 'ADMIN';
    }

    const user = this.userRepo.create({
      ...data,
      role
    });
    return this.userRepo.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      order: { created_at: 'DESC' },
      select: ['id', 'username', 'display_name', 'avatar', 'role', 'created_at'] // omit password
    });
  }

  async updateRole(id: number, role: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    user.role = role;
    return this.userRepo.save(user);
  }
}
