import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const taskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

const updateSchema = taskSchema.omit({ projectId: true }).partial();

router.use(requireAuth);

/** GET /api/tasks?projectId=&status=&priority=&sort= */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { projectId, status, priority } = req.query;
    const projects = db.listProjects(req.user.id).map((p) => p.id);
    if (projectId && !projects.includes(projectId)) {
      return res.status(403).json({ error: 'You do not own this project' });
    }

    let tasks = (projectId ? db.listTasks(projectId) : [...db.tasks.values()]).filter((t) =>
      projects.includes(t.projectId)
    );
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);

    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => order[a.priority] - order[b.priority]);

    res.json({ items: tasks, total: tasks.length });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const project = db.projects.get(parsed.data.projectId);
    if (!project || project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Project not found or not owned by you' });
    }
    res.status(201).json(db.createTask(parsed.data.projectId, parsed.data));
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const task = db.tasks.get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = db.projects.get(task.projectId);
    if (!project || project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const updated = { ...task, ...parsed.data, updatedAt: new Date().toISOString() };
    db.tasks.set(task.id, updated);
    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = db.tasks.get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = db.projects.get(task.projectId);
    if (!project || project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not your task' });
    }
    db.tasks.delete(task.id);
    res.status(204).end();
  })
);

export default router;
