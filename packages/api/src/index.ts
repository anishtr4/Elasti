import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { projectsRouter } from './routes/projects.js';
import { crawlRouter } from './routes/crawl.js';
import { initializeOpenSearch } from './services/storage/opensearch.js';
import { initializeWorker } from './workers/crawl-worker.js';
import { Scheduler } from './services/crawling/scheduler.js';

dotenv.config();

// __dirname is available in CommonJS
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve widget.js from the widget package dist folder
app.use('/widget.js', express.static(path.join(__dirname, '../../widget/dist/widget.js')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/crawl', crawlRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
});

async function start() {
    try {
        // Initialize OpenSearch
        await initializeOpenSearch();
        console.log('✅ OpenSearch connected');

        // Initialize background worker
        await initializeWorker();
        console.log('✅ Crawl worker started');

        // Initialize Scheduler
        Scheduler.start();

        app.listen(PORT, () => {
            console.log(`🚀 Elasti API running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
