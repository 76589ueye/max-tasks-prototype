'use client';

import React, { useState, useEffect } from 'react';
import { Play, Check, BookOpen, Clock, Sparkles } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Task, CalendarEvent } from 'shared-types';

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [greeting, setGreeting] = useState('Welcome back');
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');

  const loadCache = async () => {
    const allTasks = await SyncEngine.getLocalItems<Task>('tasks');
    const allEvents = await SyncEngine.getLocalItems<CalendarEvent>('calendarEvents');
    const wsId = localStorage.getItem('max_tasks_workspace_id') || '';

    setWorkspaceId(wsId);
    
    const today = new Date().toDateString();
    const todayTasks = allTasks.filter(t => {
      if (t.status === 'ARCHIVED' || t.status === 'COMPLETED') return false;
      if (!t.dueDate) return true;
      return new Date(t.dueDate).toDateString() === today;
    });

    setTasks(todayTasks);
    setEvents(allEvents);

    if (todayTasks.length > 0 && !focusTask) {
      const criticallyImportant = todayTasks.find(t => t.priority === 'CRITICAL' || t.priority === 'HIGH');
      setFocusTask(criticallyImportant || todayTasks[0]);
    }
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good Morning');
    else if (hr < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (focusRunning) {
      interval = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            setFocusRunning(false);
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [focusRunning]);

  const toggleComplete = async (task: Task) => {
    await SyncEngine.applyLocalChange('tasks', 'UPDATE', task.id, {
      status: task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED',
      completedAt: task.status === 'COMPLETED' ? null : new Date().toISOString()
    });
  };

  const saveQuickNote = async () => {
    if (!quickNoteText.trim()) return;
    const newId = crypto.randomUUID();
    await SyncEngine.applyLocalChange('notes', 'INSERT', newId, {
      title: `Memo - ${new Date().toLocaleDateString()}`,
      content: quickNoteText,
      isPinned: false,
      workspaceId
    });
    setQuickNoteText('');
    alert('Note added to your folder!');
  };

  const timelineHours = Array.from({ length: 15 }, (_, i) => i + 7);

  // Calculate statistics from cache
  const [completedCount, setCompletedCount] = useState(0);
  const [plannedCount, setPlannedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);

  useEffect(() => {
    const calculateStats = async () => {
      const all = await SyncEngine.getLocalItems<Task>('tasks');
      setCompletedCount(all.filter(t => t.status === 'COMPLETED').length);
      setPlannedCount(tasks.filter(t => t.status === 'PLANNED').length);
      setInProgressCount(tasks.filter(t => t.status === 'IN_PROGRESS').length);
      setLateCount(all.filter(t => {
        if (t.status === 'COMPLETED' || t.status === 'ARCHIVED' || !t.dueDate) return false;
        return new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
      }).length);
    };
    calculateStats();
  }, [tasks]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={styles.todayGrid}>
      <div className={styles.todayLeft}>
        <div className={styles.greetingContainer}>
          <div>
            <h2 className={styles.greeting}>{greeting}, Max</h2>
            <p className={styles.dateSub}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statVal} style={{ color: 'var(--color-status-completed)' }}>{completedCount}</div>
            <div className={styles.statLabel}>Completed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal} style={{ color: 'var(--color-status-planned)' }}>{plannedCount}</div>
            <div className={styles.statLabel}>Planned</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal} style={{ color: 'var(--color-status-in-progress)' }}>{inProgressCount}</div>
            <div className={styles.statLabel}>In Progress</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal} style={{ color: 'var(--color-status-late)' }}>{lateCount}</div>
            <div className={styles.statLabel}>Overdue</div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <span>Timeline Schedule</span>
          </h3>
          <div className={styles.timeline}>
            {timelineHours.map(hour => {
              const formattedHour = `${hour.toString().padStart(2, '0')}:00`;
              
              const hourEvent = events.find(e => {
                const startHour = new Date(e.startDate).getHours();
                return startHour === hour;
              });

              const hourTask = tasks.find(t => {
                if (!t.timeOfDay) return false;
                const [h] = t.timeOfDay.split(':');
                return parseInt(h, 10) === hour;
              });

              return (
                <div key={hour} className={styles.timelineHour}>
                  <span className={styles.timeLabel}>{formattedHour}</span>
                  <div className={styles.timeSlotContent}>
                    {hourEvent && (
                      <div className={styles.eventBlock}>
                        <BookOpen size={12} />
                        <strong>{hourEvent.title}</strong>
                      </div>
                    )}
                    {!hourEvent && hourTask && (
                      <div className={styles.eventBlock} style={{ backgroundColor: 'rgba(230, 175, 46, 0.15)', borderLeftColor: 'var(--color-gold)' }}>
                        <Clock size={12} />
                        <strong>{hourTask.title}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.todayRight}>
        <div className={styles.card} style={{ borderLeft: '3px solid var(--color-primary)' }}>
          <h3 className={styles.cardTitle} style={{ color: 'var(--color-primary)' }}>Focus Mode</h3>
          {focusTask ? (
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>CURRENT OBJECTIVE:</div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '16px' }}>{focusTask.title}</div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px', color: 'var(--color-text-primary)' }}>
                  {formatTimer(focusTimeLeft)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setFocusRunning(!focusRunning)} 
                  className={styles.quickAddBtn}
                  style={{ flexGrow: 1, justifyContent: 'center', borderRadius: 'var(--radius-md)', padding: '10px' }}
                >
                  <Play size={14} />
                  <span>{focusRunning ? 'Pause Session' : 'Start Focus'}</span>
                </button>
                <button 
                  onClick={() => {
                    toggleComplete(focusTask);
                    setFocusRunning(false);
                    setFocusTimeLeft(25 * 60);
                  }}
                  className={styles.actionBtn}
                  style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: 'var(--radius-md)' }}
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              No tasks left for today! Relax.
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Next Up</h3>
          <div className={styles.taskList}>
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className={styles.taskItem}>
                <div 
                  className={`${styles.checkbox} ${task.status === 'COMPLETED' ? styles.checkboxChecked : ''}`}
                  onClick={() => toggleComplete(task)}
                >
                  {task.status === 'COMPLETED' && <Check size={12} />}
                </div>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={`${styles.priorityBadge} ${styles['priority' + task.priority]}`}>
                  {task.priority}
                </span>
              </div>
            ))}
            {tasks.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                Your queue is empty.
              </div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Quick Memo</h3>
          <textarea
            value={quickNoteText}
            onChange={e => setQuickNoteText(e.target.value)}
            placeholder="Jot down a quick thought..."
            className={styles.formInput}
            style={{ width: '100%', minHeight: '80px', resize: 'none', backgroundColor: 'var(--color-surface-low)', borderRadius: 'var(--radius-md)', padding: '8px', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none' }}
          />
          <button 
            onClick={saveQuickNote}
            className={styles.quickAddBtn} 
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '8px', borderRadius: 'var(--radius-md)' }}
          >
            <Sparkles size={14} />
            <span>Save to Notes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
