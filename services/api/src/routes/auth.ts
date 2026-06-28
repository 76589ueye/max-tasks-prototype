import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function setCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${isProd ? '; Secure' : ''}`
  );
}

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Automatically create a default workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Personal Workspace',
        ownerId: user.id,
      },
    });

    // Setup basic tags
    await prisma.tag.createMany({
      data: [
        { name: 'Work', color: '#FF4D2A', workspaceId: workspace.id },
        { name: 'Personal', color: '#E6AF2E', workspaceId: workspace.id },
        { name: 'Health', color: '#10B981', workspaceId: workspace.id },
      ],
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, workspaceId: workspace.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    setCookie(res, token);

    return res.status(201).json({
      token, // returned for iOS client to store in Keychain
      user: { id: user.id, email: user.email, name: user.name },
      workspaceId: workspace.id,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Signup failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { workspaces: true },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const workspace = user.workspaces[0] || await prisma.workspace.create({
      data: { name: 'Personal Workspace', ownerId: user.id },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, workspaceId: workspace.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    setCookie(res, token);

    return res.json({
      token, // returned for iOS client to store in Keychain
      user: { id: user.id, email: user.email, name: user.name },
      workspaceId: workspace.id,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Login failed' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  return res.json({ success: true });
});

// GET ME
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user, workspaceId: req.user!.workspaceId });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
