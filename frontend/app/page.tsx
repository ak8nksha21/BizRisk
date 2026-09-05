'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import LandingPage from '../components/landing/LandingPage';

export default function Home() {
  const router = useRouter();
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      router.replace('/dashboard');
    }
  }, [mounted, token, router]);

  // Gate the token-dependent branch behind `mounted` (a plain useState(false)
  // that renders identically on server and first client paint) so hydration
  // never diffs a token-derived tree against the server's guest-view render.
  if (mounted && token) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return <LandingPage />;
}
