'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('max_tasks_token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div style={{
      backgroundColor: '#0B0C0F',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9B9FA9',
      fontFamily: 'sans-serif'
    }}>
      Loading MaX Tasks...
    </div>
  );
}
