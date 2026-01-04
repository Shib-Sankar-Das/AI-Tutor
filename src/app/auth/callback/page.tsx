'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/login?error=auth_failed');
          return;
        }

        if (session) {
          // Store the provider token for Google API access
          if (session.provider_token) {
            localStorage.setItem('google_access_token', session.provider_token);
          }
          if (session.provider_refresh_token) {
            localStorage.setItem('google_refresh_token', session.provider_refresh_token);
          }
          
          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Callback error:', err);
        router.push('/auth/login?error=unknown');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Completing sign in...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Please wait while we set up your account
        </p>
      </div>
    </div>
  );
}
