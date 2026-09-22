import 'package:flutter/foundation.dart';

/// User's dynamic level, tier badge title, and XP progression.
@immutable
class UserLevelModel {
  const UserLevelModel({
    required this.userId,
    required this.currentXp,
    required this.level,
    required this.title,
    required this.xpForCurrentLevel,
    required this.xpForNextLevel,
    required this.progressPct,
  });

  final String userId;
  final int currentXp;
  final int level;
  final String title;
  final int xpForCurrentLevel;
  final int xpForNextLevel;
  final double progressPct;

  factory UserLevelModel.fromJson(Map<String, dynamic> json) {
    return UserLevelModel(
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      currentXp: (json['current_xp'] ?? json['currentXp'] ?? 0) as int,
      level: (json['level'] ?? 1) as int,
      title: (json['title'] ?? 'Novice Explorer 🧭').toString(),
      xpForCurrentLevel:
          (json['xp_for_current_level'] ?? json['xpForCurrentLevel'] ?? 0) as int,
      xpForNextLevel:
          (json['xp_for_next_level'] ?? json['xpForNextLevel'] ?? 100) as int,
      progressPct: ((json['progress_pct'] ?? json['progressPct'] ?? 0.0) as num)
          .toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'user_id': userId,
      'current_xp': currentXp,
      'level': level,
      'title': title,
      'xp_for_current_level': xpForCurrentLevel,
      'xp_for_next_level': xpForNextLevel,
      'progress_pct': progressPct,
    };
  }
}

/// Streak tracking state with freeze shield token protection.
@immutable
class StreakStateModel {
  const StreakStateModel({
    this.scope = 'daily',
    this.targetId,
    this.currentStreak = 0,
    this.longestStreak = 0,
    this.lastActiveDate,
    this.freezeTokens = 2,
    this.isFrozenToday = false,
    this.updatedAt,
  });

  final String scope;
  final String? targetId;
  final int currentStreak;
  final int longestStreak;
  final String? lastActiveDate;
  final int freezeTokens;
  final bool isFrozenToday;
  final DateTime? updatedAt;

  factory StreakStateModel.fromJson(Map<String, dynamic> json) {
    return StreakStateModel(
      scope: (json['scope'] ?? 'daily').toString(),
      targetId: json['target_id']?.toString(),
      currentStreak: (json['current_streak'] ?? json['currentStreak'] ?? 0) as int,
      longestStreak: (json['longest_streak'] ?? json['longestStreak'] ?? 0) as int,
      lastActiveDate: json['last_active_date']?.toString(),
      freezeTokens: (json['freeze_tokens'] ?? json['freezeTokens'] ?? 2) as int,
      isFrozenToday:
          (json['is_frozen_today'] ?? json['isFrozenToday'] ?? false) as bool,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'scope': scope,
      if (targetId != null) 'target_id': targetId,
      'current_streak': currentStreak,
      'longest_streak': longestStreak,
      if (lastActiveDate != null) 'last_active_date': lastActiveDate,
      'freeze_tokens': freezeTokens,
      'is_frozen_today': isFrozenToday,
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }
}

/// Daily or weekly engagement quest populated with user's progress.
@immutable
class UserChallengeModel {
  const UserChallengeModel({
    required this.challengeId,
    required this.title,
    required this.description,
    required this.action,
    required this.targetCount,
    this.currentCount = 0,
    required this.rewardXp,
    this.isCompleted = false,
    this.isClaimed = false,
    this.isWeekly = false,
    this.icon = '🎯',
    this.expiresAt,
  });

  final String challengeId;
  final String title;
  final String description;
  final String action;
  final int targetCount;
  final int currentCount;
  final int rewardXp;
  final bool isCompleted;
  final bool isClaimed;
  final bool isWeekly;
  final String icon;
  final DateTime? expiresAt;

  double get progressFraction {
    if (targetCount <= 0) return 1.0;
    return (currentCount / targetCount).clamp(0.0, 1.0);
  }

  factory UserChallengeModel.fromJson(Map<String, dynamic> json) {
    return UserChallengeModel(
      challengeId:
          (json['challenge_id'] ?? json['challengeId'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      action: (json['action'] ?? '').toString(),
      targetCount:
          (json['target_count'] ?? json['targetCount'] ?? 1) as int,
      currentCount:
          (json['current_count'] ?? json['currentCount'] ?? 0) as int,
      rewardXp: (json['reward_xp'] ?? json['rewardXp'] ?? 50) as int,
      isCompleted:
          (json['is_completed'] ?? json['isCompleted'] ?? false) as bool,
      isClaimed: (json['is_claimed'] ?? json['isClaimed'] ?? false) as bool,
      isWeekly: (json['is_weekly'] ?? json['isWeekly'] ?? false) as bool,
      icon: (json['icon'] ?? '🎯').toString(),
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'challenge_id': challengeId,
      'title': title,
      'description': description,
      'action': action,
      'target_count': targetCount,
      'current_count': currentCount,
      'reward_xp': rewardXp,
      'is_completed': isCompleted,
      'is_claimed': isClaimed,
      'is_weekly': isWeekly,
      'icon': icon,
      if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
    };
  }
}

/// Unlockable achievement badge model with status.
@immutable
class UserBadgeModel {
  const UserBadgeModel({
    required this.badgeId,
    required this.name,
    required this.description,
    required this.icon,
    this.category = 'special',
    this.isUnlocked = false,
    this.unlockedAt,
    this.threshold = 1,
  });

  final String badgeId;
  final String name;
  final String description;
  final String icon;
  final String category;
  final bool isUnlocked;
  final DateTime? unlockedAt;
  final int threshold;

  factory UserBadgeModel.fromJson(Map<String, dynamic> json) {
    return UserBadgeModel(
      badgeId: (json['badge_id'] ?? json['badgeId'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      icon: (json['icon'] ?? '🏆').toString(),
      category: (json['category'] ?? 'special').toString(),
      isUnlocked:
          (json['is_unlocked'] ?? json['isUnlocked'] ?? false) as bool,
      unlockedAt: json['unlocked_at'] != null
          ? DateTime.tryParse(json['unlocked_at'].toString())
          : null,
      threshold: (json['threshold'] ?? 1) as int,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'badge_id': badgeId,
      'name': name,
      'description': description,
      'icon': icon,
      'category': category,
      'is_unlocked': isUnlocked,
      if (unlockedAt != null) 'unlocked_at': unlockedAt!.toIso8601String(),
      'threshold': threshold,
    };
  }
}

/// Global or weekly leaderboard ranking entry.
@immutable
class LeaderboardEntryModel {
  const LeaderboardEntryModel({
    required this.rank,
    required this.userId,
    required this.username,
    required this.displayName,
    this.avatarUrl,
    required this.score,
    required this.level,
    required this.title,
  });

  final int rank;
  final String userId;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final int score;
  final int level;
  final String title;

  factory LeaderboardEntryModel.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntryModel(
      rank: (json['rank'] ?? 0) as int,
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      username: (json['username'] ?? '').toString(),
      displayName:
          (json['display_name'] ?? json['displayName'] ?? '').toString(),
      avatarUrl: json['avatar_url']?.toString(),
      score: (json['score'] ?? 0) as int,
      level: (json['level'] ?? 1) as int,
      title: (json['title'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'rank': rank,
      'user_id': userId,
      'username': username,
      'display_name': displayName,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      'score': score,
      'level': level,
      'title': title,
    };
  }
}

/// Leaderboard response wrapper.
@immutable
class LeaderboardResponseModel {
  const LeaderboardResponseModel({
    required this.scope,
    required this.entries,
    this.userEntry,
    this.totalParticipants = 0,
  });

  final String scope;
  final List<LeaderboardEntryModel> entries;
  final LeaderboardEntryModel? userEntry;
  final int totalParticipants;

  factory LeaderboardResponseModel.fromJson(Map<String, dynamic> json) {
    return LeaderboardResponseModel(
      scope: (json['scope'] ?? 'all_time').toString(),
      entries: (json['entries'] as List<dynamic>?)
              ?.map((e) =>
                  LeaderboardEntryModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <LeaderboardEntryModel>[],
      userEntry: json['user_entry'] != null
          ? LeaderboardEntryModel.fromJson(
              json['user_entry'] as Map<String, dynamic>)
          : null,
      totalParticipants: (json['total_participants'] ?? 0) as int,
    );
  }
}

/// XP award response returned by claim or record actions.
@immutable
class AwardXPResponseModel {
  const AwardXPResponseModel({
    required this.awarded,
    required this.amount,
    required this.action,
    required this.newTotalXp,
    required this.currentLevel,
    required this.leveledUp,
    required this.message,
  });

  final bool awarded;
  final int amount;
  final String action;
  final int newTotalXp;
  final int currentLevel;
  final bool leveledUp;
  final String message;

  factory AwardXPResponseModel.fromJson(Map<String, dynamic> json) {
    return AwardXPResponseModel(
      awarded: (json['awarded'] ?? false) as bool,
      amount: (json['amount'] ?? 0) as int,
      action: (json['action'] ?? '').toString(),
      newTotalXp: (json['new_total_xp'] ?? json['newTotalXp'] ?? 0) as int,
      currentLevel:
          (json['current_level'] ?? json['currentLevel'] ?? 1) as int,
      leveledUp: (json['leveled_up'] ?? json['leveledUp'] ?? false) as bool,
      message: (json['message'] ?? '').toString(),
    );
  }
}

/// Complete aggregated gamification profile for user dashboard.
@immutable
class GamificationProfileModel {
  const GamificationProfileModel({
    required this.userId,
    required this.level,
    this.streaks = const <StreakStateModel>[],
    this.activeChallenges = const <UserChallengeModel>[],
    this.badgesUnlocked = const <UserBadgeModel>[],
    this.badgesUnlockedCount = 0,
    this.badgesTotalCount = 0,
    this.freezeTokensAvailable = 2,
  });

  final String userId;
  final UserLevelModel level;
  final List<StreakStateModel> streaks;
  final List<UserChallengeModel> activeChallenges;
  final List<UserBadgeModel> badgesUnlocked;
  final int badgesUnlockedCount;
  final int badgesTotalCount;
  final int freezeTokensAvailable;

  StreakStateModel? get dailyStreak {
    try {
      return streaks.firstWhere((s) => s.scope == 'daily');
    } catch (_) {
      return streaks.isNotEmpty ? streaks.first : null;
    }
  }

  factory GamificationProfileModel.fromJson(Map<String, dynamic> json) {
    return GamificationProfileModel(
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      level: json['level'] is Map<String, dynamic>
          ? UserLevelModel.fromJson(json['level'] as Map<String, dynamic>)
          : UserLevelModel(
              userId: (json['user_id'] ?? '').toString(),
              currentXp: 0,
              level: 1,
              title: 'Novice Explorer 🧭',
              xpForCurrentLevel: 0,
              xpForNextLevel: 100,
              progressPct: 0.0,
            ),
      streaks: (json['streaks'] as List<dynamic>?)
              ?.map((e) =>
                  StreakStateModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <StreakStateModel>[],
      activeChallenges: (json['active_challenges'] as List<dynamic>?)
              ?.map((e) =>
                  UserChallengeModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <UserChallengeModel>[],
      badgesUnlocked: (json['badges_unlocked'] as List<dynamic>?)
              ?.map((e) => UserBadgeModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <UserBadgeModel>[],
      badgesUnlockedCount: (json['badges_unlocked_count'] ?? 0) as int,
      badgesTotalCount: (json['badges_total_count'] ?? 0) as int,
      freezeTokensAvailable:
          (json['freeze_tokens_available'] ?? json['freezeTokensAvailable'] ?? 2)
              as int,
    );
  }
}
