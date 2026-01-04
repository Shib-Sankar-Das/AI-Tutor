/**
 * Google OAuth and API Integration
 * Handles authentication and Google services (Calendar, Slides, Docs)
 */

import { supabase } from './supabase';

// Google API Scopes
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Sign in with Google OAuth including additional scopes
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: GOOGLE_SCOPES.join(' '),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Get the current user's Google access token
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.provider_token || null;
}

/**
 * Check if user has Google Calendar permissions
 */
export async function hasCalendarAccess(): Promise<boolean> {
  const token = await getGoogleAccessToken();
  if (!token) return false;

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Google Calendar API Functions
 */
export const GoogleCalendar = {
  /**
   * List user's calendars
   */
  async listCalendars() {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch calendars');
    return response.json();
  },

  /**
   * Get events from a calendar
   */
  async getEvents(
    calendarId: string = 'primary',
    timeMin?: Date,
    timeMax?: Date
  ) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const params = new URLSearchParams({
      orderBy: 'startTime',
      singleEvents: 'true',
      ...(timeMin && { timeMin: timeMin.toISOString() }),
      ...(timeMax && { timeMax: timeMax.toISOString() }),
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  /**
   * Create a new calendar event
   */
  async createEvent(
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      reminders?: { method: string; minutes: number }[];
    },
    calendarId: string = 'primary'
  ) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const eventData = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: event.reminders
        ? { useDefault: false, overrides: event.reminders }
        : { useDefault: true },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<{
      summary: string;
      description: string;
      start: Date;
      end: Date;
    }>,
    calendarId: string = 'primary'
  ) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const eventData: any = {};
    if (updates.summary) eventData.summary = updates.summary;
    if (updates.description) eventData.description = updates.description;
    if (updates.start) {
      eventData.start = {
        dateTime: updates.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (updates.end) {
      eventData.end = {
        dateTime: updates.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary') {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) throw new Error('Failed to delete event');
    return true;
  },
};

/**
 * Google Slides API Functions
 */
export const GoogleSlides = {
  /**
   * Create a new Google Slides presentation
   */
  async createPresentation(title: string) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const response = await fetch(
      'https://slides.googleapis.com/v1/presentations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!response.ok) throw new Error('Failed to create presentation');
    return response.json();
  },

  /**
   * Add slides to a presentation
   */
  async addSlides(
    presentationId: string,
    slides: Array<{
      title: string;
      body: string;
      imageUrl?: string;
    }>
  ) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const requests: any[] = [];

    slides.forEach((slide, index) => {
      const slideId = `slide_${index}`;
      const titleId = `title_${index}`;
      const bodyId = `body_${index}`;

      // Create slide
      requests.push({
        createSlide: {
          objectId: slideId,
          insertionIndex: index + 1,
          slideLayoutReference: {
            predefinedLayout: 'TITLE_AND_BODY',
          },
          placeholderIdMappings: [
            {
              layoutPlaceholder: { type: 'TITLE' },
              objectId: titleId,
            },
            {
              layoutPlaceholder: { type: 'BODY' },
              objectId: bodyId,
            },
          ],
        },
      });

      // Insert title
      requests.push({
        insertText: {
          objectId: titleId,
          text: slide.title,
        },
      });

      // Insert body
      requests.push({
        insertText: {
          objectId: bodyId,
          text: slide.body,
        },
      });
    });

    const response = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) throw new Error('Failed to add slides');
    return response.json();
  },

  /**
   * Get presentation URL
   */
  getPresentationUrl(presentationId: string): string {
    return `https://docs.google.com/presentation/d/${presentationId}/edit`;
  },
};

/**
 * Google Docs API Functions
 */
export const GoogleDocs = {
  /**
   * Create a new Google Doc
   */
  async createDocument(title: string) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const response = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) throw new Error('Failed to create document');
    return response.json();
  },

  /**
   * Insert content into a document
   */
  async insertContent(documentId: string, content: string) {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Not authenticated with Google');

    const requests = [
      {
        insertText: {
          location: { index: 1 },
          text: content,
        },
      },
    ];

    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!response.ok) throw new Error('Failed to insert content');
    return response.json();
  },

  /**
   * Get document URL
   */
  getDocumentUrl(documentId: string): string {
    return `https://docs.google.com/document/d/${documentId}/edit`;
  },
};
