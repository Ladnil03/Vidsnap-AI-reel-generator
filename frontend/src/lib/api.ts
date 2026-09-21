/**
 * VidSnap.AI API Client
 * Type-safe, auto-refreshing fetch wrapper for backend endpoints (/api/v1).
 */

import {
  AIPlaylist,
  CompanionChatResponse,
  CompanionMessage,
  CreateAIPlaylistRequest,
  DailyPlan,
  DailyPlanSlot,
  DigitalTwinInteractResponse,
  DigitalTwinProfile,
  EntertainmentJourney,
  MoodState,
  MoodType,
  AdminReel,
  AdminSystemStats,
  AdminUser,
  AuthResponse,
  AutomatedModerationResult,
  AwardXPResponse,
  BadgeCatalogItem,
  BrandSafetyReport,
  BusinessProfile,
  Campaign,
  CampaignStatusType,
  CollabApplication,
  CollabApplicationStatusType,
  Community,
  CommunityCategory,
  ContentReport,
  CreateRoomRequest,
  CreateVideoFromKeyRequest,
  CreatorAnalytics,
  CreatorCopilotResponse,
  CreatorEvent,
  CreatorProfile,
  DiscoveryItem,
  DiscoverySearchResponse,
  FeedbackItem,
  FeedResponse,
  FeedTab,
  FollowStatus,
  GamificationProfile,
  HashtagSuggestion,
  LeaderboardResponse,
  LeaderboardScopeType,
  LiveKitTokenResponse,
  ModerationAction,
  ModerationActionType,
  ModerationStats,
  NotificationItem,
  NotificationListResponse,
  PresignedVideoUpload,
  RecommendationFeedResponse,
  RecommendationItem,
  ReelItem,
  ReelJob,
  ReportReasonType,
  ReportStatusType,
  ReportTargetType,
  Room,
  RoomChatMessage,
  RoomSummaryResponse,
  RoomWatchState,
  SocialUserSummary,
  SourceStatus,
  StreakScopeType,
  StreakState,
  User,
  UserChallenge,
  UserLevel,
  UserProfile,
  UserVectorProfile,
  VerificationApplication,
  VideoComment,
  VideoContent,
  WatchProgress,
  XPActionType,
} from './types';

const ACCESS_TOKEN_KEY = 'vidsnap_access_token';

// In browser, relative URL '/api' routes through Next.js rewrite proxy to the FastAPI backend.
// In SSR or custom env, fallback to NEXT_PUBLIC_API_URL or localhost.
export const API_BASE = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

// In-memory token cache for enhanced client security (reduces direct localStorage reads)
let inMemoryAccessToken: string | null = null;

export function getStoredToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    inMemoryAccessToken = token;
  }
  return token;
}

export function setStoredToken(token: string | null): void {
  inMemoryAccessToken = token;
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

    async getStats(): Promise<AdminSystemStats> {
      return apiFetch<AdminSystemStats>('/api/v1/admin/stats');
    },

    async updateUserRole(userId: string, role: string, action: 'add' | 'remove' = 'add'): Promise<{ updated: boolean; user_id: string; roles: string[] }> {
      return apiFetch<{ updated: boolean; user_id: string; roles: string[] }>(`/api/v1/admin/users/${userId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, action }),
      });
    },
  },

  media: {
    async getVideoUploadUrl(payload: {
      filename: string;
      content_type: string;
      size_bytes: number;
    }): Promise<PresignedVideoUpload> {
      return apiFetch<PresignedVideoUpload>('/api/v1/media/upload-url/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async uploadToPresigned(
      uploadUrl: string,
      file: File | Blob,
      contentType: string,
      onProgress?: (percent: number, loaded: number, total: number) => void,
      method: string = 'PUT',
      fields?: Record<string, string>
    ): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const httpMethod = method.toUpperCase();
        xhr.open(httpMethod, uploadUrl);

        if (onProgress && xhr.upload) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent, event.loaded, event.total);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Direct upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during direct storage upload'));
        };

        if (httpMethod === 'POST') {
          // Cloudinary / Multipart direct signed upload
          const formData = new FormData();
          if (fields) {
            for (const [key, value] of Object.entries(fields)) {
              formData.append(key, value);
            }
          }
          formData.append('file', file);
          xhr.send(formData);
        } else {
          // Standard PUT direct upload (R2 / S3 / Local)
          xhr.setRequestHeader('Content-Type', contentType);
          xhr.send(file);
        }
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

    async createVideoFromKey(payload: CreateVideoFromKeyRequest): Promise<VideoContent> {
      return apiFetch<VideoContent>('/api/v1/content/videos/from-key', {
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

  rooms: {
    async createRoom(payload: CreateRoomRequest): Promise<Room> {
      return apiFetch<Room>('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async listRooms(skip: number = 0, limit: number = 30, search?: string): Promise<Room[]> {
      const q = new URLSearchParams({ skip: String(skip), limit: String(limit) });
      if (search) q.set('search', search);
      return apiFetch<Room[]>(`/api/v1/rooms?${q.toString()}`);
    },

    async getRoom(roomId: string): Promise<Room> {
      return apiFetch<Room>(`/api/v1/rooms/${roomId}`);
    },

    async joinRoom(roomId: string, passcode?: string): Promise<Room> {
      return apiFetch<Room>(`/api/v1/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
    },

    async leaveRoom(roomId: string): Promise<{ left: boolean }> {
      return apiFetch<{ left: boolean }>(`/api/v1/rooms/${roomId}/leave`, {
        method: 'POST',
      });
    },

    async syncAction(roomId: string, actionPayload: {
      action: 'play' | 'pause' | 'seek' | 'change_media' | 'set_rate';
      position_seconds?: number;
      playback_rate?: number;
      media_url?: string;
      media_title?: string;
      media_type?: string;
    }): Promise<RoomWatchState> {
      return apiFetch<RoomWatchState>(`/api/v1/rooms/${roomId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload),
      });
    },

    async getMessages(roomId: string, limit: number = 50): Promise<RoomChatMessage[]> {
      return apiFetch<RoomChatMessage[]>(`/api/v1/rooms/${roomId}/messages?limit=${limit}`);
    },

    async getRtcToken(roomId: string): Promise<LiveKitTokenResponse> {
      return apiFetch<LiveKitTokenResponse>(`/api/v1/rooms/${roomId}/rtc-token`, {
        method: 'POST',
      });
    },

    async getAiSummary(roomId: string): Promise<RoomSummaryResponse> {
      return apiFetch<RoomSummaryResponse>(`/api/v1/rooms/${roomId}/summary`, {
        method: 'POST',
      });
    },

    createWebSocket(roomId: string, token?: string): WebSocket {
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
      const url = `${protocol}//${host}/api/v1/rooms/${roomId}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      return new WebSocket(url);
    },
  },

  companion: {
    async chat(message: string, mood?: MoodType): Promise<CompanionChatResponse> {
      return apiFetch<CompanionChatResponse>('/api/v1/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mood }),
      });
    },

    async getHistory(limit: number = 30): Promise<CompanionMessage[]> {
      return apiFetch<CompanionMessage[]>(`/api/v1/companion/history?limit=${limit}`);
    },

    async clearHistory(): Promise<{ cleared: boolean }> {
      return apiFetch<{ cleared: boolean }>('/api/v1/companion/history', {
        method: 'DELETE',
      });
    },

    async getMood(): Promise<MoodState | null> {
      return apiFetch<MoodState | null>('/api/v1/companion/mood');
    },

    async setMood(mood: MoodType, consentGiven: boolean = true, note?: string): Promise<MoodState> {
      return apiFetch<MoodState>('/api/v1/companion/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, consent_given: consentGiven, note }),
      });
    },

    async generatePlaylist(payload: CreateAIPlaylistRequest): Promise<AIPlaylist> {
      return apiFetch<AIPlaylist>('/api/v1/companion/playlists/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async listPlaylists(): Promise<AIPlaylist[]> {
      return apiFetch<AIPlaylist[]>('/api/v1/companion/playlists');
    },

    async listJourneys(): Promise<EntertainmentJourney[]> {
      return apiFetch<EntertainmentJourney[]>('/api/v1/companion/journeys');
    },

    async getJourney(journeyType: string, duration: number = 10): Promise<EntertainmentJourney> {
      return apiFetch<EntertainmentJourney>(`/api/v1/companion/journeys/${journeyType}?duration=${duration}`);
    },

    async getDailyPlan(date?: string): Promise<DailyPlan> {
      const q = date ? `?date=${encodeURIComponent(date)}` : '';
      return apiFetch<DailyPlan>(`/api/v1/companion/daily-planner${q}`);
    },

    async updateDailyPlan(slots: DailyPlanSlot[]): Promise<DailyPlan> {
      return apiFetch<DailyPlan>('/api/v1/companion/daily-planner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
    },

    async getDigitalTwin(creatorId: string): Promise<DigitalTwinProfile> {
      return apiFetch<DigitalTwinProfile>(`/api/v1/companion/digital-twin/${creatorId}`);
    },

    async updateDigitalTwin(profile: DigitalTwinProfile): Promise<DigitalTwinProfile> {
      return apiFetch<DigitalTwinProfile>('/api/v1/companion/digital-twin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    },

    async interactDigitalTwin(creatorId: string, message: string): Promise<DigitalTwinInteractResponse> {
      return apiFetch<DigitalTwinInteractResponse>(`/api/v1/companion/digital-twin/${creatorId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    },
  },

  gamification: {
    async getProfile(): Promise<GamificationProfile> {
      return apiFetch<GamificationProfile>('/api/v1/gamification/profile');
    },

    async getLevel(): Promise<UserLevel> {
      return apiFetch<UserLevel>('/api/v1/gamification/level');
    },

    async awardXP(
      action: XPActionType,
      idempotencyKey: string,
      amount?: number,
      metadata?: Record<string, unknown>
    ): Promise<AwardXPResponse> {
      return apiFetch<AwardXPResponse>('/api/v1/gamification/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          idempotency_key: idempotencyKey,
          amount,
          metadata,
        }),
      });
    },

    async getStreaks(): Promise<StreakState[]> {
      return apiFetch<StreakState[]>('/api/v1/gamification/streaks');
    },

    async recordStreak(
      scope: StreakScopeType = 'daily',
      dateStr?: string,
      targetId?: string
    ): Promise<StreakState> {
      return apiFetch<StreakState>('/api/v1/gamification/streaks/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          date_str: dateStr,
          target_id: targetId,
        }),
      });
    },

    async useFreeze(
      scope: StreakScopeType = 'daily',
      targetId?: string
    ): Promise<StreakState> {
      return apiFetch<StreakState>('/api/v1/gamification/streaks/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          target_id: targetId,
        }),
      });
    },

    async getChallenges(): Promise<UserChallenge[]> {
      return apiFetch<UserChallenge[]>('/api/v1/gamification/challenges');
    },

    async claimChallenge(challengeId: string): Promise<AwardXPResponse> {
      return apiFetch<AwardXPResponse>(`/api/v1/gamification/challenges/${challengeId}/claim`, {
        method: 'POST',
      });
    },

    async getBadges(): Promise<BadgeCatalogItem[]> {
      return apiFetch<BadgeCatalogItem[]>('/api/v1/gamification/badges');
    },

    async getLeaderboard(
      scope: LeaderboardScopeType = 'all_time',
      limit: number = 50
    ): Promise<LeaderboardResponse> {
      return apiFetch<LeaderboardResponse>(
        `/api/v1/gamification/leaderboard?scope=${scope}&limit=${limit}`
      );
    },
  },

  creator: {
    async getProfile(): Promise<CreatorProfile> {
      return apiFetch<CreatorProfile>('/api/v1/creator/profile');
    },

    async updateProfile(bio?: string, niche?: string, socialLinks?: Record<string, string>): Promise<CreatorProfile> {
      return apiFetch<CreatorProfile>('/api/v1/creator/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, niche, social_links: socialLinks }),
      });
    },

    async applyVerification(niche: string, portfolioLinks: string[], statement: string): Promise<VerificationApplication> {
      return apiFetch<VerificationApplication>('/api/v1/creator/verify/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, portfolio_links: portfolioLinks, statement }),
      });
    },

    async getAnalytics(days: number = 30): Promise<CreatorAnalytics> {
      return apiFetch<CreatorAnalytics>(`/api/v1/creator/analytics?days=${days}`);
    },

    async getCopilotInsights(topic: string, targetAudience?: string, moodVibe?: string): Promise<CreatorCopilotResponse> {
      return apiFetch<CreatorCopilotResponse>('/api/v1/creator/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, target_audience: targetAudience, mood_vibe: moodVibe }),
      });
    },

    async listEvents(creatorId?: string, limit: number = 20): Promise<CreatorEvent[]> {
      const q = creatorId ? `?creator_id=${encodeURIComponent(creatorId)}&limit=${limit}` : `?limit=${limit}`;
      return apiFetch<CreatorEvent[]>(`/api/v1/creator/events${q}`);
    },

    async createEvent(title: string, scheduledAt: string, description?: string, roomId?: string): Promise<CreatorEvent> {
      return apiFetch<CreatorEvent>('/api/v1/creator/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, scheduled_at: scheduledAt, description, room_id: roomId }),
      });
    },
  },

  business: {
    async getProfile(): Promise<BusinessProfile> {
      return apiFetch<BusinessProfile>('/api/v1/business/profile');
    },

    async updateProfile(
      companyName: string,
      website: string,
      industry: string,
      description?: string,
      logoUrl?: string
    ): Promise<BusinessProfile> {
      return apiFetch<BusinessProfile>('/api/v1/business/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          website,
          industry,
          description,
          logo_url: logoUrl,
        }),
      });
    },

    async listCampaigns(category?: string, status: CampaignStatusType = 'active', limit: number = 50): Promise<Campaign[]> {
      const catParam = category ? `&category=${encodeURIComponent(category)}` : '';
      return apiFetch<Campaign[]>(`/api/v1/business/campaigns?status_filter=${status}&limit=${limit}${catParam}`);
    },

    async createCampaign(data: {
      title: string;
      description: string;
      category: string;
      budget_perk: string;
      target_creators_count: number;
      requirements?: string[];
      deadline: string;
    }): Promise<Campaign> {
      return apiFetch<Campaign>('/api/v1/business/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    async getCampaign(campaignId: string): Promise<Campaign> {
      return apiFetch<Campaign>(`/api/v1/business/campaigns/${campaignId}`);
    },

    async applyToCampaign(campaignId: string, pitch: string, portfolioReelId?: string): Promise<CollabApplication> {
      return apiFetch<CollabApplication>(`/api/v1/business/campaigns/${campaignId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch, portfolio_reel_id: portfolioReelId }),
      });
    },

    async getCampaignApplications(campaignId: string): Promise<CollabApplication[]> {
      return apiFetch<CollabApplication[]>(`/api/v1/business/campaigns/${campaignId}/applications`);
    },

    async updateApplicationStatus(applicationId: string, newStatus: CollabApplicationStatusType): Promise<CollabApplication> {
      return apiFetch<CollabApplication>(`/api/v1/business/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    },

    async getMyCollabs(): Promise<CollabApplication[]> {
      return apiFetch<CollabApplication[]>('/api/v1/business/collabs/my');
    },

    async evaluateBrandSafety(contentText: string, tags?: string[]): Promise<BrandSafetyReport> {
      return apiFetch<BrandSafetyReport>('/api/v1/business/brand-safety/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_text: contentText, tags: tags || [] }),
      });
    },
  },

  moderation: {
    async report(payload: {
      target_type: ReportTargetType;
      target_id: string;
      reason: ReportReasonType;
      details?: string;
    }): Promise<ContentReport> {
      return apiFetch<ContentReport>('/api/v1/moderation/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async scan(text: string, contentType: string = 'caption'): Promise<AutomatedModerationResult> {
      return apiFetch<AutomatedModerationResult>('/api/v1/moderation/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, content_type: contentType }),
      });
    },

    async getQueue(status?: ReportStatusType, targetType?: ReportTargetType, skip: number = 0, limit: number = 50): Promise<ContentReport[]> {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (targetType) q.set('target_type', targetType);
      q.set('skip', skip.toString());
      q.set('limit', limit.toString());
      return apiFetch<ContentReport[]>(`/api/v1/moderation/queue?${q.toString()}`);
    },

    async getReport(reportId: string): Promise<ContentReport> {
      return apiFetch<ContentReport>(`/api/v1/moderation/reports/${reportId}`);
    },

    async takeAction(reportId: string, actionType: ModerationActionType, resolutionNote: string, autoNotify: boolean = true): Promise<ModerationAction> {
      return apiFetch<ModerationAction>(`/api/v1/moderation/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          resolution_note: resolutionNote,
          auto_notify_reporter: autoNotify,
        }),
      });
    },

    async getStats(): Promise<ModerationStats> {
      return apiFetch<ModerationStats>('/api/v1/moderation/stats');
    },
  },
};

