import bcrypt from 'bcryptjs';
import prisma from './utils/db';

async function seed() {
  console.log('Seeding database...');

  // Clean old seed data if present
  await prisma.deletedRecord.deleteMany({});
  await prisma.conflictRecord.deleteMany({});
  await prisma.focusSession.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.timeBlock.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.habitLog.deleteMany({});
  await prisma.habit.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.folder.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@maxtasks.com',
      passwordHash,
      name: 'Max Planner',
    },
  });

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Default Workspace',
      ownerId: user.id,
    },
  });

  // 3. Create Tags
  const tagWork = await prisma.tag.create({
    data: { name: 'Work', color: '#FF4D2A', workspaceId: workspace.id },
  });
  const tagPersonal = await prisma.tag.create({
    data: { name: 'Personal', color: '#E6AF2E', workspaceId: workspace.id },
  });

  // 4. Create Projects
  const projectLaunch = await prisma.project.create({
    data: {
      name: 'Product Launch 🚀',
      description: 'Preparing the mobile and web application for public launch.',
      icon: '🚀',
      color: '#FF4D2A',
      status: 'ON_TRACK',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days later
      workspaceId: workspace.id,
    },
  });

  const projectStudy = await prisma.project.create({
    data: {
      name: 'Personal Growth 📚',
      description: 'Books, courses, and skill building.',
      icon: '📚',
      color: '#E6AF2E',
      status: 'ON_TRACK',
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      workspaceId: workspace.id,
    },
  });

  // 5. Create Plans
  const planLaunch = await prisma.plan.create({
    data: {
      title: 'Q3 Launch Campaign',
      vision: 'Gain 500 active beta users in the first week.',
      type: 'PROJECT_LAUNCH',
      progress: 60,
      workspaceId: workspace.id,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  // 6. Create Notes
  const folderDocs = await prisma.folder.create({
    data: { name: 'Documentation', workspaceId: workspace.id },
  });

  const noteRoadmap = await prisma.note.create({
    data: {
      title: 'Launch Roadmap',
      content: `# Max Tasks Launch Plan

Here are the key milestones to achieve before shipping:

- [x] Express sync controller implementation
- [x] SQLite offline persistence schema
- [ ] Connect iPhone interface with REST API
- [ ] Set up Docker production configurations

Make sure all styles match our warm dark **Ember** palette!`,
      isPinned: true,
      folderId: folderDocs.id,
      workspaceId: workspace.id,
    },
  });

  const noteIdeas = await prisma.note.create({
    data: {
      title: 'Marketing Hooks',
      content: `# Hooks for Launch
      
1. "Tired of bloated blue SaaS apps? Welcome to Coal & Ember."
2. "Plan offline. Sync when you're ready. Focus 100% of the time."
3. "SwiftUI + Next.js desktop-first workspace."`,
      isPinned: false,
      workspaceId: workspace.id,
    },
  });

  // 7. Create Tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Finish API sync controller',
      description: 'Implement resolving client offline changes on backend.',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: new Date(),
      expectedDuration: 90,
      projectId: projectLaunch.id,
      planId: planLaunch.id,
      workspaceId: workspace.id,
    },
  });

  await prisma.subtask.createMany({
    data: [
      { taskId: task1.id, title: 'Verify merge conflicts logic', isCompleted: true, order: 0 },
      { taskId: task1.id, title: 'Write integration test', isCompleted: false, order: 1 },
    ],
  });

  await prisma.task.create({
    data: {
      title: 'Refactor SwiftUI views layout',
      description: 'Ensure Today navigation lists tasks correctly by scheduled hour.',
      status: 'PLANNED',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      expectedDuration: 120,
      projectId: projectLaunch.id,
      workspaceId: workspace.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Setup PostgreSQL migrations script',
      description: 'Write docker command to run migration files automatically.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      expectedDuration: 45,
      projectId: projectLaunch.id,
      workspaceId: workspace.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Read chapter 4 of Swift Programming handbook',
      description: 'Deep dive on Swift actors and concurrency safety.',
      status: 'INBOX',
      priority: 'LOW',
      projectId: projectStudy.id,
      workspaceId: workspace.id,
    },
  });

  // 8. Create Habits
  const habitGym = await prisma.habit.create({
    data: {
      name: 'Weightlifting session',
      frequency: 'DAILY',
      streak: 5,
      reminderTime: '18:00',
      workspaceId: workspace.id,
    },
  });

  await prisma.habitLog.createMany({
    data: [
      { habitId: habitGym.id, date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: true },
      { habitId: habitGym.id, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], completed: true },
    ],
  });

  // 9. Create Calendar Events
  await prisma.calendarEvent.create({
    data: {
      title: 'Sync Review with Antigravity',
      description: 'Aligning frontend layout styles and SwiftUI data structure.',
      startDate: new Date(new Date().setHours(14, 0, 0, 0)),
      endDate: new Date(new Date().setHours(15, 30, 0, 0)),
      workspaceId: workspace.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Weekly Milestones Planning',
      description: 'Review task lists, project completion timelines, and plans.',
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      workspaceId: workspace.id,
    },
  });

  console.log('Seeding complete! Log in using:');
  console.log('  Email:    demo@maxtasks.com');
  console.log('  Password: password123');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
