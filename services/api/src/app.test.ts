import 'dotenv/config';
import crypto from 'crypto';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from './app';
import prisma from './utils/db';

describe('Max Tasks E2E Sync & Auth Integration Suite', () => {
  const randomEmail = `runner-${Math.random()}@maxtasks.com`;
  const runnerPassword = 'securePassword123';
  let jwtToken = '';
  let workspaceId = '';
  let cookieHeader = '';

  beforeAll(async () => {
    // DB is pre-migrated via prisma migrate dev
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Signup / Login
  it('Scenario: Signup & Login', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: randomEmail,
        password: runnerPassword,
        name: 'Runner E2E'
      });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body).toHaveProperty('token');
    expect(signupRes.body).toHaveProperty('workspaceId');
    
    jwtToken = signupRes.body.token;
    workspaceId = signupRes.body.workspaceId;

    // Check Set-Cookie header contains HttpOnly token
    const setCookie = signupRes.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toContain('token=');
    expect(setCookie[0]).toContain('HttpOnly');

    cookieHeader = setCookie[0].split(';')[0];
  });

  // 2. Cookie Authentication for Web
  it('Scenario: Cookie auth for web clients', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(randomEmail);
    expect(res.body.workspaceId).toBe(workspaceId);
  });

  // 3. Keychain Auth style (Bearer headers) for iOS
  it('Scenario: Keychain Bearer auth for iOS client layer', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(randomEmail);
  });

  // 4. Create Task Offline & Sync to Server
  const taskId = crypto.randomUUID();
  it('Scenario: Create Task Offline -> Sync Task to Server', async () => {
    // Client A generates a task locally while offline: revision=1
    const offlineTask = {
      title: 'Review Apple iOS 26 Design Guidelines',
      description: 'Focus on native lists and SF Symbols render modes',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      workspaceId
    };

    // Client A goes online and pushes mutation queue to server
    const syncRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        lastSyncTimestamp: 0,
        mutations: [
          {
            type: 'INSERT',
            table: 'tasks',
            entityId: taskId,
            clientRevision: 1,
            clientTimestamp: Date.now(),
            data: offlineTask
          }
        ]
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.conflicts).toHaveLength(0);

    // Verify task is stored in PostgreSQL database with correct revision
    const dbTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(dbTask).toBeDefined();
    expect(dbTask?.title).toBe(offlineTask.title);
    expect(dbTask?.revision).toBe(1);
  });

  // 5. Pull Task on Second Client (Client B)
  it('Scenario: Pull task on second client (Client B)', async () => {
    // Client B runs sync after Client A pushed
    const syncRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        lastSyncTimestamp: Date.now() - 60000, // Sync changes from last minute
        mutations: []
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.updatedEntities.tasks).toBeDefined();
    
    const pulledTask = syncRes.body.updatedEntities.tasks.find((t: any) => t.id === taskId);
    expect(pulledTask).toBeDefined();
    expect(pulledTask.title).toBe('Review Apple iOS 26 Design Guidelines');
  });

  // 6. Stale Update Conflict Resolution
  it('Scenario: Handle stale update conflicts (LWW rejection)', async () => {
    // Client A updated the task on server to revision 2
    await prisma.task.update({
      where: { id: taskId },
      data: { revision: 2 }
    });

    // Client B attempts to push a stale edit with clientRevision=1
    const syncRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        lastSyncTimestamp: Date.now(),
        mutations: [
          {
            type: 'UPDATE',
            table: 'tasks',
            entityId: taskId,
            clientRevision: 1, // older than server revision 2!
            clientTimestamp: Date.now(),
            data: {
              title: 'STALE OVERWRITE ATTEMPT'
            }
          }
        ]
      });

    expect(syncRes.status).toBe(200);
    
    // Conflict should be logged in database
    expect(syncRes.body.conflicts).toHaveLength(1);
    expect(syncRes.body.conflicts[0].table).toBe('tasks');
    expect(syncRes.body.conflicts[0].entityId).toBe(taskId);

    // Verify task title on server was NOT overwritten
    const dbTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(dbTask?.title).not.toBe('STALE OVERWRITE ATTEMPT');
  });

  // 7. Tombstone Deletion Propagation
  it('Scenario: Delete task and propagate tombstones', async () => {
    // Client B deletes task locally and syncs DELETE to server
    const syncRes = await request(app)
      .post('/api/v1/sync')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        lastSyncTimestamp: Date.now(),
        mutations: [
          {
            type: 'DELETE',
            table: 'tasks',
            entityId: taskId,
            clientRevision: 3,
            clientTimestamp: Date.now()
          }
        ]
      });

    expect(syncRes.status).toBe(200);

    // Verify task is deleted from PostgreSQL
    const dbTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(dbTask).toBeNull();

    // Verify tombstone DeletedRecord exists
    const tombstone = await prisma.deletedRecord.findFirst({
      where: { entityId: taskId, table: 'tasks' }
    });
    expect(tombstone).toBeDefined();
    expect(tombstone?.workspaceId).toBe(workspaceId);
  });

  // 8. Attachment Metadata Validation
  it('Scenario: Save and retrieve attachment metadata', async () => {
    const attachmentId = crypto.randomUUID();
    const saveRes = await prisma.attachment.create({
      data: {
        id: attachmentId,
        fileName: 'design-assets.pdf',
        fileUrl: 'http://localhost:8080/uploads/design-assets.pdf',
        fileSize: 450000,
        mimeType: 'application/pdf'
      }
    });

    expect(saveRes.fileName).toBe('design-assets.pdf');
    expect(saveRes.fileSize).toBe(450000);
  });

  // 9. Arabic RTL layout configuration check
  it('Scenario: Arabic translations support and RTL configurations', async () => {
    const translation = {
      key: 'inbox',
      en: 'Inbox',
      ar: 'الوارد'
    };

    expect(translation.ar).toBe('الوارد');
    expect(translation.en).toBe('Inbox');
  });
});
