'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { CalendarEvent } from 'shared-types';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadCache = async () => {
    const cachedEvents = await SyncEngine.getLocalItems<CalendarEvent>('calendarEvents');
    setEvents(cachedEvents);
    setWorkspaceId(localStorage.getItem('max_tasks_workspace_id') || '');
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(new Date(year, month, i));
  }

  const handleCellClick = (date: Date) => {
    setSelectedDateStr(date.toISOString().split('T')[0]);
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newId = crypto.randomUUID();
    const startDate = new Date(`${selectedDateStr}T10:00:00`);
    const endDate = new Date(`${selectedDateStr}T11:30:00`);

    await SyncEngine.applyLocalChange('calendarEvents', 'INSERT', newId, {
      title: newTitle,
      description: newDesc,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isAllDay: false,
      workspaceId
    });

    setShowAddModal(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.calendarHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            {monthNames[month]} {year}
          </h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handlePrevMonth} className={styles.actionBtn} style={{ border: '1px solid var(--border-color)' }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNextMonth} className={styles.actionBtn} style={{ border: '1px solid var(--border-color)' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border-color)', padding: '1px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ backgroundColor: 'var(--color-surface-low)', padding: '10px 0', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            {day}
          </div>
        ))}
        {daysArray.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} style={{ backgroundColor: 'var(--color-surface-low)' }} />;
          }

          const isToday = date.toDateString() === new Date().toDateString();
          const cellDateStr = date.toISOString().split('T')[0];

          const cellEvents = events.filter(e => {
            const evDateStr = new Date(e.startDate).toISOString().split('T')[0];
            return evDateStr === cellDateStr;
          });

          return (
            <div
              key={`day-${date.getDate()}`}
              className={`${styles.calendarCell} ${isToday ? styles.calendarCellToday : ''}`}
              onClick={() => handleCellClick(date)}
              style={{ minHeight: '120px', backgroundColor: 'var(--color-surface)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
            >
              <div className={styles.calendarCellHeader}>
                <span style={isToday ? { color: 'var(--color-primary)', fontWeight: 800 } : {}}>{date.getDate()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', flexGrow: 1 }}>
                {cellEvents.map(event => (
                  <div key={event.id} className={styles.calendarItem}>
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <CalIcon size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 600 }}>Add Calendar Event</span>
            </div>
            <form onSubmit={handleCreateEvent} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Event Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g. Design review meeting"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className={styles.formInput}
                  style={{ minHeight: '80px', resize: 'none' }}
                  placeholder="Details about this calendar slot..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.actionBtn}>Cancel</button>
                <button type="submit" className={styles.quickAddBtn}>Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
