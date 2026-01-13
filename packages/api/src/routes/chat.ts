import { Router } from 'express';
import { answerQuestion } from '../services/qa-engine.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
    try {
        const { projectId, question } = req.body;

        if (!projectId || !question) {
            return res.status(400).json({ error: 'projectId and question are required' });
        }

        const response = await answerQuestion(projectId, question);

        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process question' });
    }
});
