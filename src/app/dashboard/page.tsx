'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Brain,
  Calendar as CalendarIcon,
  Plus,
  Target,
  CheckCircle2,
  Circle,
  Trash2,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GoogleCalendar, getGoogleAccessToken, CalendarEvent } from '@/lib/google-auth';
import { showToast } from '@/components/ui/Toaster';

interface Goal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  calendarEventId?: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', dueDate: '' });
  const [hasGoogleAccess, setHasGoogleAccess] = useState(false);

  useEffect(() => {
    checkUser();
    loadGoals();
  }, []);

  useEffect(() => {
    const token = getGoogleAccessToken();
    setHasGoogleAccess(!!token);
    if (token) {
      syncCalendarEvents();
    }
  }, [currentDate]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
    setIsLoading(false);
  };

  const loadGoals = () => {
    const savedGoals = localStorage.getItem('learning_goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  };

  const saveGoals = (updatedGoals: Goal[]) => {
    localStorage.setItem('learning_goals', JSON.stringify(updatedGoals));
    setGoals(updatedGoals);
  };

  const syncCalendarEvents = async () => {
    const token = getGoogleAccessToken();
    if (!token) return;

    setIsSyncingCalendar(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const events = await GoogleCalendar.getEvents(
        token,
        'primary',
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );
      setCalendarEvents(events);
    } catch (error: any) {
      console.error('Failed to sync calendar:', error);
      if (error.message?.includes('401')) {
        setHasGoogleAccess(false);
        localStorage.removeItem('google_access_token');
      }
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const addGoal = async () => {
    if (!newGoal.title.trim()) {
      showToast('Please enter a goal title', 'error');
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      dueDate: newGoal.dueDate,
      completed: false,
    };

    // Create calendar event if due date is set and Google is connected
    if (newGoal.dueDate && hasGoogleAccess) {
      const token = getGoogleAccessToken();
      if (token) {
        try {
          const event = await GoogleCalendar.createEvent(token, 'primary', {
            summary: `📚 Goal: ${newGoal.title}`,
            description: newGoal.description || 'Learning goal from AI Tutor',
            start: {
              date: newGoal.dueDate,
            },
            end: {
              date: newGoal.dueDate,
            },
          });
          goal.calendarEventId = event.id;
          showToast('Goal added to Google Calendar!', 'success');
          syncCalendarEvents();
        } catch (error) {
          console.error('Failed to create calendar event:', error);
        }
      }
    }

    saveGoals([...goals, goal]);
    setNewGoal({ title: '', description: '', dueDate: '' });
    setShowAddGoal(false);
    showToast('Goal added successfully!', 'success');
  };

  const toggleGoal = (goalId: string) => {
    const updatedGoals = goals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    saveGoals(updatedGoals);
  };

  const deleteGoal = async (goal: Goal) => {
    // Delete from Google Calendar if linked
    if (goal.calendarEventId && hasGoogleAccess) {
      const token = getGoogleAccessToken();
      if (token) {
        try {
          await GoogleCalendar.deleteEvent(token, 'primary', goal.calendarEventId);
          syncCalendarEvents();
        } catch (error) {
          console.error('Failed to delete calendar event:', error);
        }
      }
    }

    const updatedGoals = goals.filter((g) => g.id !== goal.id);
    saveGoals(updatedGoals);
    showToast('Goal deleted', 'success');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('google_access_token');
    await supabase.auth.signOut();
    router.push('/');
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter((event) => {
      const eventDate = event.start?.date || event.start?.dateTime?.split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getGoalsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return goals.filter((goal) => goal.dueDate === dateStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              AI Tutor
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/chat"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <MessageSquare className="w-5 h-5" />
              Chat
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning goals and manage your study schedule.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {hasGoogleAccess && (
                    <button
                      onClick={syncCalendarEvents}
                      disabled={isSyncingCalendar}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                      Sync Calendar
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
                {getDaysInMonth(currentDate).map((day, index) => {
                  const isToday =
                    day === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear();
                  const events = day ? getEventsForDate(day) : [];
                  const dayGoals = day ? getGoalsForDate(day) : [];
                  const hasEvents = events.length > 0 || dayGoals.length > 0;

                  return (
                    <div
                      key={index}
                      onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                      className={`
                        aspect-square p-1 rounded-lg cursor-pointer transition-colors
                        ${day ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                        ${isToday ? 'bg-primary-100 dark:bg-primary-900/30' : ''}
                        ${selectedDate?.getDate() === day && 
                          selectedDate?.getMonth() === currentDate.getMonth() ? 
                          'ring-2 ring-primary-500' : ''}
                      `}
                    >
                      {day && (
                        <div className="h-full flex flex-col">
                          <span
                            className={`
                              text-sm font-medium
                              ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}
                            `}
                          >
                            {day}
                          </span>
                          {hasEvents && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {events.slice(0, 2).map((event, i) => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                  title={event.summary}
                                />
                              ))}
                              {dayGoals.slice(0, 2).map((goal, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${goal.completed ? 'bg-green-500' : 'bg-orange-500'}`}
                                  title={goal.title}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Date Events */}
              {selectedDate && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate.getDate()).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                      >
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-900 dark:text-white">{event.summary}</span>
                      </div>
                    ))}
                    {getGoalsForDate(selectedDate.getDate()).map((goal) => (
                      <div
                        key={goal.id}
                        className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                      >
                        <Target className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-gray-900 dark:text-white">{goal.title}</span>
                      </div>
                    ))}
                    {getEventsForDate(selectedDate.getDate()).length === 0 &&
                     getGoalsForDate(selectedDate.getDate()).length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No events or goals for this day.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Goals Section */}
          <div className="space-y-6">
            {/* Add Goal */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-600" />
                  Learning Goals
                </h2>
                <button
                  onClick={() => setShowAddGoal(!showAddGoal)}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {showAddGoal && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Goal title..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Description (optional)..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={newGoal.dueDate}
                      onChange={(e) => setNewGoal({ ...newGoal, dueDate: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addGoal}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                    >
                      Add Goal
                    </button>
                    <button
                      onClick={() => setShowAddGoal(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Goals List */}
              <div className="space-y-2">
                {goals.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No goals yet. Add your first learning goal!
                  </p>
                ) : (
                  goals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg transition-colors
                        ${goal.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}
                      `}
                    >
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="mt-0.5"
                      >
                        {goal.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            goal.completed
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {goal.title}
                        </p>
                        {goal.dueDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(goal.dueDate).toLocaleDateString()}
                            {goal.calendarEventId && (
                              <CalendarIcon className="w-3 h-3 text-blue-500 ml-1" title="Synced with Google Calendar" />
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteGoal(goal)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Link
                  href="/chat"
                  className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Start Learning Session
                  </span>
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 Tip: Ask the AI tutor to &quot;add a goal for [topic] by [date]&quot; to create goals through chat!
                </p>
              </div>
            </div>

            {/* Google Calendar Status */}
            {!hasGoogleAccess && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Sign in with Google to sync your goals with Google Calendar.
                </p>
                <Link
                  href="/auth/login"
                  className="text-sm text-yellow-600 dark:text-yellow-400 font-medium hover:underline"
                >
                  Connect Google Account →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
