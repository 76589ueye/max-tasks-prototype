'use client';

import React, { useState, useEffect } from 'react';
import { FolderPlus, ArrowRight, Activity } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Project, Task } from 'shared-types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');

  // Project Form states
  const [showAddProject, setShowAddProject] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projColor, setProjColor] = useState('#FF4D2A');
  const [projIcon, setProjIcon] = useState('🚀');

  const loadCache = async () => {
    const cachedProjects = await SyncEngine.getLocalItems<Project>('projects');
    const cachedTasks = await SyncEngine.getLocalItems<Task>('tasks');
    setProjects(cachedProjects);
    setTasks(cachedTasks);
    setWorkspaceId(localStorage.getItem('max_tasks_workspace_id') || '');
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    const newId = crypto.randomUUID();
    await SyncEngine.applyLocalChange('projects', 'INSERT', newId, {
      name: projName,
      description: projDesc,
      icon: projIcon,
      color: projColor,
      status: 'ON_TRACK',
      workspaceId
    });

    setProjName('');
    setProjDesc('');
    setShowAddProject(false);
  };

  const updateTaskStatus = async (taskId: string, nextStatus: 'INBOX' | 'IN_PROGRESS' | 'COMPLETED') => {
    await SyncEngine.applyLocalChange('tasks', 'UPDATE', taskId, {
      status: nextStatus,
      completedAt: nextStatus === 'COMPLETED' ? new Date().toISOString() : null
    });
  };

  const kanbanTasks = tasks.filter(t => t.status !== 'ARCHIVED');

  const getTasksByStatus = (status: 'INBOX' | 'IN_PROGRESS' | 'COMPLETED') => {
    return kanbanTasks.filter(t => {
      if (status === 'INBOX') return t.status === 'INBOX' || t.status === 'PLANNED';
      return t.status === status;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Project Center</h2>
        <button onClick={() => setShowAddProject(true)} className={styles.quickAddBtn} style={{ borderRadius: 'var(--radius-md)' }}>
          <FolderPlus size={16} />
          <span>New Project</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {projects.map(proj => {
          const projTasks = tasks.filter(t => t.projectId === proj.id);
          const completedTasks = projTasks.filter(t => t.status === 'COMPLETED');
          const percent = projTasks.length > 0 ? Math.round((completedTasks.length / projTasks.length) * 100) : 0;

          return (
            <div key={proj.id} className={styles.card} style={{ borderTop: `4px solid ${proj.color || '#FF4D2A'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{proj.icon || '📁'}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255, 77, 42, 0.08)', color: proj.color }}>
                    {proj.status}
                  </span>
                </div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{proj.name}</h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{proj.description}</p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Progress ({completedTasks.length}/{projTasks.length})</span>
                  <strong>{percent}%</strong>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${percent}%`, backgroundColor: proj.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '24px 0 16px 0' }}>Workspace Kanban Board</h3>
        
        <div className={styles.boardGrid}>
          <div className={styles.boardColumn}>
            <div className={styles.columnHeader}>
              <span>To Do / Inbox</span>
              <span>{getTasksByStatus('INBOX').length}</span>
            </div>
            
            {getTasksByStatus('INBOX').map(task => (
              <div key={task.id} className={styles.boardCard}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>{task.title}</h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span className={`${styles.priorityBadge} ${styles['priority' + task.priority]}`}>{task.priority}</span>
                  <button onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} className={styles.actionBtn}>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.boardColumn}>
            <div className={styles.columnHeader}>
              <span>In Progress</span>
              <span>{getTasksByStatus('IN_PROGRESS').length}</span>
            </div>

            {getTasksByStatus('IN_PROGRESS').map(task => (
              <div key={task.id} className={styles.boardCard} style={{ borderLeft: '3px solid var(--color-gold)' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>{task.title}</h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span className={`${styles.priorityBadge} ${styles['priority' + task.priority]}`}>{task.priority}</span>
                  <button onClick={() => updateTaskStatus(task.id, 'COMPLETED')} className={styles.actionBtn}>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.boardColumn}>
            <div className={styles.columnHeader}>
              <span>Completed</span>
              <span>{getTasksByStatus('COMPLETED').length}</span>
            </div>

            {getTasksByStatus('COMPLETED').map(task => (
              <div key={task.id} className={styles.boardCard} style={{ borderLeft: '3px solid var(--color-status-completed)' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>{task.title}</h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span className={`${styles.priorityBadge} ${styles['priority' + task.priority]}`} style={{ opacity: 0.5 }}>{task.priority}</span>
                  <button onClick={() => updateTaskStatus(task.id, 'INBOX')} className={styles.actionBtn}>
                    <RotateBackIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddProject && (
        <div className={styles.modalOverlay} onClick={() => setShowAddProject(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <Activity size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 600 }}>Create New Project</span>
            </div>
            <form onSubmit={handleCreateProject} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Project Name</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={e => setProjName(e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g. Website redesign"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  value={projDesc}
                  onChange={e => setProjDesc(e.target.value)}
                  className={styles.formInput}
                  style={{ minHeight: '80px', resize: 'none' }}
                  placeholder="Goals and scope..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Icon</label>
                  <input
                    type="text"
                    value={projIcon}
                    onChange={e => setProjIcon(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Color Hex</label>
                  <input
                    type="color"
                    value={projColor}
                    onChange={e => setProjColor(e.target.value)}
                    className={styles.formInput}
                    style={{ padding: '6px', height: '40px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowAddProject(false)} className={styles.actionBtn}>Cancel</button>
                <button type="submit" className={styles.quickAddBtn}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RotateBackIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-undo-2">
      <path d="M9 14 4 9l5-5"/>
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
    </svg>
  );
}
