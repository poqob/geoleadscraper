import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { Logger } from '@/modules/logger';
import { CreateJobInput, Job } from './jobs.types';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 10000;
// Jobs older than this are pruned to keep the in-memory store bounded.
const JOB_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class JobsService {
  private jobs = new Map<string, Job>();

  constructor(private logger: Logger) {}

  create(input: CreateJobInput): Job {
    this.prune();

    const now = Date.now();
    const job: Job = {
      id: randomUUID(),
      platform: input.platform,
      query: input.query?.trim() || '',
      url: input.url?.trim() || undefined,
      limit: Math.min(Math.max(1, input.limit || DEFAULT_LIMIT), MAX_LIMIT),
      extractContacts: !!input.extractContacts,
      fields: input.fields,
      status: 'pending',
      results: 0,
      data: [],
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.id, job);
    this.logger.log(`job created: ${job.id} (${job.platform}: "${job.query}")`);
    return job;
  }

  /** Atomically claim the oldest pending job (called by the extension poller). */
  claimNext(): Job | null {
    const pending = [...this.jobs.values()]
      .filter((j) => j.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt);

    const job = pending[0];
    if (!job) return null;

    job.status = 'running';
    job.updatedAt = Date.now();
    this.logger.log(`job claimed: ${job.id}`);
    return job;
  }

  submit(id: string, data: Record<string, unknown>[], results?: number): Job | null {
    const job = this.jobs.get(id);
    if (!job) return null;

    job.data = Array.isArray(data) ? data : [];
    job.results = typeof results === 'number' ? results : job.data.length;
    job.status = 'done';
    job.updatedAt = Date.now();
    this.logger.log(`job done: ${job.id} (${job.results} results)`);
    return job;
  }

  fail(id: string, error: string): Job | null {
    const job = this.jobs.get(id);
    if (!job) return null;

    job.status = 'error';
    job.error = error;
    job.updatedAt = Date.now();
    this.logger.error(`job error: ${job.id} — ${error}`);
    return job;
  }

  get(id: string): Job | null {
    return this.jobs.get(id) || null;
  }

  list(): Job[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  private prune() {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs) {
      if (job.updatedAt < cutoff) this.jobs.delete(id);
    }
  }
}
