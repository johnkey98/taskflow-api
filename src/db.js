import crypto from 'node:crypto';

/**
 * In-memory store. Swap with Prisma/Postgres/Mongo for production —
 * every access goes through these helpers so the migration is trivial.
 */
const db = {
  users: new Map(), // id -> { id, name, email, passwordHash, createdAt }
  projects: new Map(), // id -> { id, ownerId, name, description, createdAt }
  tasks: new Map(), // id -> { id, projectId, title, description, status, priority, dueDate, createdAt, updatedAt }

  emailExists(email) {
    return [...this.users.values()].some((u) => u.email === email.toLowerCase());
  },

  createUser({ name, email, passwordHash }) {
    const user = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  },

  findUserByEmail(email) {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase());
  },

  listProjects(ownerId) {
    return [...this.projects.values()].filter((p) => p.ownerId === ownerId);
  },

  createProject(ownerId, { name, description = '' }) {
    const project = {
      id: crypto.randomUUID(),
      ownerId,
      name,
      description,
      createdAt: new Date().toISOString(),
    };
    this.projects.set(project.id, project);
    return project;
  },

  listTasks(projectId) {
    return [...this.tasks.values()].filter((t) => t.projectId === projectId);
  },

  createTask(projectId, data) {
    const task = {
      id: crypto.randomUUID(),
      projectId,
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  },
};

export default db;
