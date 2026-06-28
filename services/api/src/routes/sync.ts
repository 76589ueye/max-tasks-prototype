import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { WebSocketService } from '../services/websocket';

const router = Router();

const prismaDelegates: Record<string, any> = {
  tasks: prisma.task,
  projects: prisma.project,
  plans: prisma.plan,
  milestones: prisma.milestone,
  notes: prisma.note,
  folders: prisma.folder,
  habits: prisma.habit,
  habitLogs: prisma.habitLog,
  calendarEvents: prisma.calendarEvent,
  timeBlocks: prisma.timeBlock,
  subtasks: prisma.subtask,
  checklistItems: prisma.checklistItem,
  reminders: prisma.reminder,
  focusSessions: prisma.focusSession,
};

router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const { lastSyncTimestamp = 0, mutations = [] } = req.body;
  const lastSyncDate = new Date(lastSyncTimestamp);
  const serverTimestamp = Date.now();
  const loggedConflicts: any[] = [];

  try {
    for (const mutation of mutations) {
      const { type, table, entityId, data, clientRevision = 1 } = mutation;
      const delegate = prismaDelegates[table];
      if (!delegate) continue;

      const sanitizedData = { ...data };
      delete sanitizedData.id;
      delete sanitizedData.workspaceId;
      delete sanitizedData.createdAt;
      delete sanitizedData.updatedAt;
      delete sanitizedData.serverUpdatedAt;
      delete sanitizedData.revision;

      for (const key of Object.keys(sanitizedData)) {
        const val = sanitizedData[key];
        if (typeof val === 'string' && (key.endsWith('At') || key.endsWith('Date') || key === 'startDate' || key === 'endDate' || key === 'dueDate')) {
          sanitizedData[key] = new Date(val);
        }
      }

      if (type === 'INSERT' || type === 'UPDATE') {
        const existing = await delegate.findUnique({ where: { id: entityId } });
        if (existing) {
          const serverRevision = existing.revision || 1;
          if (clientRevision >= serverRevision) {
            // Apply update and bump revision
            await delegate.update({
              where: { id: entityId },
              data: {
                ...sanitizedData,
                revision: serverRevision + 1,
                serverUpdatedAt: new Date(),
              },
            });
          } else {
            // Conflict detected: client is editing an older revision
            const conflict = await prisma.conflictRecord.create({
              data: {
                table,
                entityId,
                workspaceId,
                clientData: JSON.stringify(data),
                serverData: JSON.stringify(existing),
              },
            });
            loggedConflicts.push(conflict);
          }
        } else {
          // Clean insert
          await delegate.create({
            data: {
              id: entityId,
              ...sanitizedData,
              workspaceId,
              revision: clientRevision,
            },
          });
        }
      } else if (type === 'DELETE') {
        try {
          await delegate.delete({ where: { id: entityId } });
        } catch (err) {}
        await prisma.deletedRecord.create({
          data: {
            table,
            entityId,
            workspaceId,
          },
        });
      }
    }

    // 2. Fetch changes since lastSyncDate
    const updatedEntities: Record<string, any[]> = {};
    const deletedIds: Record<string, string[]> = {};

    for (const table of Object.keys(prismaDelegates)) {
      const delegate = prismaDelegates[table];
      
      let whereClause: any = {
        serverUpdatedAt: {
          gt: lastSyncDate,
        },
      };

      if (table === 'habitLogs') {
        whereClause.habit = { workspaceId };
      } else if (table === 'subtasks' || table === 'checklistItems') {
        whereClause.task = { workspaceId };
      } else {
        whereClause.workspaceId = workspaceId;
      }

      const items = await delegate.findMany({
        where: whereClause,
      });
      updatedEntities[table] = items;
    }

    // Fetch deletions
    const deletions = await prisma.deletedRecord.findMany({
      where: {
        workspaceId,
        deletedAt: {
          gt: lastSyncDate,
        },
      },
      select: {
        table: true,
        entityId: true,
      },
    });

    for (const deletion of deletions) {
      if (!deletedIds[deletion.table]) {
        deletedIds[deletion.table] = [];
      }
      deletedIds[deletion.table].push(deletion.entityId);
    }

    // Broadcast to other devices in workspace
    if (mutations.length > 0) {
      WebSocketService.broadcastToWorkspace(workspaceId, req.user!.id, {
        type: 'reconcile',
        workspaceId
      });
    }

    return res.json({
      serverTimestamp,
      updatedEntities,
      deletedIds,
      conflicts: loggedConflicts,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

export default router;
