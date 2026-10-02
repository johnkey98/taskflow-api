import jwt from 'jsonwebtoken';
import db from '../db.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Send: Authorization: Bearer <token>' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = db.users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
