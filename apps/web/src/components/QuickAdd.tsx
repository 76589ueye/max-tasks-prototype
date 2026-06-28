'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function QuickAdd({ isOpen, onClose, workspaceId }: QuickAddProps) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setText('');
      setPreview(null);
    }
  }, [isOpen]);

  const parseNLP = (input: string) => {
    if (!input.trim()) return null;

    let title = input;
    let dueDate = new Date();
    let timeOfDay = '09:00';
    let expectedDuration = 30;

    if (input.toLowerCase().includes('tomorrow') || input.includes('بكرة') || input.includes('غدا')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow;
      title = title
        .replace(/tomorrow/gi, '')
        .replace(/بكرة/g, '')
        .replace(/غدا/g, '');
    }

    const durationRegex = /(?:for|لمدة)\s*(\d+)\s*(?:minutes|minute|min|دقيقة|د القا)?/i;
    const durationMatch = title.match(durationRegex);
    if (durationMatch) {
      expectedDuration = parseInt(durationMatch[1], 10);
      title = title.replace(durationRegex, '');
    }

    const arabicTimeRegex = /(?:الساعة|في تمام)?\s*(\d+)\s*(?:العصر|عصرا|المساء|مساء|الليل|ليلا|الصبح|صباحا|AM|PM)/i;
    const englishTimeRegex = /(?:at)\s*(\d+)(?:\s*(am|pm))?/i;
    
    const arMatch = title.match(arabicTimeRegex);
    if (arMatch) {
      let hour = parseInt(arMatch[1], 10);
      const indicator = arMatch[0].toLowerCase();
      if ((indicator.includes('مساء') || indicator.includes('عصرا') || indicator.includes('الليل') || indicator.includes('pm')) && hour < 12) {
        hour += 12;
      }
      timeOfDay = `${hour.toString().padStart(2, '0')}:00`;
      title = title.replace(arabicTimeRegex, '');
    } else {
      const enMatch = title.match(englishTimeRegex);
      if (enMatch) {
        let hour = parseInt(enMatch[1], 10);
        const ampm = enMatch[2] ? enMatch[2].toLowerCase() : 'pm';
        if (ampm === 'pm' && hour < 12) {
          hour += 12;
        } else if (ampm === 'am' && hour === 12) {
          hour = 0;
        }
        timeOfDay = `${hour.toString().padStart(2, '0')}:00`;
        title = title.replace(englishTimeRegex, '');
      }
    }

    title = title.replace(/\s+/g, ' ').trim();

    return {
      title: title || 'New Task',
      dueDate,
      timeOfDay,
      expectedDuration,
      status: 'INBOX' as const,
      priority: 'MEDIUM' as const
    };
  };

  useEffect(() => {
    setPreview(parseNLP(text));
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseNLP(text);
    if (!parsed) return;

    const newId = crypto.randomUUID();
    await SyncEngine.applyLocalChange('tasks', 'INSERT', newId, {
      title: parsed.title,
      description: 'Added via Smart Quick Add',
      status: parsed.status,
      priority: parsed.priority,
      dueDate: parsed.dueDate.toISOString(),
      timeOfDay: parsed.timeOfDay,
      expectedDuration: parsed.expectedDuration,
      workspaceId
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className={styles.modalHeader} style={{ borderBottom: 'none' }}>
          <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Smart Quick Add</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '0 16px 16px 16px' }}>
          <input
            ref={inputRef}
            type="text"
            className={styles.modalInput}
            style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-surface-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '14px' }}
            placeholder="e.g. Call client tomorrow at 4 PM for 30 minutes..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          
          {preview && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255, 77, 42, 0.05)', borderRadius: 'var(--radius-md)', border: '1px border-style: dashed var(--border-color)', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>Preview Extraction:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--color-text-secondary)' }}>
                <div><strong>Title:</strong> {preview.title}</div>
                <div><strong>Due Date:</strong> {preview.dueDate.toDateString()}</div>
                <div><strong>Time:</strong> {preview.timeOfDay}</div>
                <div><strong>Expected Duration:</strong> {preview.expectedDuration} mins</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} className={styles.actionBtn} style={{ padding: '8px 16px' }}>Cancel</button>
            <button type="submit" className={styles.quickAddBtn} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
