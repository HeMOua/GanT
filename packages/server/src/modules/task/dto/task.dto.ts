import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @IsString()
  name: string;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parent_id?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  progress?: number;

  @IsString()
  @IsOptional()
  @IsIn(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED'])
  status?: string;

  @IsBoolean()
  @IsOptional()
  is_milestone?: boolean;

  @IsBoolean()
  @IsOptional()
  is_critical?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  order?: number;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  start_time?: string;

  @IsDateString()
  @IsOptional()
  end_time?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parent_id?: number | null;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  progress?: number;

  @IsString()
  @IsOptional()
  @IsIn(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED'])
  status?: string;

  @IsBoolean()
  @IsOptional()
  is_milestone?: boolean;

  @IsBoolean()
  @IsOptional()
  is_critical?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  order?: number;

  @IsDateString()
  @IsOptional()
  actual_start_time?: string | null;

  @IsDateString()
  @IsOptional()
  actual_end_time?: string | null;
}

export class CreateDependencyDto {
  @IsInt()
  @Type(() => Number)
  depends_on_task_id: number;

  @IsString()
  @IsIn(['FS', 'SS', 'FF'])
  type: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  lag?: number;
}

export class CreateAssigneeDto {
  @IsInt()
  @Type(() => Number)
  user_id: number;

  @IsString()
  @IsOptional()
  role?: string;

  @IsDateString()
  @IsOptional()
  from_date?: string;

  @IsDateString()
  @IsOptional()
  to_date?: string;
}
