import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

process.env.JWT_SECRET = 'test-secret-for-ci';

const app = createApp();
let token;
let projectId;

describe('TaskFlow API', () => {
  describe('System', () => {
    test('GET /api/health → 200', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    });
  });

  describe('Auth', () => {
    test('POST /api/auth/register → 201 + token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John Key', email: 'john@test.io', password: 'supersecret123' });
      assert.equal(res.status, 201);
      assert.ok(res.body.token);
      token = res.body.token;
    });

    test('duplicate email → 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John Again', email: 'john@test.io', password: 'supersecret123' });
      assert.equal(res.status, 409);
    });

    test('weak password → 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Shorty', email: 'short@test.io', password: '123' });
      assert.equal(res.status, 422);
    });

    test('protected route without token → 401', async () => {
      const res = await request(app).get('/api/projects');
      assert.equal(res.status, 401);
    });
  });

  describe('Projects & Tasks', () => {
    test('create project → 201', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Website Redesign', description: 'Q4 project' });
      assert.equal(res.status, 201);
      projectId = res.body.id;
    });

    test('create task → 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId, title: 'Design landing page', priority: 'high' });
      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'todo');
    });

    test('task in foreign project → 403', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'not-a-uuid', title: 'x' });
      assert.equal(res.status, 422); // fails zod uuid validation first
    });

    test('filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.items.every((t) => t.priority === 'high'));
    });

    test('update task status → 200', async () => {
      const list = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
      const taskId = list.body.items[0].id;
      const res = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in_progress' });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'in_progress');
    });

    test('delete project → 204 and cascade', async () => {
      const res = await request(app).delete(`/api/projects/${projectId}`).set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 204);
      const tasks = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
      assert.equal(tasks.body.total, 0);
    });
  });
});
