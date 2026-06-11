import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { JobPlatform } from './jobs.types';

const PLATFORMS: JobPlatform[] = ['google_maps', 'yandex_maps', 'gis'];

export class CreateJobDto {
  @IsIn(PLATFORMS)
  platform: JobPlatform;

  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  extractContacts?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

export class SubmitJobResultsDto {
  @IsArray()
  data: Record<string, unknown>[];

  @IsOptional()
  @IsInt()
  results?: number;
}

export class JobErrorDto {
  @IsString()
  error: string;
}
