import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Generic helper to get delegate by resource string
const getDelegate = (resource: string) => {
  const map: Record<string, any> = {
    tasks: prisma.task,
    projects: prisma.project,
    plans: prisma.plan,
    notes: prisma.note,
    folders: prisma.folder,
    habits: prisma.habit,
    calendarEvents: prisma.calendarEvent,
    subtasks: prisma.subtask,
    checklistItems: prisma.checklistItem,
  };
  return map[resource];
};

// GET ALL FOR A RESOURCE
router.get('/:resource', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { resource } = req.params;
  const delegate = getDelegate(resource);
  if (!delegate) return res.status(404).json({ error: 'Resource not found' });

  try {
    const items = await delegate.findMany({
      where: { workspaceId: req.user!.workspaceId },
    });
    return res.json(items);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET ONE BY ID
router.get('/:resource/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { resource, id } = req.params;
  const delegate = getDelegate(resource);
  if (!delegate) return res.status(404).json({ error: 'Resource not found' });

  try {
    const item = await delegate.findFirst({
      where: { id, workspaceId: req.user!.workspaceId },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json(item);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// CREATE
router.post('/:resource', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { resource } = req.params;
  const delegate = getDelegate(resource);
  if (!delegate) return res.status(404).json({ error: 'Resource not found' });

  try {
    const data = { ...req.body, workspaceId: req.user!.workspaceId };
    const item = await delegate.create({ data });
    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// UPDATE
router.put('/:resource/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { resource, id } = req.params;
  const delegate = getDelegate(resource);
  if (!delegate) return res.status(404).json({ error: 'Resource not found' });

  try {
    // Verify ownership
    const existing = await delegate.findFirst({
      where: { id, workspaceId: req.user!.workspaceId },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const data = { ...req.body };
    delete data.id;
    delete data.workspaceId;

    const item = await delegate.update({
      where: { id },
      data,
    });
    return res.json(item);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// DELETE
router.delete('/:resource/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { resource, id } = req.params;
  const delegate = getDelegate(resource);
  if (!delegate) return res.status(404).json({ error: 'Resource not found' });

  try {
    const existing = await delegate.findFirst({
      where: { id, workspaceId: req.user!.workspaceId },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    await delegate.delete({ where: { id } });

    // Track deletion
    await prisma.deletedRecord.create({
      data: {
        table: resource,
        entityId: id,
        workspaceId: req.user!.workspaceId,
      },
    });

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
