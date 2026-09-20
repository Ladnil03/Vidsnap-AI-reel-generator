/**
 * VidSnap.AI TypeScript Core Domain Interfaces
 */

export interface User {
  user_id: string;
  name: string;
  email: string;
  roles: string[];
  tokens_remaining: number;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  name: string;
  roles: string[];
  tokens_remaining: number;
}

export type JobStatusType = 'queued' | 'processing' | 'completed' | 'failed';
export type ProgressStage = 'queued' | 'tts' | 'rendering' | 'uploading' | 'done' | 'error';

export interface ReelJob {
  job_id: string;
  status: JobStatusType;
  progress_stage?: ProgressStage;
  reel_url?: string;
  error_msg?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReelItem {
  job_id: string;
  user_id?: string;
  status: string;
  reel_url: string;
  voiceover_text?: string;
  duration?: number;
  created_at: string;
}

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  roles: string[];
  tokens_remaining: number;
  reels_count: number;
  created_at: string;
}

export interface AdminReel {
  job_id: string;
  user_id: string;
  user_email: string;
  status: string;
  reel_url?: string;
  duration?: number;
  created_at: string;
}

export interface FeedbackItem {
  feedback_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  message: string;
  created_at: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  gender: 'Female' | 'Male';
  lang: string;
}

export interface ApiError {
  detail: string | { [key: string]: unknown }[];
}

export type ContentVisibility = 'public' | 'unlisted' | 'private' | 'followers_only';
export type ContentStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'archived' | 'deleted';

export interface VideoContent {
  video_id: string;
  user_id: string;
  author_name: string;
  title: string;
  description: string;
  hashtags: string[];
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  visibility: ContentVisibility;
  status: ContentStatus;
  scheduled_at?: string;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;
  has_liked?: boolean;
  has_saved?: boolean;
  captions?: { start: number; end: number; text: string }[];
  created_at: string;
  updated_at: string;
}

export interface VideoComment {
  comment_id: string;
  video_id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

export interface HashtagSuggestion {
  hashtags: string[];
  suggested_hook: string;
}

// Phase 4: Social Graph Domain Types
export type CommunityCategory = 'general' | 'tech' | 'comedy' | 'fitness' | 'art' | 'gaming' | 'music' | 'lifestyle';

export interface FollowStatus {
  target_user_id: string;
  is_following: boolean;
  is_friend: boolean;
  followers_count: number;
  following_count: number;
}

export interface SocialUserSummary {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_friend: boolean;
}

export interface Community {
  community_id: string;
  name: string;
  slug: string;
  description: string;
  category: CommunityCategory;
  avatar_url?: string;
  banner_url?: string;
  creator_id: string;
  members_count: number;
  is_member: boolean;
  role?: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio: string;
  followers_count: number;
  following_count: number;
  reels_count: number;
  is_following: boolean;
  is_friend: boolean;
  communities: Community[];
}

// Phase 4: Notifications Domain Types
export type NotificationType = 'like' | 'comment' | 'follow' | 'friend' | 'community' | 'system';

export interface NotificationItem {
  notification_id: string;
  recipient_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  type: NotificationType;
  entity_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  total: number;
}

// Phase 4: Universal Feed Domain Types
export type FeedTab = 'for_you' | 'trending' | 'following' | 'friends' | 'communities' | 'continue_watching' | 'saved';

export interface FeedResponse {
  tab: FeedTab;
  items: VideoContent[];
  total: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface WatchProgress {
  video_id: string;
  watched_seconds: number;
  total_seconds: number;
  percentage: number;
  completed: boolean;
  updated_at: string;
}

// Phase 5: Discovery & Recommendation Engine Types
export type DiscoverySource = 'youtube_shorts' | 'pexels' | 'pixabay' | 'coverr' | 'community';
export type PlayerType = 'iframe' | 'direct_video';

export interface DiscoveryItem {
  item_id: string;
  source: DiscoverySource;
  external_id: string;
  title: string;
  description: string;
  author_name: string;
  author_url?: string;
  source_url: string;
  embed_url: string;
  player_type: PlayerType;
  thumbnail_url?: string;
  duration: number;
  tags: string[];
  embedding?: number[];
  license: string;
  attribution_text: string;
  is_external: boolean;
  can_rehost: boolean;
  views_count: number;
  likes_count: number;
  created_at: string;
  last_viewed_at?: string;
}

export interface DiscoverySearchResponse {
  items: DiscoveryItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface SourceStatus {
  name: string;
  source: DiscoverySource;
  configured: boolean;
  mode: string;
  description: string;
}

export type InteractionType = 'view' | 'complete' | 'like' | 'save' | 'share' | 'skip';

export interface WellbeingCard {
  card_type: string;
  title: string;
  message: string;
  reel_count: number;
  suggested_action: string;
}

export interface RecommendationItem {
  id: string;
  video_id: string;
  source: DiscoverySource;
  title: string;
  description: string;
  author_name: string;
  author_url?: string;
  source_url: string;
  embed_url: string;
  player_type: PlayerType;
  thumbnail_url?: string;
  duration: number;
  tags: string[];
  attribution_text: string;
  likes_count: number;
  views_count: number;
  has_liked?: boolean;
  has_saved?: boolean;
  explainability_tag: string;
  recommendation_score: number;
  is_wellbeing_card: boolean;
  wellbeing_card?: WellbeingCard;
}

export interface RecommendationFeedResponse {
  items: RecommendationItem[];
  total: number;
  session_reel_count: number;
  has_more: boolean;
}

export interface UserVectorProfile {
  user_id: string;
  top_categories: string[];
  interaction_count: number;
  updated_at: string;
}
