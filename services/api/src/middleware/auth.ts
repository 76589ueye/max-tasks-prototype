import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspaceId: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check Cookie header (for Web app browser requests)
  if (req.headers.cookie) {
    const cookiePairs = req.headers.cookie.split(';');
    for (const pair of cookiePairs) {
      const [key, value] = pair.trim().split('=');
      if (key === 'token') {
        token = value;
        break;
      }
    }
  }

  // 2. Check Authorization header (for native iOS Keychain requests)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Session credentials required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; workspaceId: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session credentials' });
  }
}
