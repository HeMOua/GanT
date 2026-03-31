import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    // ─── 数据库配置 ───────────────────────────────────────
    // 使用 better-sqlite3 驱动，后续切换 PostgreSQL 只需改这里
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/gant.db',
      autoLoadEntities: true,
      synchronize: true, // 开发环境自动同步，生产环境应使用 migrations
    }),

    // ─── 业务模块 ─────────────────────────────────────────
    AuthModule,
    UserModule,
    ProjectModule,
    TaskModule,
  ],
})
export class AppModule {}
