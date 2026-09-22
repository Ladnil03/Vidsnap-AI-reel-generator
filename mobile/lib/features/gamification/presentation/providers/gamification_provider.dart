import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/gamification/data/gamification_repository.dart';
import 'package:vidsnap_ai/features/gamification/domain/gamification_models.dart';

@immutable
class GamificationState {
  const GamificationState({
    this.profile,
    this.badges = const <UserBadgeModel>[],
    this.leaderboard,
    this.isLoading = false,
    this.isClaiming = false,
    this.isCheckingIn = false,
    this.feedbackMessage,
    this.errorMessage,
  });

  final GamificationProfileModel? profile;
  final List<UserBadgeModel> badges;
  final LeaderboardResponseModel? leaderboard;
  final bool isLoading;
  final bool isClaiming;
  final bool isCheckingIn;
  final String? feedbackMessage;
  final String? errorMessage;

  bool get isDailyStreakActiveToday {
    final daily = profile?.dailyStreak;
    if (daily == null || daily.lastActiveDate == null) return false;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    return daily.lastActiveDate == today;
  }

  GamificationState copyWith({
    GamificationProfileModel? profile,
    List<UserBadgeModel>? badges,
    LeaderboardResponseModel? leaderboard,
    bool? isLoading,
    bool? isClaiming,
    bool? isCheckingIn,
    String? feedbackMessage,
    String? errorMessage,
    bool clearFeedback = false,
    bool clearError = false,
  }) {
    return GamificationState(
      profile: profile ?? this.profile,
      badges: badges ?? this.badges,
      leaderboard: leaderboard ?? this.leaderboard,
      isLoading: isLoading ?? this.isLoading,
      isClaiming: isClaiming ?? this.isClaiming,
      isCheckingIn: isCheckingIn ?? this.isCheckingIn,
      feedbackMessage: clearFeedback
          ? null
          : (feedbackMessage ?? this.feedbackMessage),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final gamificationNotifierProvider =
    NotifierProvider<GamificationNotifier, GamificationState>(
      GamificationNotifier.new,
    );

class GamificationNotifier extends Notifier<GamificationState> {
  GamificationRepository get _repo => ref.read(gamificationRepositoryProvider);

  @override
  GamificationState build() {
    Future.microtask(loadDashboard);
    return const GamificationState(isLoading: true);
  }

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final profileFuture = _repo.getProfile();
      final badgesFuture = _repo.getBadgesCatalog();
      final leaderboardFuture = _repo.getLeaderboard();

      final results = await Future.wait([
        profileFuture,
        badgesFuture,
        leaderboardFuture,
      ]);

      state = state.copyWith(
        profile: results[0] as GamificationProfileModel,
        badges: results[1] as List<UserBadgeModel>,
        leaderboard: results[2] as LeaderboardResponseModel,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load gamification data.',
      );
    }
  }

  Future<void> recordDailyCheckIn() async {
    if (state.isCheckingIn) return;
    state = state.copyWith(
      isCheckingIn: true,
      clearFeedback: true,
      clearError: true,
    );
    try {
      final streak = await _repo.recordStreakActivity();
      // Reload profile to get refreshed XP & level
      final updatedProfile = await _repo.getProfile();
      state = state.copyWith(
        profile: updatedProfile,
        isCheckingIn: false,
        feedbackMessage:
            '🔥 Day ${streak.currentStreak} logged! +25 XP awarded.',
      );
    } catch (e) {
      state = state.copyWith(
        isCheckingIn: false,
        errorMessage: 'Could not record check-in. Try again later.',
      );
    }
  }

  Future<void> claimChallenge(String challengeId) async {
    if (state.isClaiming) return;
    state = state.copyWith(
      isClaiming: true,
      clearFeedback: true,
      clearError: true,
    );
    try {
      final result = await _repo.claimChallenge(challengeId);
      final updatedProfile = await _repo.getProfile();
      final msg = result.leveledUp
          ? '🎉 Level Up! Level ${result.currentLevel} reached! +${result.amount} XP'
          : 'Quest Claimed! +${result.amount} XP';
      state = state.copyWith(
        profile: updatedProfile,
        isClaiming: false,
        feedbackMessage: msg,
      );
    } catch (e) {
      state = state.copyWith(
        isClaiming: false,
        errorMessage: 'Failed to claim quest reward.',
      );
    }
  }

  Future<void> freezeStreak() async {
    try {
      final updatedStreak = await _repo.freezeStreak();
      final currentProfile = state.profile;
      if (currentProfile != null) {
        final updatedStreaks = currentProfile.streaks
            .map((s) => s.scope == 'daily' ? updatedStreak : s)
            .toList();
        state = state.copyWith(
          profile: GamificationProfileModel(
            userId: currentProfile.userId,
            level: currentProfile.level,
            streaks: updatedStreaks,
            activeChallenges: currentProfile.activeChallenges,
            badgesUnlocked: currentProfile.badgesUnlocked,
            badgesUnlockedCount: currentProfile.badgesUnlockedCount,
            badgesTotalCount: currentProfile.badgesTotalCount,
            freezeTokensAvailable: updatedStreak.freezeTokens,
          ),
          feedbackMessage: '🛡️ Streak shield activated for today!',
        );
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Unable to use freeze token.');
    }
  }

  void clearFeedback() {
    state = state.copyWith(clearFeedback: true, clearError: true);
  }
}
