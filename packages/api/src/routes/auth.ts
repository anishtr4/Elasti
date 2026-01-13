import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin') {
        // In a real app, sign a JWT here.
        // For this demo, we return a simple mock token.
        return res.json({ token: 'mock-admin-token-12345', user: { username: 'admin' } });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
});

authRouter.get('/me', (req, res) => {
    // Basic verification check
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer mock-admin-token-12345') {
        return res.json({ username: 'admin' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
});
