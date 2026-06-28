'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pin, Folder, File, Trash, Sparkles } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Note, Folder as NoteFolder } from 'shared-types';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');

  const [newFolderName, setNewFolderName] = useState('');

  const loadCache = async () => {
    const allNotes = await SyncEngine.getLocalItems<Note>('notes');
    const allFolders = await SyncEngine.getLocalItems<NoteFolder>('folders');
    setNotes(allNotes);
    setFolders(allFolders);
    setWorkspaceId(localStorage.getItem('max_tasks_workspace_id') || '');

    if (allNotes.length > 0 && !selectedNote) {
      setSelectedNote(allNotes.find(n => n.isPinned) || allNotes[0]);
    }
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  const handleCreateNote = async () => {
    const newId = crypto.randomUUID();
    const newNote = {
      title: 'Untitled Note',
      content: '# Untitled Note\n\nStart writing in markdown here...',
      isPinned: false,
      workspaceId
    };

    await SyncEngine.applyLocalChange('notes', 'INSERT', newId, newNote);
    const addedNote = { id: newId, ...newNote, createdAt: new Date(), updatedAt: new Date(), revision: 1 };
    setSelectedNote(addedNote);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newId = crypto.randomUUID();
    await SyncEngine.applyLocalChange('folders', 'INSERT', newId, {
      name: newFolderName,
      workspaceId
    });
    setNewFolderName('');
  };

  const handleUpdateNote = async (fields: Partial<Note>) => {
    if (!selectedNote) return;

    const updated = { ...selectedNote, ...fields };
    setSelectedNote(updated);

    await SyncEngine.applyLocalChange('notes', 'UPDATE', selectedNote.id, fields);
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      await SyncEngine.applyLocalChange('notes', 'DELETE', id, null);
      setSelectedNote(null);
    }
  };

  return (
    <div className={styles.notesGrid}>
      <div className={styles.noteSidebar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Notes Folder</span>
          <button onClick={handleCreateNote} className={styles.actionBtn} title="Create note">
            <Plus size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
          {folders.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', padding: '6px' }}>
              <Folder size={14} style={{ color: 'var(--color-gold)' }} />
              <span>{f.name}</span>
            </div>
          ))}
          <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <input
              type="text"
              placeholder="+ New folder..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className={styles.formInput}
              style={{ padding: '4px 8px', fontSize: '11px', flexGrow: 1 }}
            />
          </form>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Documents</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flexGrow: 1 }}>
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={`${styles.noteSidebarItem} ${selectedNote?.id === note.id ? styles.noteSidebarItemActive : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <File size={12} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title}</span>
              </div>
              {note.isPinned && <Pin size={10} style={{ color: 'var(--color-primary)' }} />}
            </div>
          ))}
        </div>
      </div>

      {selectedNote ? (
        <div className={styles.noteEditor}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              value={selectedNote.title}
              onChange={e => handleUpdateNote({ title: e.target.value })}
              className={styles.noteTitleInput}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleUpdateNote({ isPinned: !selectedNote.isPinned })}
                className={styles.actionBtn}
                style={selectedNote.isPinned ? { color: 'var(--color-primary)' } : {}}
                title="Pin Note"
              >
                <Pin size={16} />
              </button>
              <button
                onClick={() => handleDeleteNote(selectedNote.id)}
                className={styles.actionBtn}
                style={{ color: 'var(--color-status-late)' }}
                title="Delete Note"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>

          <textarea
            value={selectedNote.content}
            onChange={e => handleUpdateNote({ content: e.target.value })}
            className={styles.noteBodyInput}
            placeholder="Write markdown here..."
          />
        </div>
      ) : (
        <div className={styles.noteEditor} style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>
          <Sparkles size={40} style={{ color: 'var(--color-primary-dim)', marginBottom: '16px' }} />
          <span>Select or create a markdown note to begin editing</span>
        </div>
      )}
    </div>
  );
}
