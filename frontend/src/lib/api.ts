/**
 * VidSnap.AI API Client
 * Type-safe, auto-refreshing fetch wrapper for backend endpoints (/api/v1).
 */

import {
  AdminReel,
  AdminUser,
  AuthResponse,
  Community,
  CommunityCategory,
  DiscoveryItem,
  DiscoverySearchResponse,
  FeedbackItem,
  FeedResponse,
  FeedTab,
  FollowStatus,
  HashtagSuggestion,
  NotificationItem,
  NotificationListResponse,
  RecommendationFeedResponse,
  RecommendationItem,
  ReelItem,
  ReelJob,
  SocialUserSummary,
  SourceStatus,
  User,
  UserProfile,
  UserVectorProfile,
  VideoComment,
  VideoContent,
  WatchProgress,
} from './types';

const ACCESS_TOKEN_KEY = 'vidsnap_access_token';

// In browser, relative URL '/api' routes through Next.js rewrite proxy to the FastAPI backend.
// In SSR or custom env, fallback to NEXT_PUBLIC_API_URL or localhost.
export const API_BASE = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Robust fetch wrapper handling auth headers, credentials, error extraction,
 * and automatic JWT refresh.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure cookies (e.g. httpOnly refresh_token) are sent
  options.credentials = options.credentials || 'include';
  options.headers = headers;

  const response = await fetch(url, options);

  // Handle 401 Unauthorized — attempt silent refresh using httpOnly refresh token cookie
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (refreshRes.ok) {
          const data: AuthResponse = await refreshRes.json();
          setStoredToken(data.access_token);
          isRefreshing = false;
          onRefreshed(data.access_token);

          // Retry initial request with new token
          headers.set('Authorization', `Bearer ${data.access_token}`);
          const retryRes = await fetch(url, { ...options, headers });
          if (!retryRes.ok) {
            throw await parseApiError(retryRes);
          }
          return (await retryRes.json()) as T;
        } else {
          setStoredToken(null);
          isRefreshing = false;
          throw new Error('Session expired. Please log in again.');
        }
      } catch (err) {
        setStoredToken(null);
        isRefreshing = false;
        throw err;
      }
    } else {
      // Wait for existing refresh to resolve
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryRes = await fetch(url, { ...options, headers });
            if (!retryRes.ok) {
              reject(await parseApiError(retryRes));
            } else {
              resolve((await retryRes.json()) as T);
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

async function parseApiError(response: Response): Promise<Error> {
  let message = `Request failed (${response.status})`;
  try {
    const errorData = await response.json();
    if (errorData?.detail) {
      if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(', ');
      }
    } else if (errorData?.message) {
      message = errorData.message;
    }
  } catch {
    // Non-JSON response
  }
  return new Error(message);
}

// ==============================================================================
// Domain API Services
// ==============================================================================

export const api = {
  auth: {
    async signup(name: string, email: string, password: string): Promise<AuthResponse> {
      const res = await apiFetch<AuthResponse>('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      setStoredToken(res.access_token);
      return res;
    },

    async login(email: string, password: string): Promise<AuthResponse> {
      const res = await apiFetch<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.access_token);
      return res;
    },

    async logout(): Promise<void> {
      setStoredToken(null);
    },

    async forgotPassword(email: string): Promise<{ message: string }> {
      return apiFetch<{ message: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    },

    async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
      return apiFetch<{ message: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
    },

    async getMe(): Promise<User> {
      return apiFetch<User>('/api/v1/users/me');
    },
  },

  reelStudio: {
    async createJobMultipart(formData: FormData): Promise<{ job_id: string; status: string }> {
      // Omit Content-Type so browser generates multipart boundary
      return apiFetch<{ job_id: string; status: string }>('/api/v1/reel-studio/jobs/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async getJobStatus(jobId: string): Promise<ReelJob> {
      return apiFetch<ReelJob>(`/api/v1/reel-studio/jobs/${jobId}`);
    },

    async getUserReels(limit: number = 50): Promise<ReelItem[]> {
      return apiFetch<ReelItem[]>(`/api/v1/reel-studio/reels?limit=${limit}`);
    },

    async deleteReel(jobId: string): Promise<{ deleted: boolean; job_id: string }> {
      return apiFetch<{ deleted: boolean; job_id: string }>(`/api/v1/reel-studio/reels/${jobId}`, {
        method: 'DELETE',
      });
    },
  },

  feedback: {
    async submit(message: string): Promise<{ success: boolean; message: string }> {
      return apiFetch<{ success: boolean; message: string }>('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    },

    async list(skip: number = 0, limit: number = 50): Promise<FeedbackItem[]> {
      return apiFetch<FeedbackItem[]>(`/api/v1/admin/feedback?skip=${skip}&limit=${limit}`);
    },
  },

  admin: {
    async getUsers(skip: number = 0, limit: number = 50): Promise<AdminUser[]> {
      return apiFetch<AdminUser[]>(`/api/v1/admin/users?skip=${skip}&limit=${limit}`);
    },

    async getReels(skip: number = 0, limit: number = 50): Promise<AdminReel[]> {
      return apiFetch<AdminReel[]>(`/api/v1/admin/reels?skip=${skip}&limit=${limit}`);
    },

    async updateUserTokens(userId: string, tokens: number): Promise<{ updated: boolean; user_id: string; tokens_remaining: number }> {
      return apiFetch<{ updated: boolean; user_id: string; tokens_remaining: number }>(`/api/v1/admin/users/${userId}/tokens`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
    },
  },

  content: {
    async createVideo(payload: {
      title: string;
      description?: string;
      hashtags?: string[];
      visibility?: string;
      scheduled_at?: string;
      video_key?: string;
      thumbnail_key?: string;
      duration?: number;
      is_draft?: boolean;
    }): Promise<VideoContent> {
      return apiFetch<VideoContent>('/api/v1/content/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async uploadNativeVideo(formData: FormData): Promise<VideoContent> {
      return apiFetch<VideoContent>('/api/v1/content/videos/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async getVideo(videoId: string): Promise<VideoContent> {
      return apiFetch<VideoContent>(`/api/v1/content/videos/${videoId}`);
    },

    async listVideos(userId?: string, skip: number = 0, limit: number = 50): Promise<VideoContent[]> {
      const q = userId ? `?user_id=${userId}&skip=${skip}&limit=${limit}` : `?skip=${skip}&limit=${limit}`;
      return apiFetch<VideoContent[]>(`/api/v1/content/videos${q}`);
    },

    async listDrafts(): Promise<VideoContent[]> {
      return apiFetch<VideoContent[]>('/api/v1/content/me/drafts');
    },

    async deleteVideo(videoId: string): Promise<{ deleted: boolean; video_id: string }> {
      return apiFetch<{ deleted: boolean; video_id: string }>(`/api/v1/content/videos/${videoId}`, {
        method: 'DELETE',
      });
    },

    async toggleLike(videoId: string): Promise<{ video_id: string; liked: boolean; likes_count: number }> {
      return apiFetch<{ video_id: string; liked: boolean; likes_count: number }>(`/api/v1/content/videos/${videoId}/like`, {
        method: 'POST',
      });
    },

    async toggleSave(videoId: string): Promise<{ video_id: string; saved: boolean; saves_count: number }> {
      return apiFetch<{ video_id: string; saved: boolean; saves_count: number }>(`/api/v1/content/videos/${videoId}/save`, {
        method: 'POST',
      });
    },

    async addComment(videoId: string, text: string): Promise<VideoComment> {
      return apiFetch<VideoComment>(`/api/v1/content/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    },

    async listComments(videoId: string, skip: number = 0, limit: number = 50): Promise<VideoComment[]> {
      return apiFetch<VideoComment[]>(`/api/v1/content/videos/${videoId}/comments?skip=${skip}&limit=${limit}`);
    },

    async suggestTags(title: string, transcript?: string): Promise<HashtagSuggestion> {
      return apiFetch<HashtagSuggestion>('/api/v1/content/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, transcript }),
      });
    },
  },

  social: {
    async follow(userId: string): Promise<FollowStatus> {
      return apiFetch<FollowStatus>(`/api/v1/social/follow/${userId}`, { method: 'POST' });
    },

    async unfollow(userId: string): Promise<FollowStatus> {
      return apiFetch<FollowStatus>(`/api/v1/social/follow/${userId}`, { method: 'DELETE' });
    },

    async getFollowStatus(userId: string): Promise<FollowStatus> {
      return apiFetch<FollowStatus>(`/api/v1/social/follow-status/${userId}`);
    },

    async getFollowers(userId: string, limit: number = 50): Promise<{ items: SocialUserSummary[]; total: number }> {
      return apiFetch<{ items: SocialUserSummary[]; total: number }>(`/api/v1/social/followers/${userId}?limit=${limit}`);
    },

    async getFollowing(userId: string, limit: number = 50): Promise<{ items: SocialUserSummary[]; total: number }> {
      return apiFetch<{ items: SocialUserSummary[]; total: number }>(`/api/v1/social/following/${userId}?limit=${limit}`);
    },

    async getFriends(limit: number = 50): Promise<{ items: SocialUserSummary[]; total: number }> {
      return apiFetch<{ items: SocialUserSummary[]; total: number }>(`/api/v1/social/friends?limit=${limit}`);
    },

    async getProfile(userId: string): Promise<UserProfile> {
      return apiFetch<UserProfile>(`/api/v1/social/profile/${userId}`);
    },

    async getCommunities(category?: CommunityCategory, q?: string, limit: number = 30): Promise<{ items: Community[]; total: number }> {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (q) params.set('q', q);
      params.set('limit', limit.toString());
      return apiFetch<{ items: Community[]; total: number }>(`/api/v1/social/communities?${params.toString()}`);
    },

    async createCommunity(data: { name: string; description?: string; category: CommunityCategory }): Promise<Community> {
      return apiFetch<Community>('/api/v1/social/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    async joinCommunity(communityId: string): Promise<Community> {
      return apiFetch<Community>(`/api/v1/social/communities/${communityId}/join`, { method: 'POST' });
    },

    async leaveCommunity(communityId: string): Promise<Community> {
      return apiFetch<Community>(`/api/v1/social/communities/${communityId}/leave`, { method: 'POST' });
    },
  },

  notifications: {
    async list(unreadOnly: boolean = false, limit: number = 30): Promise<NotificationListResponse> {
      return apiFetch<NotificationListResponse>(`/api/v1/notifications?unread_only=${unreadOnly}&limit=${limit}`);
    },

    async markRead(notificationId: string): Promise<{ success: boolean }> {
      return apiFetch<{ success: boolean }>(`/api/v1/notifications/${notificationId}/read`, { method: 'PATCH' });
    },

    async markAllRead(): Promise<{ marked_read: number }> {
      return apiFetch<{ marked_read: number }>('/api/v1/notifications/read-all', { method: 'POST' });
    },

    async subscribePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<{ subscribed: boolean }> {
      return apiFetch<{ subscribed: boolean }>('/api/v1/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    },

    async unregisterPush(endpoint: string): Promise<{ unsubscribed: boolean }> {
      return apiFetch<{ unsubscribed: boolean }>(`/api/v1/notifications/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
        method: 'DELETE',
      });
    },

    async getVapidKey(): Promise<{ public_key: string }> {
      return apiFetch<{ public_key: string }>('/api/v1/notifications/push/vapid-key');
    },
  },

  feed: {
    async getFeed(tab: FeedTab = 'trending', limit: number = 10, cursor?: string): Promise<FeedResponse> {
      const q = cursor ? `?tab=${tab}&limit=${limit}&cursor=${cursor}` : `?tab=${tab}&limit=${limit}`;
      return apiFetch<FeedResponse>(`/api/v1/feed${q}`);
    },

    async recordWatchProgress(data: {
      video_id: string;
      watched_seconds: number;
      total_seconds: number;
      completed?: boolean;
    }): Promise<WatchProgress> {
      return apiFetch<WatchProgress>('/api/v1/feed/watch-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    async getWatchProgress(videoId: string): Promise<WatchProgress | null> {
      return apiFetch<WatchProgress | null>(`/api/v1/feed/watch-progress/${videoId}`);
    },
  },

  discovery: {
    async search(params: {
      q?: string;
      source?: string;
      tag?: string;
      page?: number;
      limit?: number;
    }): Promise<DiscoverySearchResponse> {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.source) searchParams.set('source', params.source);
      if (params.tag) searchParams.set('tag', params.tag);
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      const qs = searchParams.toString();
      return apiFetch<DiscoverySearchResponse>(`/api/v1/discovery/search${qs ? `?${qs}` : ''}`);
    },

    async getItem(itemId: string): Promise<DiscoveryItem> {
      return apiFetch<DiscoveryItem>(`/api/v1/discovery/items/${itemId}`);
    },

    async getSources(): Promise<SourceStatus[]> {
      return apiFetch<SourceStatus[]>('/api/v1/discovery/sources');
    },

    async batchIngest(source: string, query: string, limit: number = 10): Promise<any> {
      return apiFetch('/api/v1/discovery/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, query, limit }),
      });
    },
  },

  recsys: {
    async getFeed(sessionReelCount: number = 0, limit: number = 10): Promise<RecommendationFeedResponse> {
      return apiFetch<RecommendationFeedResponse>(
        `/api/v1/recsys/feed?session_reel_count=${sessionReelCount}&limit=${limit}`
      );
    },

    async logInteraction(event: {
      item_id: string;
      source?: string;
      interaction_type: 'view' | 'complete' | 'like' | 'save' | 'share' | 'skip';
      watched_seconds?: number;
      total_seconds?: number;
    }): Promise<{ success: boolean }> {
      return apiFetch<{ success: boolean }>('/api/v1/recsys/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    },

    async getPreferences(): Promise<UserVectorProfile> {
      return apiFetch<UserVectorProfile>('/api/v1/recsys/preferences');
    },

    async setPreferences(preferredCategories: string[]): Promise<UserVectorProfile> {
      return apiFetch<UserVectorProfile>('/api/v1/recsys/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_categories: preferredCategories }),
      });
    },
  },
};
