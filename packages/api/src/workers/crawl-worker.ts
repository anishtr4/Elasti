import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { crawlWebsite } from '../services/crawler.js';
import { ProjectStore } from '../services/project-store.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let crawlQueue: Queue;
let connection: IORedis;

export interface CrawlJobData {
    projectId: string;
    url: string;
    maxPages?: number;
}

export interface CrawlJobResult {
    pagesProcessed: number;
    chunksCreated: number;
    errors: string[];
}

export function getQueue(): Queue {
    return crawlQueue;
}

export async function addCrawlJob(data: CrawlJobData): Promise<string> {
    const job = await crawlQueue.add('crawl', data, {
        removeOnComplete: 100,
        removeOnFail: 50,
    });
    return job.id!;
}

export async function getJobStatus(jobId: string): Promise<{
    status: string;
    progress?: number;
    result?: CrawlJobResult;
    failedReason?: string;
}> {
    const job = await Job.fromId(crawlQueue, jobId);

    if (!job) {
        return { status: 'not_found' };
    }

    const state = await job.getState();

    return {
        status: state,
        progress: job.progress as number,
        result: job.returnvalue as CrawlJobResult,
        failedReason: job.failedReason,
    };
}

export async function initializeWorker(): Promise<void> {
    connection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
    });

    crawlQueue = new Queue('crawl', { connection });

    const worker = new Worker(
        'crawl',
        async (job: Job<CrawlJobData>) => {
            console.log(`Starting crawl job ${job.id} for ${job.data.url}`);

            const result = await crawlWebsite(
                job.data.projectId,
                job.data.url,
                job.data.maxPages || 50
            );

            // Persist the crawl timestamp
            await ProjectStore.update(job.data.projectId, {
                lastCrawledAt: new Date()
            });

            console.log(`Completed crawl job ${job.id}: ${result.pagesProcessed} pages, ${result.chunksCreated} chunks`);

            return result;
        },
        {
            connection,
            concurrency: 1,
        }
    );

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed:`, err);
    });
}
