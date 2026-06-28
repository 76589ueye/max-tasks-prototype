'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, Filter } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Task, Project, Plan } from 'shared-types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const loadCache = async () => {
    const cachedTasks = await SyncEngine.getLocalItems<Task>('tasks');
    const cachedProjects = await SyncEngine.getLocalItems<Project>('projects');
    const cachedPlans = await SyncEngine.getLocalItems<Plan>('plans');
    
    setTasks(cachedTasks);
    setProjects(cachedProjects);
    setPlans(cachedPlans);
    setWorkspaceId(localStorage.getItem('max_tasks_workspace_id') || '');
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newId = crypto.randomUUID();
    const newTask = {
      title: newTitle,
      status: 'INBOX' as const,
      priority: newPriority,
      projectId: selectedProject || undefined,
      planId: selectedPlan || undefined,
      workspaceId
    };

    await SyncEngine.applyLocalChange('tasks', 'INSERT', newId, newTask);
    setNewTitle('');
    setSelectedProject('');
    setSelectedPlan('');
  };

  const toggleComplete = async (task: Task) => {
    await SyncEngine.applyLocalChange('tasks', 'UPDATE', task.id, {
      status: task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED',
      completedAt: task.status === 'COMPLETED' ? null : new Date().toISOString()
    });
  };

  const deleteTask = async (id: string) => {
    if (confirm('Delete this task?')) {
      await SyncEngine.applyLocalChange('tasks', 'DELETE', id, null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (t.status === 'ARCHIVED') return false;
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Task Center</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className={styles.formSelect}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        <div className={styles.taskList}>
          {filteredTasks.map(task => (
            <div key={task.id} className={styles.taskItem}>
              <div
                className={`${styles.checkbox} ${task.status === 'COMPLETED' ? styles.checkboxChecked : ''}`}
                onClick={() => toggleComplete(task)}
              >
                {task.status === 'COMPLETED' && <Check size={12} />}
              </div>
              
              <div style={{ flexGrow: 1 }}>
                <span className={`${styles.taskTitle} ${task.status === 'COMPLETED' ? styles.taskTitleDone : ''}`}>
                  {task.title}
                </span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {task.projectId && (
                    <span>📁 {projects.find(p => p.id === task.projectId)?.name || 'Project'}</span>
                  )}
                  {task.planId && (
                    <span>🗺️ {plans.find(p => p.id === task.planId)?.title || 'Plan'}</span>
                  )}
                </div>
              </div>

              <span className={`${styles.priorityBadge} ${styles['priority' + task.priority]}`}>
                {task.priority}
              </span>

              <button
                onClick={() => deleteTask(task.id)}
                className={styles.actionBtn}
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No tasks found in your workspace.
            </div>
          )}
        </div>
      </div>

      <div className={styles.card} style={{ height: 'fit-content' }}>
        <h3 className={styles.cardTitle}>Add New Task</h3>
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Task Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Priority</label>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as any)}
              className={styles.formSelect}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Project</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className={styles.formSelect}
            >
              <option value="">None</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Associated Plan</label>
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className={styles.formSelect}
            >
              <option value="">None</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.quickAddBtn} style={{ justifyContent: 'center', width: '100%', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </form>
      </div>
    </div>
  );
}
