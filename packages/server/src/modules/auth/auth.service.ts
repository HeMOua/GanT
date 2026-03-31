import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(username: string, password: string, displayName?: string, inviteCode?: string) {
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userService.create({
      username,
      password: hashed,
      display_name: displayName || username,
    }, inviteCode);
    return this.generateToken(user);
  }

  async login(username: string, password: string) {
    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return this.generateToken(user);
  }

  private generateToken(user: { id: number; username: string; role: string }) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
