'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Compass, FileText, CheckSquare, Layers, Globe } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onSelectEntity: (table: string, id: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate, onSelectEntity }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIdx(0);
      
      // Async cache read on open
      const loadSearchData = async () => {
        setTasks(await SyncEngine.getLocalItems('tasks'));
        setNotes(await SyncEngine.getLocalItems('notes'));
        setProjects(await SyncEngine.getLocalItems('projects'));
      };
      loadSearchData();
    }
  }, [isOpen]);

  const staticCommands = [
    { label: 'Go to Today', action: () => onNavigate('today'), icon: Compass, category: 'Navigation' },
    { label: 'View Tasks', action: () => onNavigate('tasks'), icon: CheckSquare, category: 'Navigation' },
    { label: 'Toggle Language (العربية / English)', action: () => {
      const currentLang = localStorage.getItem('max_tasks_lang') || 'en';
      const nextLang = currentLang === 'ar' ? 'en' : 'ar';
      window.dispatchEvent(new CustomEvent('toggle-language', { detail: nextLang }));
    }, icon: Globe, category: 'Settings' },
  ];

  const searchResults: any[] = [];

  tasks.forEach(task => {
    if (task.title.toLowerCase().includes(query.toLowerCase())) {
      searchResults.push({
        label: task.title,
        action: () => onSelectEntity('tasks', task.id),
        icon: CheckSquare,
        category: 'Tasks'
      });
    }
  });

  notes.forEach(note => {
    if (note.title.toLowerCase().includes(query.toLowerCase())) {
      searchResults.push({
        label: note.title,
        action: () => onSelectEntity('notes', note.id),
        icon: FileText,
        category: 'Notes'
      });
    }
  });

  projects.forEach(project => {
    if (project.name.toLowerCase().includes(query.toLowerCase())) {
      searchResults.push({
        label: project.name,
        action: () => onSelectEntity('projects', project.id),
        icon: Layers,
        category: 'Projects'
      });
    }
  });

  const combined = [...staticCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())), ...searchResults].slice(0, 8);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => (prev + 1) % combined.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => (prev - 1 + combined.length) % combined.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combined[selectedIdx]) {
        combined[selectedIdx].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={styles.modalHeader}>
          <Search size={18} className={styles.iconMuted} />
          <input
            ref={inputRef}
            type="text"
            className={styles.modalInput}
            placeholder="Type a command or search details..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.modalBody}>
          {combined.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
              No commands or entities found
            </div>
          ) : (
            combined.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={`${styles.modalRow} ${idx === selectedIdx ? styles.modalRowSelected : ''}`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                >
                  <Icon size={16} />
                  <span style={{ flexGrow: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
