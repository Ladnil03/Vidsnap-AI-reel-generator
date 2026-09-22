import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/gamification/data/gamification_repository.dart';
import 'package:vidsnap_ai/features/gamification/domain/gamification_models.dart';
import 'package:vidsnap_ai/features/gamification/presentation/gamification_dashboard_screen.dart';

class _FakeGamificationRepository implements GamificationRepository {
  GamificationProfileModel profile = const GamificationProfileModel(
    userId: 'user-dash-1',
    level: UserLevelModel(
      userId: 'user-dash-1',
      currentXp: 350,
      level: 2,
      title: 'Rising Talent ✨',
      xpForCurrentLevel: 100,
      xpForNextLevel: 400,
      progressPct: 83.3,
    ),
    streaks: [
      StreakStateModel(
        scope: 'daily',
        currentStreak: 4,
        longestStreak: 10,
        lastActiveDate: '2026-09-20', // Not today
        freezeTokens: 2,
        isFrozenToday: false,
      ),
    ],
    activeChallenges: [
      UserChallengeModel(
        challengeId: 'q-complete',
        title: 'Create 1 Reel',
        description: 'Publish your work',
        action: 'create_reel',
        targetCount: 1,
        currentCount: 1,
        rewardXp: 50,
        isCompleted: true,
        isClaimed: false,
      ),
    ],
    badgesUnlocked: [
      UserBadgeModel(
        badgeId: 'b-star',
        name: 'Super Creator',
        description: 'Published 10 videos',
        icon: '🌟',
        isUnlocked: true,
      ),
    ],
    badgesUnlockedCount: 1,
    badgesTotalCount: 8,
    freezeTokensAvailable: 2,
  );

  final List<UserBadgeModel> badges = const [
    UserBadgeModel(
      badgeId: 'b-star',
      name: 'Super Creator',
      description: 'Published 10 videos',
      icon: '🌟',
      isUnlocked: true,
    ),
    UserBadgeModel(
      badgeId: 'b-lock',
      name: 'Legendary',
      description: 'Reach Level 35',
      icon: '👑',
      isUnlocked: false,
    ),
  ];

  final LeaderboardResponseModel leaderboard = const LeaderboardResponseModel(
    scope: 'all_time',
    entries: [
      LeaderboardEntryModel(
        rank: 1,
        userId: 'lead-1',
        username: 'pro_creator',
        displayName: 'Pro Creator',
        score: 9800,
        level: 10,
        title: 'Trendsetter 🚀',
      ),
    ],
    totalParticipants: 500,
  );

  bool checkInCalled = false;
  bool claimCalled = false;

  @override
  Future<GamificationProfileModel> getProfile() async {
    return profile;
  }

  @override
  Future<UserLevelModel> getUserLevel() async {
    return profile.level;
  }

  @override
  Future<StreakStateModel> recordStreakActivity({
    String scope = 'daily',
    String? targetId,
  }) async {
    checkInCalled = true;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final updatedStreak = StreakStateModel(
      scope: 'daily',
      currentStreak: 5,
      longestStreak: 10,
      lastActiveDate: today,
      freezeTokens: 2,
    );

    profile = GamificationProfileModel(
      userId: profile.userId,
      level: const UserLevelModel(
        userId: 'user-dash-1',
        currentXp: 375,
        level: 2,
        title: 'Rising Talent ✨',
        xpForCurrentLevel: 100,
        xpForNextLevel: 400,
        progressPct: 91.6,
      ),
      streaks: [updatedStreak],
      activeChallenges: profile.activeChallenges,
      badgesUnlocked: profile.badgesUnlocked,
      badgesUnlockedCount: profile.badgesUnlockedCount,
      badgesTotalCount: profile.badgesTotalCount,
      freezeTokensAvailable: profile.freezeTokensAvailable,
    );

    return updatedStreak;
  }

  @override
  Future<StreakStateModel> freezeStreak({
    String scope = 'daily',
    String? targetId,
  }) async {
    return profile.dailyStreak!;
  }

  @override
  Future<List<UserChallengeModel>> getChallenges() async {
    return profile.activeChallenges;
  }

  @override
  Future<AwardXPResponseModel> claimChallenge(String challengeId) async {
    claimCalled = true;
    return const AwardXPResponseModel(
      awarded: true,
      amount: 50,
      action: 'create_reel',
      newTotalXp: 400,
      currentLevel: 2,
      leveledUp: false,
      message: 'Claimed 50 XP!',
    );
  }

  @override
  Future<List<UserBadgeModel>> getBadgesCatalog() async {
    return badges;
  }

  @override
  Future<LeaderboardResponseModel> getLeaderboard({
    String scope = 'all_time',
    int limit = 50,
  }) async {
    return leaderboard;
  }
}

void main() {
  group('GamificationDashboardScreen Widget Tests', () {
    late _FakeGamificationRepository fakeRepo;

    setUp(() {
      fakeRepo = _FakeGamificationRepository();
    });

    Widget createWidget() {
      return ProviderScope(
        overrides: [gamificationRepositoryProvider.overrideWithValue(fakeRepo)],
        child: const MaterialApp(home: GamificationDashboardScreen()),
      );
    }

    testWidgets(
      'renders progression cards, streak flame, active quest, and badge showcase',
      (tester) async {
        tester.view.physicalSize = const Size(800, 2000);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(createWidget());
        await tester.pumpAndSettle();

        expect(find.text('Achievements & Quests'), findsOneWidget);
        expect(find.text('Rising Talent ✨'), findsOneWidget);
        expect(find.text('4 Day Streak'), findsOneWidget);
        expect(find.text('Active Quests'), findsOneWidget);
        expect(find.text('Create 1 Reel'), findsOneWidget);
        expect(find.text('Badge Showcase'), findsOneWidget);
        expect(find.text('Super Creator'), findsOneWidget);
        expect(find.text('Global Leaderboard'), findsOneWidget);
        expect(find.text('Pro Creator'), findsOneWidget);
      },
    );

    testWidgets(
      'tapping Claim Daily +25 XP records check-in and updates state',
      (tester) async {
        await tester.pumpWidget(createWidget());
        await tester.pumpAndSettle();

        final claimButton = find.text('Claim Daily +25 XP');
        expect(claimButton, findsOneWidget);

        await tester.tap(claimButton);
        await tester.pumpAndSettle();

        expect(fakeRepo.checkInCalled, isTrue);
        expect(find.text('5 Day Streak'), findsOneWidget);
        expect(find.text('Checked-In Today ✅'), findsOneWidget);
      },
    );

    testWidgets('tapping completed quest claim button triggers reward claim', (
      tester,
    ) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final questClaimBtn = find.text('+50 XP');
      expect(questClaimBtn, findsOneWidget);

      await tester.tap(questClaimBtn);
      await tester.pumpAndSettle();

      expect(fakeRepo.claimCalled, isTrue);
    });
  });
}
