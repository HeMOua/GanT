import { ParseIntPipe, Module, Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, BadRequestException, NotFoundException, Injectable } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Entity, PrimaryGeneratedColumn, Column, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Entity('journeys')
class JourneyRow {
  @PrimaryGeneratedColumn() id: number;
  @Column() owner: number;
  @Column('simple-json') data: Record<string, any>;
}
@Injectable()
export class JourneyService {
  constructor(@InjectRepository(JourneyRow) private repo: Repository<JourneyRow>) {}
  async all(owner: number) { return (await this.repo.findBy({ owner })).map(r => ({ ...r.data, id: r.id })); }
  async save(owner: number, id: number | null, data: any) {
    const records = await this.all(owner);
    if (id && !records.some(r => r.id === id)) throw new NotFoundException();
    validate(data, records, id);
    const { id: ignored, ...clean } = data;
    const row = await this.repo.save(this.repo.create({ ...(id ? { id } : {}), owner, data: clean }));
    return { ...row.data, id: row.id };
  }
  async remove(owner: number, id: number) {
    const records = await this.all(owner);
    if (records.some((r: any) => r.parent_id === id)) throw new BadRequestException('请先删除这段参与经历下的工作和节点');
    await this.repo.delete({ owner, id });
  }
}
export function validate(v: any, records: any[], id: number | null) {
  const fail = (s: string) => { throw new BadRequestException(s); };
  for (const key of ['title', 'project_name', 'person', 'role', 'start', 'end', 'cutoff', 'tags', 'notes']) {
    if (typeof v[key] !== 'string' || v[key].length > (key === 'notes' ? 10000 : 500)) fail('请检查填写内容');
  }
  if (!v.title.trim() || !v.project_name.trim() || !v.person.trim()) fail('请填写项目、人员和名称');
  if (!['participation','work','milestone'].includes(v.kind) || !['following','cutoff','ended'].includes(v.tracking) || typeof v.is_self !== 'boolean' || typeof v.approximate !== 'boolean') fail('记录类型或状态无效');
  const validDate = (s: string) => /^\d{4}-\d{2}(-\d{2})?$/.test(s) && Number(s.slice(5,7)) >= 1 && Number(s.slice(5,7)) <= 12 && (s.length === 7 || (Number(s.slice(8)) >= 1 && Number.isFinite(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0,10) === s));
  if (!validDate(v.start) || (v.end && !validDate(v.end)) || (v.cutoff && !validDate(v.cutoff))) fail('日期请填写 YYYY-MM 或 YYYY-MM-DD');
  if ((v.end && v.end.slice(0,7) < v.start.slice(0,7)) || (v.end.length === 10 && v.start.length === 10 && v.end < v.start) || (v.cutoff && (v.cutoff.slice(0,7) < v.start.slice(0,7) || (v.cutoff.length === 10 && v.start.length === 10 && v.cutoff < v.start)))) fail('结束或截止时间不能早于开始时间');
  if (v.kind !== 'milestone' && ((v.tracking === 'ended') !== !!v.end || (v.tracking === 'cutoff') !== !!v.cutoff)) fail('请填写对应的结束或记录截止时间');
  if (v.kind === 'participation') {
    if (v.parent_id !== null) fail('参与经历不能有上级');
    if (id !== null && records.some(r => r.parent_id === id && (r.project_name !== v.project_name || r.person !== v.person || r.is_self !== v.is_self))) fail('已有工作记录，请保持项目和人员一致');
  } else {
    const p = records.find(r => r.id === v.parent_id && r.kind === 'participation');
    if (!p || p.project_name !== v.project_name || p.person !== v.person || p.is_self !== v.is_self) fail('请选择对应的项目参与经历');
  }
}
@Controller('journeys')
@UseGuards(JwtAuthGuard)
class JourneyController {
  constructor(private service: JourneyService) {}
  @Get() all(@Req() r: any) { return this.service.all(r.user.id); }
  @Post() create(@Req() r: any, @Body() v: any) { return this.service.save(r.user.id, null, v); }
  @Patch(':id') update(@Req() r: any, @Param('id', ParseIntPipe) id: number, @Body() v: any) { return this.service.save(r.user.id, Number(id), v); }
  @Delete(':id') remove(@Req() r: any, @Param('id', ParseIntPipe) id: number) { return this.service.remove(r.user.id, Number(id)); }
}
@Module({ imports: [TypeOrmModule.forFeature([JourneyRow])], controllers: [JourneyController], providers: [JourneyService] })
export class JourneyModule {}
