'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Sun, Tray, Checklist, Calendar, Map, Folder, NoteText, 
  ChartBar, Timer, MagnifyingGlass, Plus, LogOut, Menu, Globe 
} from '@/components/Icons';
import styles from '@/styles/dashboard.module.css';
import CommandPalette from '@/components/CommandPalette';
import QuickAdd from '@/components/QuickAdd';
import { SyncEngine } from '@/utils/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  // App states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [user, setUser] = useState<any>({ name: 'User', email: '' });
  const [workspaceId, setWorkspaceId] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [queueCount, setQueueCount] = useState(0);

  // Authentication check using HTTP-Only Session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await SyncEngine.executeDirectRequest('/auth/me', 'GET');
        setUser(data.user);
        setWorkspaceId(data.workspaceId);
        localStorage.setItem('max_tasks_workspace_id', data.workspaceId);
        
        // Initial IndexedDB Cache synchronization
        await SyncEngine.syncWithBackend();
        SyncEngine.initRealtimeWebSocket();
      } catch (err) {
        console.warn('Session verification failed, redirecting to login:', err);
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  // Sync state tracking loop
  useEffect(() => {
    const checkSyncStatus = async () => {
      const isOnline = SyncEngine.isOnline();
      const queue = await SyncEngine.getLocalItems<any>('sync_queue');
      setQueueCount(queue.length);

      if (!isOnline) {
        setSyncStatus('offline');
      } else if (queue.length > 0) {
        setSyncStatus('syncing');
      } else {
        setSyncStatus('synced');
      }
    };

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000);
    window.addEventListener('local-cache-update', checkSyncStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('local-cache-update', checkSyncStatus);
    };
  }, []);

  // Keyboard shortcut listener (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await SyncEngine.executeDirectRequest('/auth/logout', 'POST');
    } catch (err) {}
    localStorage.removeItem('max_tasks_workspace_id');
    router.push('/login');
  };

  const toggleLanguage = () => {
    const currentLang = localStorage.getItem('max_tasks_lang') || 'en';
    const nextLang = currentLang === 'ar' ? 'en' : 'ar';
    window.dispatchEvent(new CustomEvent('toggle-language', { detail: nextLang }));
  };

  const handleNavigation = (view: string) => {
    router.push(`/dashboard/${view === 'today' ? '' : view}`);
  };

  const handleSelectEntity = (table: string, id: string) => {
    window.dispatchEvent(new CustomEvent('select-detail-entity', { detail: { table, id } }));
  };

  // Helper to check active nav link
  const isActive = (view: string) => {
    if (view === 'today' && pathname === '/dashboard') return true;
    return pathname === `/dashboard/${view}`;
  };

  return (
    <div className={styles.container}>
      {/* SIDEBAR (macOS system style) */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div>
          <div className={styles.brand}>
            <div className={styles.logo}>M</div>
            {!sidebarCollapsed && <span className={styles.brandName}>MaX Tasks</span>}
          </div>

          <nav className={styles.nav}>
            <button onClick={() => handleNavigation('today')} className={`${styles.navItem} ${isActive('today') ? styles.navItemActive : ''}`}>
              <Sun size={18} />
              {!sidebarCollapsed && <span>Today</span>}
            </button>
            <button onClick={() => handleNavigation('tasks')} className={`${styles.navItem} ${isActive('tasks') ? styles.navItemActive : ''}`}>
              <Checklist size={18} />
              {!sidebarCollapsed && <span>Tasks</span>}
            </button>
            <button onClick={() => handleNavigation('calendar')} className={`${styles.navItem} ${isActive('calendar') ? styles.navItemActive : ''}`}>
              <Calendar size={18} />
              {!sidebarCollapsed && <span>Calendar</span>}
            </button>
            <button onClick={() => handleNavigation('planner')} className={`${styles.navItem} ${isActive('planner') ? styles.navItemActive : ''}`}>
              <Map size={18} />
              {!sidebarCollapsed && <span>Planner</span>}
            </button>
            <button onClick={() => handleNavigation('projects')} className={`${styles.navItem} ${isActive('projects') ? styles.navItemActive : ''}`}>
              <Folder size={18} />
              {!sidebarCollapsed && <span>Projects</span>}
            </button>
            <button onClick={() => handleNavigation('notes')} className={`${styles.navItem} ${isActive('notes') ? styles.navItemActive : ''}`}>
              <NoteText size={18} />
              {!sidebarCollapsed && <span>Notes</span>}
            </button>
            <button onClick={() => handleNavigation('habits')} className={`${styles.navItem} ${isActive('habits') ? styles.navItemActive : ''}`}>
              <ChartBar size={18} />
              {!sidebarCollapsed && <span>Habits</span>}
            </button>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            )}
          </div>

          <div className={styles.footerActions}>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={styles.actionBtn} title="Collapse sidebar">
              <Menu size={16} />
            </button>
            {!sidebarCollapsed && (
              <>
                <button onClick={toggleLanguage} className={styles.actionBtn} title="Toggle Language">
                  <Globe size={16} />
                </button>
                <button onClick={handleLogout} className={styles.actionBtn} title="Logout" style={{ color: 'var(--color-status-late)' }}>
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* WORKSPACE AREA */}
      <div className={styles.workspace}>
        {/* TOP BAR */}
        <header className={styles.topbar}>
          <div className={styles.searchBar} onClick={() => setIsCommandPaletteOpen(true)}>
            <MagnifyingGlass size={16} />
            <span>Search or command...</span>
            <kbd className={styles.shortcutHint}>Ctrl K</kbd>
          </div>

          <div className={styles.topbarActions}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {syncStatus === 'offline' && <span style={{ color: 'var(--color-status-late)' }}>● Offline</span>}
              {syncStatus === 'syncing' && <span style={{ color: 'var(--color-status-in-progress)' }}>● Syncing ({queueCount})</span>}
              {syncStatus === 'synced' && <span style={{ color: 'var(--color-status-completed)' }}>● Synced</span>}
            </div>

            <button className={styles.quickAddBtn} onClick={() => setIsQuickAddOpen(true)}>
              <Plus size={16} />
              <span>Smart Add</span>
            </button>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>

      {/* OVERLAYS */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigation}
        onSelectEntity={handleSelectEntity}
      />
      
      <QuickAdd
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
