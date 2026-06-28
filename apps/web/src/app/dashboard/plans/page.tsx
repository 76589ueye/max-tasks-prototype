'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import styles from '@/styles/dashboard.module.css';
import { SyncEngine } from '@/utils/api';
import { Plan } from 'shared-types';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [vision, setVision] = useState('');
  const [planType, setPlanType] = useState('PERSONAL');

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

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newId = crypto.randomUUID();
    await SyncEngine.applyLocalChange('plans', 'INSERT', newId, {
      title,
      vision,
      type: planType,
      progress: 0,
      workspaceId
    });

    setTitle('');
    setVision('');
  };

  const applyTemplate = async (type: string) => {
    const newId = crypto.randomUUID();
    let planData: any = {};

    if (type === 'STUDY') {
      planData = {
        title: 'SwiftUI Mastery Intensive 📚',
        vision: 'Build a production-grade application entirely native using modern patterns.',
        type: 'STUDY',
        progress: 10,
        workspaceId
      };
    } else if (type === 'PROJECT_LAUNCH') {
      planData = {
        title: 'Beta Launch Campaign 🚀',
        vision: 'Get 500 verified beta signups by running focused social releases.',
        type: 'PROJECT_LAUNCH',
        progress: 20,
        workspaceId
      };
    } else if (type === 'TRAVEL') {
      planData = {
        title: 'Tokyo Summer Expedition ✈️',
        vision: '14-day trip focusing on local food, culture, and architecture sketching.',
        type: 'TRAVEL',
        progress: 0,
        workspaceId
      };
    }

    await SyncEngine.applyLocalChange('plans', 'INSERT', newId, planData);
    
    if (type === 'STUDY') {
      await SyncEngine.applyLocalChange('tasks', 'INSERT', crypto.randomUUID(), {
        title: 'Read chapter on SwiftUI State and Binding',
        status: 'PLANNED',
        priority: 'HIGH',
        planId: newId,
        workspaceId
      });
      await SyncEngine.applyLocalChange('tasks', 'INSERT', crypto.randomUUID(), {
        title: 'Practice creating custom transition animations',
        status: 'INBOX',
        priority: 'MEDIUM',
        planId: newId,
        workspaceId
      });
    }

    alert('Template applied! Check your tasks list and dashboard planner.');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700 }}>Vision Plans</h2>

        <div className={styles.card} style={{ marginBottom: '24px', backgroundColor: 'rgba(255, 77, 42, 0.03)' }}>
          <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)' }}>
            <Sparkles size={16} />
            <span>Predefined Launch Templates</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <button onClick={() => applyTemplate('PROJECT_LAUNCH')} className={styles.actionBtn} style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: 'auto', textAlign: 'center' }}>
              <span style={{ fontSize: '18px' }}>🚀</span>
              <strong>Launch Campaign</strong>
            </button>
            <button onClick={() => applyTemplate('STUDY')} className={styles.actionBtn} style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: 'auto', textAlign: 'center' }}>
              <span style={{ fontSize: '18px' }}>📚</span>
              <strong>Study Program</strong>
            </button>
            <button onClick={() => applyTemplate('TRAVEL')} className={styles.actionBtn} style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: 'auto', textAlign: 'center' }}>
              <span style={{ fontSize: '18px' }}>✈️</span>
              <strong>Travel Plan</strong>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map(plan => (
            <div key={plan.id} className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{plan.title}</h4>
                <span style={{ fontSize: '11px', color: 'var(--color-gold)', textTransform: 'uppercase', border: '1px solid rgba(230, 175, 46, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                  {plan.type}
                </span>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{plan.vision}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flexGrow: 1, height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${plan.progress}%`, backgroundColor: 'var(--color-primary)' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{plan.progress}% Progress</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card} style={{ height: 'fit-content' }}>
        <h3 className={styles.cardTitle}>Custom Plan</h3>
        <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.formInput}
              placeholder="e.g. Annual Fitness Goal"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Vision Statement</label>
            <textarea
              required
              value={vision}
              onChange={e => setVision(e.target.value)}
              className={styles.formInput}
              style={{ minHeight: '80px', resize: 'none' }}
              placeholder="What does success look like?"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Type</label>
            <select
              value={planType}
              onChange={e => setPlanType(e.target.value)}
              className={styles.formSelect}
            >
              <option value="PERSONAL">Personal</option>
              <option value="STUDY">Study / Learn</option>
              <option value="TRAVEL">Travel</option>
              <option value="PROJECT_LAUNCH">Project Launch</option>
            </select>
          </div>

          <button type="submit" className={styles.quickAddBtn} style={{ justifyContent: 'center', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <Plus size={16} />
            <span>Create Vision</span>
          </button>
        </form>
      </div>
    </div>
  );
}
