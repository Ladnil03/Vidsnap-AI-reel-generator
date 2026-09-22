import 'package:flutter/foundation.dart';

enum VerificationStatus {
  none('none', 'Unverified'),
  pending('pending', 'Pending Approval ⏳'),
  verified('verified', 'Verified Creator ✅'),
  rejected('rejected', 'Application Rejected');

  const VerificationStatus(this.value, this.label);
  final String value;
  final String label;

  static VerificationStatus fromString(String? value) {
    if (value == null) return VerificationStatus.none;
    return VerificationStatus.values.firstWhere(
      (s) => s.value.toLowerCase() == value.toLowerCase(),
      orElse: () => VerificationStatus.none,
    );
  }
}

/// Creator profile metadata, badge status, and public stats.
@immutable
class CreatorProfileModel {
  const CreatorProfileModel({
    required this.userId,
    required this.handle,
    required this.displayName,
    this.bio = '',
    this.niche = 'general',
    this.socialLinks = const <String, String>{},
    this.verificationStatus = VerificationStatus.none,
    this.totalReels = 0,
    this.totalViews = 0,
    this.followersCount = 0,
  });

  final String userId;
  final String handle;
  final String displayName;
  final String bio;
  final String niche;
  final Map<String, String> socialLinks;
  final VerificationStatus verificationStatus;
  final int totalReels;
  final int totalViews;
  final int followersCount;

  bool get isVerified => verificationStatus == VerificationStatus.verified;
  bool get isPendingVerification =>
      verificationStatus == VerificationStatus.pending;

  factory CreatorProfileModel.fromJson(Map<String, dynamic> json) {
    return CreatorProfileModel(
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      handle: (json['handle'] ?? '').toString(),
      displayName:
          (json['display_name'] ?? json['displayName'] ?? '').toString(),
      bio: (json['bio'] ?? '').toString(),
      niche: (json['niche'] ?? 'general').toString(),
      socialLinks: (json['social_links'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v.toString()),
          ) ??
          const <String, String>{},
      verificationStatus: VerificationStatus.fromString(
        json['verification_status']?.toString(),
      ),
      totalReels: (json['total_reels'] ?? json['totalReels'] ?? 0) as int,
      totalViews: (json['total_views'] ?? json['totalViews'] ?? 0) as int,
      followersCount:
          (json['followers_count'] ?? json['followersCount'] ?? 0) as int,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'user_id': userId,
      'handle': handle,
      'display_name': displayName,
      'bio': bio,
      'niche': niche,
      'social_links': socialLinks,
      'verification_status': verificationStatus.value,
      'total_reels': totalReels,
      'total_views': totalViews,
      'followers_count': followersCount,
    };
  }
}

/// Aggregated viewer metrics, watch time, and audience affinity.
@immutable
class CreatorAnalyticsModel {
  const CreatorAnalyticsModel({
    required this.userId,
    this.periodDays = 30,
    this.totalImpressions = 0,
    this.totalViews = 0,
    this.totalWatchSeconds = 0,
    this.avgCompletionRatePct = 0.0,
    this.engagementRatePct = 0.0,
    this.topTags = const <Map<String, dynamic>>[],
    this.audienceMoodAffinity = const <Map<String, dynamic>>[],
    this.dailyViewsTrend = const <Map<String, dynamic>>[],
  });

  final String userId;
  final int periodDays;
  final int totalImpressions;
  final int totalViews;
  final int totalWatchSeconds;
  final double avgCompletionRatePct;
  final double engagementRatePct;
  final List<Map<String, dynamic>> topTags;
  final List<Map<String, dynamic>> audienceMoodAffinity;
  final List<Map<String, dynamic>> dailyViewsTrend;

  double get watchTimeHours => totalWatchSeconds / 3600.0;

  factory CreatorAnalyticsModel.fromJson(Map<String, dynamic> json) {
    return CreatorAnalyticsModel(
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      periodDays: (json['period_days'] ?? json['periodDays'] ?? 30) as int,
      totalImpressions:
          (json['total_impressions'] ?? json['totalImpressions'] ?? 0) as int,
      totalViews: (json['total_views'] ?? json['totalViews'] ?? 0) as int,
      totalWatchSeconds:
          (json['total_watch_seconds'] ?? json['totalWatchSeconds'] ?? 0)
              as int,
      avgCompletionRatePct: ((json['avg_completion_rate_pct'] ??
                  json['avgCompletionRatePct'] ??
                  0.0) as num)
          .toDouble(),
      engagementRatePct: ((json['engagement_rate_pct'] ??
                  json['engagementRatePct'] ??
                  0.0) as num)
          .toDouble(),
      topTags: (json['top_tags'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          const <Map<String, dynamic>>[],
      audienceMoodAffinity: (json['audience_mood_affinity'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          const <Map<String, dynamic>>[],
      dailyViewsTrend: (json['daily_views_trend'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          const <Map<String, dynamic>>[],
    );
  }
}

/// Single high-retention video hook proposal from Creator Copilot.
@immutable
class CreatorCopilotHook {
  const CreatorCopilotHook({
    required this.hookText,
    required this.hookStyle,
  });

  final String hookText;
  final String hookStyle;

  factory CreatorCopilotHook.fromJson(Map<String, dynamic> json) {
    return CreatorCopilotHook(
      hookText: (json['hook_text'] ?? json['hookText'] ?? '').toString(),
      hookStyle: (json['hook_style'] ?? json['hookStyle'] ?? '').toString(),
    );
  }
}

/// AI-powered content strategy result from Creator Copilot.
@immutable
class CreatorCopilotResponseModel {
  const CreatorCopilotResponseModel({
    required this.topic,
    this.hooks = const <CreatorCopilotHook>[],
    required this.viralPotentialScore,
    this.viralScoreBreakdown = '',
    this.optimalPostingWindow = '18:00 - 21:00 UTC',
    this.recommendedHashtags = const <String>[],
    this.suggestedCallToAction = 'Comment below!',
  });

  final String topic;
  final List<CreatorCopilotHook> hooks;
  final int viralPotentialScore;
  final String viralScoreBreakdown;
  final String optimalPostingWindow;
  final List<String> recommendedHashtags;
  final String suggestedCallToAction;

  factory CreatorCopilotResponseModel.fromJson(Map<String, dynamic> json) {
    return CreatorCopilotResponseModel(
      topic: (json['topic'] ?? '').toString(),
      hooks: (json['hooks'] as List<dynamic>?)
              ?.map((e) =>
                  CreatorCopilotHook.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <CreatorCopilotHook>[],
      viralPotentialScore: (json['viral_potential_score'] ??
          json['viralPotentialScore'] ??
          75) as int,
      viralScoreBreakdown: (json['viral_score_breakdown'] ??
              json['viralScoreBreakdown'] ??
              '')
          .toString(),
      optimalPostingWindow: (json['optimal_posting_window'] ??
              json['optimalPostingWindow'] ??
              '18:00 - 21:00 UTC')
          .toString(),
      recommendedHashtags: (json['recommended_hashtags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const <String>[],
      suggestedCallToAction: (json['suggested_call_to_action'] ??
              json['suggestedCallToAction'] ??
              'Comment below!')
          .toString(),
    );
  }
}

/// Verification application submission record.
@immutable
class VerificationApplicationModel {
  const VerificationApplicationModel({
    required this.applicationId,
    required this.userId,
    required this.niche,
    this.portfolioLinks = const <String>[],
    required this.statement,
    this.status = VerificationStatus.pending,
    this.submittedAt,
  });

  final String applicationId;
  final String userId;
  final String niche;
  final List<String> portfolioLinks;
  final String statement;
  final VerificationStatus status;
  final DateTime? submittedAt;

  factory VerificationApplicationModel.fromJson(Map<String, dynamic> json) {
    return VerificationApplicationModel(
      applicationId:
          (json['application_id'] ?? json['applicationId'] ?? '').toString(),
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      niche: (json['niche'] ?? '').toString(),
      portfolioLinks: (json['portfolio_links'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const <String>[],
      statement: (json['statement'] ?? '').toString(),
      status: VerificationStatus.fromString(json['status']?.toString()),
      submittedAt: json['submitted_at'] != null
          ? DateTime.tryParse(json['submitted_at'].toString())
          : null,
    );
  }
}
