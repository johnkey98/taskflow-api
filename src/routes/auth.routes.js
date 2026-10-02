import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const { name, email, password } = parsed.data;

    if (db.emailExists(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = db.createUser({ name, email, passwordHash });
    const token = signToken(user);

    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, token });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const { email, password } = parsed.data;
    const user = db.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ user: { id: user.id, name: user.name, email: user.email }, token: signToken(user) });
  })
);

export default router;
