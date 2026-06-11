import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { ServiceNotFoundException } from '@/common';

import { JobsService } from './jobs.service';
import { CreateJobDto, JobErrorDto, SubmitJobResultsDto } from './jobs.dto';

@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}

  /** Create a collection job (called by the MCP server). */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() body: CreateJobDto) {
    return this.jobs.create(body);
  }

  /** Claim the next pending job (polled by the extension running in Chrome). */
  @HttpCode(HttpStatus.OK)
  @Get('next')
  next() {
    return this.jobs.claimNext();
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  list() {
    return this.jobs.list();
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  get(@Param('id') id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new ServiceNotFoundException('job not found');
    return job;
  }

  /** Submit collected results (called by the extension when a job completes). */
  @HttpCode(HttpStatus.OK)
  @Post(':id/results')
  submit(@Param('id') id: string, @Body() body: SubmitJobResultsDto) {
    const job = this.jobs.submit(id, body.data, body.results);
    if (!job) throw new ServiceNotFoundException('job not found');
    return job;
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/error')
  fail(@Param('id') id: string, @Body() body: JobErrorDto) {
    const job = this.jobs.fail(id, body.error);
    if (!job) throw new ServiceNotFoundException('job not found');
    return job;
  }
}
