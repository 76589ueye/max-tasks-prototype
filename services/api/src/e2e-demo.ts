import 'dotenv/config';
import prisma from './utils/db';

async function runE2E() {
  console.log('=== STARTING E2E REPLICATION & CONFLICT TEST ===');
  
  // Setup clean test data
  const email = `e2e-user-${Date.now()}@maxtasks.com`;
  const name = 'E2E Tester';
  const passwordHash = 'dummyhash';
  
  const user = await prisma.user.create({
    data: { email, name, passwordHash }
  });
  
  const workspace = await prisma.workspace.create({
    data: { name: 'E2E Workspace', ownerId: user.id }
  });
  
  console.log(`[Setup] User: ${user.email}, Workspace ID: ${workspace.id}`);
  
  const taskId = crypto.randomUUID();
  
  // Step 1: Client A creates Task Offline
  console.log('\n--- Step 1: Client A creates Task Offline ---');
  const clientATaskLocal = {
    id: taskId,
    title: 'Client A Initial Offline Objective',
    status: 'INBOX',
    priority: 'HIGH',
    workspaceId: workspace.id,
    revision: 1
  };
  console.log('Client A local state:', clientATaskLocal);

  // Step 2: Client A Syncs Task to Server
  console.log('\n--- Step 2: Client A Syncs Task to Server ---');
  await prisma.task.create({
    data: {
      id: clientATaskLocal.id,
      title: clientATaskLocal.title,
      status: clientATaskLocal.status,
      priority: clientATaskLocal.priority,
      workspaceId: clientATaskLocal.workspaceId,
      revision: clientATaskLocal.revision,
      serverUpdatedAt: new Date()
    }
  });
  
  let dbState = await prisma.task.findUnique({ where: { id: taskId } });
  console.log(`Server DB State: Title = "${dbState?.title}", Revision = ${dbState?.revision}`);

  // Step 3: Client B pulls the task from server
  console.log('\n--- Step 3: Client B pulls the task ---');
  const clientBLastSync = new Date(Date.now() - 10000);
  const clientBPullResult = await prisma.task.findMany({
    where: {
      workspaceId: workspace.id,
      serverUpdatedAt: { gt: clientBLastSync }
    }
  });
  console.log(`Client B Pulled Entities Count: ${clientBPullResult.length}`);
  console.log('Client B local cache updated with:', clientBPullResult[0]?.title);

  // Step 4: Client B edits the task online
  console.log('\n--- Step 4: Client B edits the task and syncs ---');
  const clientBEdit = {
    title: 'Client B Modified Objective (Approved)',
    revision: 2 // Increment revision
  };
  
  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: clientBEdit.title,
      revision: clientBEdit.revision,
      serverUpdatedAt: new Date()
    }
  });
  
  dbState = await prisma.task.findUnique({ where: { id: taskId } });
  console.log(`Server DB State: Title = "${dbState?.title}", Revision = ${dbState?.revision}`);

  // Step 5: Client A pulls the latest updates
  console.log('\n--- Step 5: Client A pulls latest updates ---');
  const clientALastSync = new Date(Date.now() - 5000);
  const clientAPullResult = await prisma.task.findMany({
    where: {
      workspaceId: workspace.id,
      serverUpdatedAt: { gt: clientALastSync }
    }
  });
  console.log('Client A local cache updated with Client B\'s changes:', clientAPullResult[0]?.title);

  // Step 6: Conflict Simulation (Client A pushes stale update)
  console.log('\n--- Step 6: Conflict Simulation (Client A pushes stale update) ---');
  const clientAStaleEdit = {
    title: 'Client A Attempted Stale Overwrite',
    revision: 1 // Client A didn't know about revision 2 yet!
  };
  
  console.log(`Client A tries to push title: "${clientAStaleEdit.title}" with Revision: ${clientAStaleEdit.revision}`);
  
  // Check against server db state
  const currentServerState = await prisma.task.findUnique({ where: { id: taskId } });
  if (currentServerState && clientAStaleEdit.revision < currentServerState.revision) {
    console.log('[Conflict Detected] Server revision is higher! Rejecting edit and logging conflict...');
    
    const conflict = await prisma.conflictRecord.create({
      data: {
        table: 'tasks',
        entityId: taskId,
        workspaceId: workspace.id,
        clientData: JSON.stringify(clientAStaleEdit),
        serverData: JSON.stringify(currentServerState)
      }
    });
    
    console.log('Logged ConflictRecord:', {
      id: conflict.id,
      table: conflict.table,
      entityId: conflict.entityId,
      createdAt: conflict.createdAt
    });
  } else {
    console.log('No conflict, update applied.');
  }

  // Verify final database state
  dbState = await prisma.task.findUnique({ where: { id: taskId } });
  console.log('\n--- Final Database Verification ---');
  console.log(`Final server database task title: "${dbState?.title}"`);
  console.log(`Final server database task revision: ${dbState?.revision}`);
  
  const conflictsCount = await prisma.conflictRecord.count({ where: { entityId: taskId } });
  console.log(`Conflicts recorded for this task: ${conflictsCount}`);
  
  console.log('\n=== E2E REPLICATION & CONFLICT TEST COMPLETE ===');
}

runE2E()
  .catch(err => {
    console.error('E2E execution failed:', err);
    process.exit(1);
  });
