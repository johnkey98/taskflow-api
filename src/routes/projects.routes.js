import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ items: db.listProjects(req.user.id), total: db.listProjects(req.user.id).length });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const project = db.createProject(req.user.id, parsed.data);
    res.status(201).json(project);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = db.projects.get(req.params.id);
    if (!project || project.ownerId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ ...project, tasks: db.listTasks(project.id) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = db.projects.get(req.params.id);
    if (!project || project.ownerId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }
    for (const task of db.listTasks(project.id)) db.tasks.delete(task.id);
    db.projects.delete(project.id);
    res.status(204).end();
  })
);

export default router;
