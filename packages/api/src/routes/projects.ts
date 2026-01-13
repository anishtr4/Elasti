import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ProjectStore } from '../services/project-store.js';

export const projectsRouter = Router();

projectsRouter.post('/', async (req, res) => {
    try {
        const { name, url, crossReferenceIds } = req.body;

        if (!name || !url) {
            return res.status(400).json({ error: 'name and url are required' });
        }

        const project = await ProjectStore.create({
            id: uuidv4(),
            name,
            url,
            crossReferenceIds: crossReferenceIds || [],
            createdAt: new Date(),
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

projectsRouter.get('/:id', async (req, res) => {
    const project = await ProjectStore.get(req.params.id);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
});

projectsRouter.get('/', async (req, res) => {
    const projects = await ProjectStore.getAll();
    res.json(projects);
});

projectsRouter.patch('/:id', async (req, res) => {
    try {
        const updated = await ProjectStore.update(req.params.id, req.body);

        if (!updated) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

projectsRouter.delete('/:id', async (req, res) => {
    const deleted = await ProjectStore.delete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.status(204).send();
});
