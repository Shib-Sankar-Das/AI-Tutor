'use client';

import { useState, useEffect } from 'react';
import { Brain, BookOpen, Target, Lightbulb, RefreshCw, Trash2, Clock, TrendingUp, Star } from 'lucide-react';
import { useAppStore, MemoryProfile as MemoryProfileType } from '@/lib/store';
import { showToast } from '@/components/ui/Toaster';

interface MemoryData {
  profile: {
    learning_style?: string[];
    interests?: string[];
    challenges?: string[];
    proficiencies?: Record<string, { level: string; last_updated: string }>;
    preferences?: Record<string, string>;
  };
  strategies?: Array<{
    description: string;
    success_rate: number;
    topic?: string;
  }>;
  recentTopics?: string[];
}

export function MemoryProfile() {
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, setMemoryProfile } = useAppStore();

  const fetchMemoryProfile = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch profile and strategies in parallel
      const [profileRes, strategiesRes] = await Promise.all([
        fetch(`/api/memory/profile/${user.id}`),
        fetch(`/api/memory/strategies/${user.id}`),
      ]);
      
      const profileData = await profileRes.json();
      const strategiesData = await strategiesRes.json();
      
      const data: MemoryData = {
        profile: profileData.profile || {},
        strategies: strategiesData.strategies || [],
      };
      
      setMemoryData(data);
      
      // Update global store
      if (profileData.profile) {
        setMemoryProfile({
          learningStyle: profileData.profile.learning_style || [],
          interests: profileData.profile.interests || [],
          challenges: profileData.profile.challenges || [],
          proficiencies: profileData.profile.proficiencies || {},
          preferences: profileData.profile.preferences || {},
        });
      }
    } catch (error) {
      console.error('Failed to fetch memory profile:', error);
      showToast('Failed to load memory profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoryProfile();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500">
        Sign in to view your learning profile
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Memory Profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              What the AI tutor has learned about you
            </p>
          </div>
        </div>
        <button
          onClick={fetchMemoryProfile}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh profile"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !memoryData ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Learning Style */}
          <MemorySection
            icon={<Lightbulb className="w-5 h-5" />}
            title="Learning Style"
            color="yellow"
          >
            {memoryData?.profile?.learning_style?.length ? (
              <div className="flex flex-wrap gap-2">
                {memoryData.profile.learning_style.map((style, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm"
                  >
                    {style}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Not yet detected - keep learning!
              </p>
            )}
          </MemorySection>

          {/* Interests */}
          <MemorySection
            icon={<Star className="w-5 h-5" />}
            title="Interests"
            color="blue"
          >
            {memoryData?.profile?.interests?.length ? (
              <div className="flex flex-wrap gap-2">
                {memoryData.profile.interests.map((interest, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">
                No interests recorded yet
              </p>
            )}
          </MemorySection>

          {/* Subject Proficiencies */}
          <MemorySection
            icon={<TrendingUp className="w-5 h-5" />}
            title="Subject Progress"
            color="green"
          >
            {memoryData?.profile?.proficiencies && 
             Object.keys(memoryData.profile.proficiencies).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(memoryData.profile.proficiencies).map(([subject, data]) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                      {subject}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        data.level === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        data.level === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {data.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Keep studying to track your progress
              </p>
            )}
          </MemorySection>

          {/* Challenges */}
          <MemorySection
            icon={<Target className="w-5 h-5" />}
            title="Areas to Improve"
            color="red"
          >
            {memoryData?.profile?.challenges?.length ? (
              <ul className="space-y-1">
                {memoryData.profile.challenges.map((challenge, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    {challenge}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm italic">
                No challenges identified yet
              </p>
            )}
          </MemorySection>

          {/* Effective Teaching Strategies */}
          <MemorySection
            icon={<BookOpen className="w-5 h-5" />}
            title="What Works For You"
            color="purple"
          >
            {memoryData?.strategies?.length ? (
              <div className="space-y-2">
                {memoryData.strategies.slice(0, 5).map((strategy, i) => (
                  <div
                    key={i}
                    className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {strategy.topic || 'General'}
                      </span>
                      <span className="text-xs text-purple-600 dark:text-purple-400">
                        {Math.round(strategy.success_rate * 100)}% effective
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {strategy.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">
                The AI is still learning what teaching methods work best for you
              </p>
            )}
          </MemorySection>

          {/* Privacy Notice */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              About Your Learning Data
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your learning profile helps the AI tutor personalize explanations and
              track your progress. This data is stored securely and is only used to
              improve your learning experience. You can clear this data at any time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MemorySectionProps {
  icon: React.ReactNode;
  title: string;
  color: 'yellow' | 'blue' | 'green' | 'red' | 'purple';
  children: React.ReactNode;
}

function MemorySection({ icon, title, color, children }: MemorySectionProps) {
  const colorClasses = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="ml-9">{children}</div>
    </div>
  );
}
