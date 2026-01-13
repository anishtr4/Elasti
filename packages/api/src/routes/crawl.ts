import { Router } from 'express';
import { addCrawlJob, getJobStatus } from '../workers/crawl-worker.js';

export const crawlRouter = Router();

crawlRouter.post('/', async (req, res) => {
    try {
        const { projectId, url, maxPages } = req.body;

        if (!projectId || !url) {
            return res.status(400).json({ error: 'projectId and url are required' });
        }

        const jobId = await addCrawlJob({
            projectId,
            url,
            maxPages: maxPages || 50,
        });

        res.status(202).json({
            message: 'Crawl job started',
            jobId,
        });
    } catch (error) {
        console.error('Crawl error:', error);
        res.status(500).json({ error: 'Failed to start crawl job' });
    }
});

crawlRouter.get('/status/:jobId', async (req, res) => {
    try {
        const status = await getJobStatus(req.params.jobId);
        res.json(status);
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});
