'use client';

import React, { useState, useEffect } from 'react';
import { Target, Layers } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Plan } from 'shared-types';

export default function PlannerPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  
  const [priority1, setPriority1] = useState('Build complete offline syncing mechanism');
  const [priority2, setPriority2] = useState('Perfect SwiftUI layouts for Today view');
  const [priority3, setPriority3] = useState('Publish public Next.js and API monorepo');

  const loadCache = async () => {
    const cachedPlans = await SyncEngine.getLocalItems<Plan>('plans');
    setPlans(cachedPlans);
    setWorkspaceId(localStorage.getItem('max_tasks_workspace_id') || '');
  };

  useEffect(() => {
    loadCache();
    window.addEventListener('local-cache-update', loadCache);
    return () => window.removeEventListener('local-cache-update', loadCache);
  }, []);

  return (
    <div className={styles.plannerGrid}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Weekly Planning Objectives</span>
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Focus on these top 3 priorities to move your projects and habits forward this week.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-primary)' }}>Priority #1</span>
            <input
              type="text"
              value={priority1}
              onChange={e => setPriority1(e.target.value)}
              className={styles.formInput}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-gold)' }}>Priority #2</span>
            <input
              type="text"
              value={priority2}
              onChange={e => setPriority2(e.target.value)}
              className={styles.formInput}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-purple)' }}>Priority #3</span>
            <input
              type="text"
              value={priority3}
              onChange={e => setPriority3(e.target.value)}
              className={styles.formInput}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--color-surface-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>Weekly Review Memo</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Review tasks completed last week, update project health statuses, and ensure calendar blocks are allocated correctly for focus work.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} style={{ color: 'var(--color-gold)' }} />
          <span>Active Plans & Vision Goals</span>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ padding: '16px', backgroundColor: 'var(--color-surface-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{plan.title}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-gold)', border: '1px solid rgba(230, 175, 46, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                  {plan.type}
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{plan.vision}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flexGrow: 1, height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${plan.progress}%`, backgroundColor: 'var(--color-primary)' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{plan.progress}%</span>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No plans registered yet. Go to Plans page to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
