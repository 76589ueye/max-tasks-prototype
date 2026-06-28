'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Flame, Check } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Habit, HabitLog } from 'shared-types';

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');

  const [habitName, setHabitName] = useState('');
  const [frequency, setFrequency] = useState('DAILY');

  const loadCache = async () => {
    const cachedHabits = await SyncEngine.getLocalItems<Habit>('habits');
    const cachedLogs = await SyncEngine.getLocalItems<HabitLog>('habitLogs');
    setHabits(cachedHabits);
    setLogs(cachedLogs);
    setWorkspaceId(localStorage.getItem('max_tasks_workspace_id') || '');
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    const newId = crypto.randomUUID();
    await SyncEngine.applyLocalChange('habits', 'INSERT', newId, {
      name: habitName,
      frequency,
      streak: 0,
      workspaceId
    });

    setHabitName('');
  };

  const getPast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dates = getPast7Days();

  const toggleDay = async (habitId: string, dateStr: string) => {
    const existingIndex = logs.findIndex(log => log.habitId === habitId && log.date === dateStr);
    
    if (existingIndex > -1) {
      const log = logs[existingIndex];
      await SyncEngine.applyLocalChange('habitLogs', 'DELETE', log.id, null);
    } else {
      const newLogId = crypto.randomUUID();
      await SyncEngine.applyLocalChange('habitLogs', 'INSERT', newLogId, {
        habitId,
        date: dateStr,
        completed: true
      });
    }

    const currentLogs = await SyncEngine.getLocalItems<HabitLog>('habitLogs');
    const habitLogs = currentLogs.filter(l => l.habitId === habitId);
    let streak = 0;
    const checkDates = [...dates].reverse();
    for (const d of checkDates) {
      const completed = habitLogs.some(l => l.date === d);
      if (completed) streak++;
      else break;
    }

    await SyncEngine.applyLocalChange('habits', 'UPDATE', habitId, { streak });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700 }}>Habit Tracking</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {habits.map(habit => {
            const habitLogs = logs.filter(l => l.habitId === habit.id);

            return (
              <div key={habit.id} className={styles.habitTrackerRow}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>{habit.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-status-in-progress)' }}>
                    <Flame size={12} />
                    <span>{habit.streak} day streak</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {dates.map(dateStr => {
                    const isCompleted = habitLogs.some(l => l.date === dateStr);
                    const dayLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'narrow' });

                    return (
                      <div
                        key={dateStr}
                        onClick={() => toggleDay(habit.id, dateStr)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isCompleted ? 'var(--color-status-completed)' : 'var(--color-surface-high)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: isCompleted ? '#FFF' : 'var(--color-text-muted)',
                          transition: 'all var(--transition-fast)'
                        }}
                        title={dateStr}
                      >
                        {isCompleted ? <Check size={12} /> : dayLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {habits.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No habits set up. Setup a recurring daily routine in the panel.
            </div>
          )}
        </div>
      </div>

      <div className={styles.card} style={{ height: 'fit-content' }}>
        <h3 className={styles.cardTitle}>Set Habit</h3>
        <form onSubmit={handleCreateHabit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Habit Name</label>
            <input
              type="text"
              required
              value={habitName}
              onChange={e => setHabitName(e.target.value)}
              className={styles.formInput}
              placeholder="e.g. Read Swift book"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Frequency</label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              className={styles.formSelect}
            >
              <option value="DAILY">Every Day</option>
              <option value="WEEKLY">Once a Week</option>
            </select>
          </div>

          <button type="submit" className={styles.quickAddBtn} style={{ justifyContent: 'center', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <Plus size={16} />
            <span>Create Habit</span>
          </button>
        </form>
      </div>
    </div>
  );
}
