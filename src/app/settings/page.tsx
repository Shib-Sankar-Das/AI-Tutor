'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Brain,
  User,
  Volume2,
  Globe,
  Moon,
  Sun,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase, updateProfile } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toaster';
import { MemoryProfile } from '@/components/chat/MemoryProfile';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिंदी)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'zh', label: 'Chinese (中文)' },
  { value: 'ja', label: 'Japanese (日本語)' },
];

const VOICES = [
  { value: 'en-US-AriaNeural', label: 'Aria (Female, US)' },
  { value: 'en-US-GuyNeural', label: 'Guy (Male, US)' },
  { value: 'en-GB-SoniaNeural', label: 'Sonia (Female, UK)' },
  { value: 'en-IN-NeerjaNeural', label: 'Neerja (Female, India)' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, user, setUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      updateSettings(localSettings);

      // Update in Supabase if user is logged in
      if (user?.id) {
        await updateProfile(user.id, {
          language: localSettings.language,
          preferences: {
            ...user.preferences,
            voiceEnabled: localSettings.voiceEnabled,
          },
        });
      }

      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
      showToast('Signed out successfully', 'success');
    } catch (error) {
      showToast('Failed to sign out', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-primary-600" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Settings
                </span>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </h2>
          
          {user ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">
                  Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {user.fullName || 'Not set'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400">
                  Grade Level
                </label>
                <p className="text-gray-900 dark:text-white font-medium capitalize">
                  {user.grade || 'Not set'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Sign in to save your progress and preferences
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Sign In
              </Link>
            </div>
          )}
        </section>

        {/* Language Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Language
            </label>
            <select
              value={localSettings.language}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, language: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              The AI will respond primarily in this language
            </p>
          </div>
        </section>

        {/* Voice Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Voice Settings
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">
                  Enable Voice Output
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Hear AI responses read aloud
                </p>
              </div>
              <button
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    voiceEnabled: !localSettings.voiceEnabled,
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  localSettings.voiceEnabled
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    localSettings.voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Voice Selection
              </label>
              <select
                disabled={!localSettings.voiceEnabled}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                {VOICES.map((voice) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            {localSettings.theme === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
            Appearance
          </h2>
          
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setLocalSettings({ ...localSettings, theme })}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors capitalize ${
                  localSettings.theme === theme
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>

        {/* AI Memory Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <MemoryProfile />
        </section>
      </main>
    </div>
  );
}
