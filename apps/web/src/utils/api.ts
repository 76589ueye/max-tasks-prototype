import { SyncMutation, SyncRequest, SyncResponse } from 'shared-types';
import { getStoreItems, setStoreItems, putStoreItem, deleteStoreItem } from './db';

const API_URL = typeof window === 'undefined' ? 'http://localhost:8080/api/v1' : '/api/v1';

export class SyncEngine {
  static isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  // Get local cache for a table via IndexedDB
  static async getLocalItems<T>(table: string): Promise<T[]> {
    return getStoreItems<T>(table);
  }

  // Apply mutations locally immediately (Optimistic Update) using IndexedDB
  static async applyLocalChange(table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', entityId: string, data: any): Promise<void> {
    const items = await this.getLocalItems<any>(table);
    const existing = items.find(i => i.id === entityId);
    
    let revision = 1;
    if (existing) {
      revision = (existing.revision || 1) + (type === 'UPDATE' ? 1 : 0);
    }

    if (type === 'INSERT') {
      const newItem = { 
        id: entityId, 
        ...data, 
        revision: 1,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      };
      await putStoreItem(table, newItem);
    } else if (type === 'UPDATE') {
      const updatedItem = { 
        ...existing, 
        ...data, 
        revision,
        updatedAt: new Date().toISOString() 
      };
      await putStoreItem(table, updatedItem);
    } else if (type === 'DELETE') {
      await deleteStoreItem(table, entityId);
    }

    // Queue mutation for backend replication in IndexedDB store
    const queueId = crypto.randomUUID();
    await putStoreItem('sync_queue', {
      id: queueId,
      type,
      table,
      entityId,
      data: type !== 'DELETE' ? { ...data, revision } : null,
      clientRevision: revision,
      clientTimestamp: Date.now()
    });

    // Fire custom event to notify components to re-render
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('local-cache-update', { detail: { table } }));
    }

    // Try to sync instantly if online
    if (this.isOnline()) {
      this.syncWithBackend().catch(err => console.error('Auto sync failed:', err));
    }
  }

  // Trigger synchronization with backend
  static async syncWithBackend(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Fetch queue from IndexedDB sync_queue store
    const queue: any[] = await getStoreItems('sync_queue');
    const lastSyncTimestamp = Number(localStorage.getItem('last_sync_timestamp') || '0');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = localStorage.getItem('max_tasks_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers,
        credentials: 'include', // Ensure HTTP-Only session cookies are transmitted
        body: JSON.stringify({
          lastSyncTimestamp,
          mutations: queue.map(q => ({
            type: q.type,
            table: q.table,
            entityId: q.entityId,
            data: q.data,
            clientRevision: q.clientRevision,
            clientTimestamp: q.clientTimestamp
          }))
        } as SyncRequest)
      });

      if (!response.ok) {
        throw new Error('Sync endpoint returned error');
      }

      const result: SyncResponse = await response.json();

      // Clear sync queue of processed items
      await setStoreItems('sync_queue', []);
      localStorage.setItem('last_sync_timestamp', result.serverTimestamp.toString());

      // Merge server updates into IndexedDB stores
      for (const table of Object.keys(result.updatedEntities)) {
        const serverItems = result.updatedEntities[table];
        const localItems = await this.getLocalItems<any>(table);
        const serverDeletedIds = result.deletedIds[table] || [];

        // Combine items: keep server items if they are not deleted
        let merged = localItems.filter(li => !serverItems.some(si => si.id === li.id) && !serverDeletedIds.includes(li.id));
        merged = [...merged, ...serverItems.filter(si => !serverDeletedIds.includes(si.id))];

        await setStoreItems(table, merged);
      }

      // Handle server deletion list
      for (const table of Object.keys(result.deletedIds)) {
        const deletedList = result.deletedIds[table];
        for (const deletedId of deletedList) {
          await deleteStoreItem(table, deletedId);
        }
      }

      // Log conflicts for user review if any
      if (result.conflicts && result.conflicts.length > 0) {
        console.warn('Conflicts encountered during sync:', result.conflicts);
        window.dispatchEvent(new CustomEvent('sync-conflicts-detected', { detail: result.conflicts }));
      }

      // Re-trigger component updates
      window.dispatchEvent(new CustomEvent('local-cache-update', { detail: { table: 'all' } }));

      return true;
    } catch (error) {
      console.warn('Sync failed, changes remains in IndexedDB queue:', error);
      return false;
    }
  }

  // Direct REST actions
  static async executeDirectRequest(endpoint: string, method: string, body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('max_tasks_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      credentials: 'include', // Ensure HTTP-Only session cookies are transmitted
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown API error' }));
      throw new Error(err.error || 'Request failed');
    }

    return response.json();
  }

  private static ws: WebSocket | null = null;

  static initRealtimeWebSocket(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    const wsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const wsUrl = `ws://${wsHost}:8080`;
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Realtime WS connection established with Max Tasks backend.');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'reconcile') {
            console.log('Realtime update broadcast received. Synchronizing local cache...');
            this.syncWithBackend();
          }
        } catch (e) {}
      };

      this.ws.onclose = () => {
        console.log('Realtime WS closed. Reconnecting in 5 seconds...');
        setTimeout(() => this.initRealtimeWebSocket(), 5000);
      };

      this.ws.onerror = () => {
        // Suppress print to avoid clutter, connection closed handler will retry
      };
    } catch (e) {
      console.error('Failed to start Realtime WS socket client:', e);
    }
  }
}
