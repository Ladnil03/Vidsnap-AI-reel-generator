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

// Media Storage & Edge Direct Upload Types (Cloudinary / R2)
export interface PresignedVideoUpload {
  upload_url: string;
  key: string;
  method: string;
  public_url: string;
  content_type: string;
  max_size_bytes: number;
  fields?: Record<string, string>;
}

export interface CreateVideoFromKeyRequest {
  key: string;
  title: string;
  description?: string;
  hashtags?: string[];
  visibility?: ContentVisibility;
  scheduled_at?: string;
  is_draft?: boolean;
}

// Phase 7: Realtime, Watch Together Rooms & AI Room Assistant Types
export type RoomType = 'public' | 'private';
export type PlaybackState = 'playing' | 'paused' | 'buffering';
export type ControlMode = 'host_only' | 'democratic';
export type RoomMediaType = 'native' | 'youtube' | 'stock';

export interface RoomWatchState {
  media_url: string;
  media_title: string;
  media_type: RoomMediaType;
  state: PlaybackState;
  position_seconds: number;
  playback_rate: number;
  last_updated_at: string;
  updated_by_user_id?: string;
}

export interface RoomParticipant {
  user_id: string;
  name: string;
  avatar_url?: string;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface RoomChatMessage {
  message_id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  text: string;
  created_at: string;
  is_system: boolean;
  is_assistant: boolean;
}

export interface Room {
  room_id: string;
  name: string;
  description: string;
  room_type: RoomType;
  control_mode: ControlMode;
  host_id: string;
  host_name: string;
  watch_state: RoomWatchState;
  participant_count: number;
  participants: RoomParticipant[];
  created_at: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  room_type?: RoomType;
  passcode?: string;
  control_mode?: ControlMode;
  initial_media_url?: string;
  initial_media_title?: string;
  initial_media_type?: RoomMediaType;
}

export interface LiveKitTokenResponse {
  token: string;
  server_url: string;
  room_name: string;
}

export interface RoomSummaryResponse {
  room_id: string;
  summary: string;
  highlights: string[];
  generated_at: string;
}

// Phase 8: AI Personalization, Entertainment Companion & Mood Detection
export type MoodType =
  | 'energized'
  | 'chill'
  | 'focused'
  | 'curious'
  | 'melancholic'
  | 'inspired'
  | 'humorous';

export interface MoodState {
  user_id: string;
  mood: MoodType;
  intensity: number;
  consent_given: boolean;
  note?: string;
  updated_at: string;
}

export interface CompanionMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Array<Record<string, unknown>>;
  reels?: Array<{
    reel_id: string;
    title: string;
    creator_name: string;
    media_url: string;
    thumbnail_url?: string;
    duration_seconds: number;
  }>;
  timestamp: string;
}

export interface CompanionChatResponse {
  message: CompanionMessage;
  suggested_actions: string[];
  active_mood?: MoodType;
}

export interface AIPlaylist {
  playlist_id: string;
  user_id: string;
  title: string;
  description: string;
  mood?: MoodType;
  target_duration_minutes: number;
  reel_ids: string[];
  reels: Array<Record<string, unknown>>;
  created_at: string;
}

export interface CreateAIPlaylistRequest {
  title: string;
  prompt?: string;
  mood?: MoodType;
  target_duration_minutes?: number;
}

export interface JourneyStep {
  step_number: number;
  title: string;
  description: string;
  duration_seconds: number;
  reel_id?: string;
  reel_title?: string;
  reel_url?: string;
  thumbnail_url?: string;
}

export interface EntertainmentJourney {
  journey_id: string;
  title: string;
  description: string;
  journey_type: string;
  mood: MoodType;
  total_duration_minutes: number;
  steps: JourneyStep[];
}

export interface DailyPlanSlot {
  slot_id: string;
  name: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  duration_minutes: number;
  journey_id?: string;
  is_completed: boolean;
}

export interface DailyPlan {
  user_id: string;
  date: string;
  slots: DailyPlanSlot[];
  updated_at: string;
}

export interface DigitalTwinProfile {
  creator_id: string;
  creator_name: string;
  persona_name: string;
  bio: string;
  voice_tone: string;
  greeting_template: string;
  topics: string[];
  is_ai_labeled: boolean;
  is_active: boolean;
  updated_at: string;
}

export interface DigitalTwinInteractResponse {
  reply: string;
  creator_id: string;
  persona_name: string;
  is_ai_labeled: boolean;
  timestamp: string;
}

// ==============================================================================
// Phase 9: Engagement & Gamification Types
// ==============================================================================

export type XPActionType =
  | 'watch_reel'
  | 'like_reel'
  | 'comment_reel'
  | 'create_reel'
  | 'daily_login'
  | 'challenge_completed'
  | 'streak_milestone'
  | 'watch_party_host';

export interface XPLedgerEntry {
  entry_id: string;
  user_id: string;
  action: XPActionType;
  amount: number;
  idempotency_key: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AwardXPResponse {
  awarded: boolean;
  amount: number;
  action: XPActionType;
  new_total_xp: number;
  current_level: number;
  leveled_up: boolean;
  message: string;
}

export interface UserLevel {
  user_id: string;
  current_xp: number;
  level: number;
  title: string;
  xp_for_current_level: number;
  xp_for_next_level: number;
  progress_pct: number;
}

export type BadgeCategoryType = 'watch' | 'creation' | 'streak' | 'social' | 'special';

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategoryType;
  threshold: number;
  action_type: string;
}

export interface UserBadge {
  badge_id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategoryType;
  unlocked_at: string;
}

export interface BadgeCatalogItem {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategoryType;
  threshold: number;
  action_type: string;
  is_unlocked: boolean;
  unlocked_at?: string;
}

export type StreakScopeType = 'daily' | 'friend' | 'community';

export interface StreakState {
  scope: StreakScopeType;
  target_id?: string;
  current_streak: number;
  longest_streak: number;
  last_active_date?: string;
  freeze_tokens: number;
  is_frozen_today: boolean;
  updated_at?: string;
}

export interface UserChallenge {
  challenge_id: string;
  title: string;
  description: string;
  action: XPActionType;
  target_count: number;
  current_count: number;
  reward_xp: number;
  is_completed: boolean;
  is_claimed: boolean;
  is_weekly: boolean;
  icon: string;
  expires_at: string;
}

export type LeaderboardScopeType = 'weekly' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  score: number;
  level: number;
  title: string;
}

export interface LeaderboardResponse {
  scope: LeaderboardScopeType;
  entries: LeaderboardEntry[];
  user_entry?: LeaderboardEntry;
  total_participants: number;
}

export interface GamificationProfile {
  user_id: string;
  level: UserLevel;
  streaks: StreakState[];
  active_challenges: UserChallenge[];
  badges_unlocked: UserBadge[];
  badges_unlocked_count: number;
  badges_total_count: number;
  freeze_tokens_available: number;
  recent_xp_ledger: XPLedgerEntry[];
}

// ==============================================================================
// Phase 10: Creator & Business Types
// ==============================================================================

export type VerificationStatusType = 'none' | 'pending' | 'verified' | 'rejected';

export interface CreatorProfile {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  niche: string;
  social_links: Record<string, string>;
  verification_status: VerificationStatusType;
  verified_at?: string;
  total_reels: number;
  total_views: number;
  followers_count: number;
  updated_at: string;
}

export interface VerificationApplication {
  application_id: string;
  user_id: string;
  niche: string;
  portfolio_links: string[];
  statement: string;
  status: VerificationStatusType;
  submitted_at: string;
  reviewed_at?: string;
}

export interface CreatorAnalytics {
  user_id: string;
  period_days: number;
  total_impressions: number;
  total_views: number;
  total_watch_seconds: number;
  avg_completion_rate_pct: number;
  engagement_rate_pct: number;
  top_tags: Array<{ tag: string; views: number }>;
  audience_mood_affinity: Array<{ mood: string; pct: number }>;
  daily_views_trend: Array<{ date: string; views: number }>;
}

export interface CreatorCopilotHook {
  hook_text: string;
  hook_style: string;
}

export interface CreatorCopilotResponse {
  topic: string;
  hooks: CreatorCopilotHook[];
  viral_potential_score: number;
  viral_score_breakdown: string;
  optimal_posting_window: string;
  recommended_hashtags: string[];
  suggested_call_to_action: string;
}

export type CreatorEventStatusType = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface CreatorEvent {
  event_id: string;
  creator_id: string;
  creator_name: string;
  title: string;
  description: string;
  room_id?: string;
  scheduled_at: string;
  status: CreatorEventStatusType;
  created_at: string;
}

export type BusinessVerificationStatusType = 'none' | 'pending' | 'verified' | 'rejected';

export interface BusinessProfile {
  business_id: string;
  user_id: string;
  company_name: string;
  website: string;
  industry: string;
  logo_url?: string;
  description: string;
  verification_status: BusinessVerificationStatusType;
  created_at: string;
  updated_at: string;
}

export type CampaignStatusType = 'draft' | 'active' | 'paused' | 'completed';

export interface Campaign {
  campaign_id: string;
  business_id: string;
  company_name: string;
  title: string;
  description: string;
  category: string;
  budget_perk: string;
  target_creators_count: number;
  requirements: string[];
  deadline: string;
  status: CampaignStatusType;
  applications_count: number;
  created_at: string;
}

export type CollabApplicationStatusType =
  | 'applied'
  | 'shortlisted'
  | 'accepted'
  | 'completed'
  | 'rejected';

export interface BrandSafetyReport {
  score: number;
  is_brand_safe: boolean;
  flagged_keywords: string[];
  sensitive_categories_detected: string[];
  recommendation: string;
}

export interface CollabApplication {
  application_id: string;
  campaign_id: string;
  business_id: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  pitch: string;
  portfolio_reel_id?: string;
  brand_safety: BrandSafetyReport;
  status: CollabApplicationStatusType;
  created_at: string;
  reviewed_at?: string;
}

// ==============================================================================
// PHASE 11: MODERATION & OBSERVABILITY TYPES
// ==============================================================================

export type ReportTargetType = 'video' | 'comment' | 'user' | 'room';

export type ReportReasonType =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'nudity_nsfw'
  | 'copyright'
  | 'misinformation'
  | 'dangerous'
  | 'other';

export type ReportStatusType =
  | 'pending'
  | 'reviewing'
  | 'resolved_action_taken'
  | 'resolved_dismissed';

export type ModerationActionType =
  | 'dismiss'
  | 'warn_user'
  | 'hide_content'
  | 'delete_content'
  | 'ban_user';

export interface ContentReport {
  report_id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReasonType;
  details?: string;
  status: ReportStatusType;
  report_count: number;
  priority: string;
  resolution_note?: string;
  reviewed_by?: string;
  created_at: string;
  reviewed_at?: string;
  target_meta?: Record<string, unknown>;
}

export interface ModerationAction {
  action_id: string;
  report_id: string;
  target_type: ReportTargetType;
  target_id: string;
  action_type: ModerationActionType;
  moderator_id: string;
  reason: string;
  created_at: string;
}

export interface AutomatedModerationResult {
  score: number;
  is_flagged: boolean;
  flags: string[];
  confidence: number;
  recommendation: 'allow' | 'flag_for_review' | 'block';
}

export interface ModerationStats {
  pending_reports: number;
  reviewing_reports: number;
  resolved_reports: number;
  total_actions: number;
  reports_by_reason: Record<string, number>;
  actions_by_type: Record<string, number>;
}

export interface AdminSystemStats {
  total_users: number;
  total_creators: number;
  total_businesses: number;
  total_reels: number;
  total_views: number;
  active_rooms: number;
  pending_reports: number;
  tokens_circulating: number;
}
