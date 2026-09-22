import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/auth/data/auth_repository.dart';
import 'package:vidsnap_ai/features/auth/domain/user_model.dart';
import 'package:vidsnap_ai/features/creator/data/creator_repository.dart';
import 'package:vidsnap_ai/features/creator/domain/creator_models.dart';
import 'package:vidsnap_ai/features/creator/presentation/creator_dashboard_screen.dart';

class _FakeTokenStorage extends TokenStorage {
  @override
  Future<bool> hasValidToken() async => true;
}

class _FakeAuthRepository extends AuthRepository {
  final User user;
  _FakeAuthRepository(this.user)
      : super(dio: Dio(), tokenStorage: _FakeTokenStorage());

  @override
  Future<User> getMe() async => user;
}

class _FakeCreatorRepository implements CreatorRepository {
  final CreatorProfileModel mockProfile = const CreatorProfileModel(
    userId: 'c-user-1',
    handle: 'top_creator',
    displayName: 'Top Creator',
    bio: 'Visual stories',
    niche: 'tech',
    verificationStatus: VerificationStatus.verified,
    totalReels: 20,
    totalViews: 50000,
    followersCount: 3000,
  );

  final CreatorAnalyticsModel mockAnalytics = const CreatorAnalyticsModel(
    userId: 'c-user-1',
    periodDays: 30,
    totalImpressions: 95000,
    totalViews: 50000,
    totalWatchSeconds: 36000,
    avgCompletionRatePct: 72.0,
    engagementRatePct: 9.5,
    audienceMoodAffinity: [
      {'mood': 'energized', 'count': 800}
    ],
  );

  @override
  Future<CreatorProfileModel> getProfile() async => mockProfile;

  @override
  Future<CreatorProfileModel> updateProfile({
    String? bio,
    String? niche,
    Map<String, String>? socialLinks,
  }) async =>
      mockProfile;

  @override
  Future<CreatorAnalyticsModel> getAnalytics({int days = 30}) async =>
      mockAnalytics;

  @override
  Future<CreatorCopilotResponseModel> getCopilotInsights({
    required String topic,
    String? targetAudience,
    String? moodVibe,
  }) async {
    return CreatorCopilotResponseModel(
      topic: topic,
      hooks: const [
        CreatorCopilotHook(
          hookText: 'You won\'t believe this Flutter update!',
          hookStyle: 'curiosity',
        ),
      ],
      viralPotentialScore: 92,
      optimalPostingWindow: '19:00 - 22:00 UTC',
    );
  }

  @override
  Future<VerificationApplicationModel> applyVerification({
    required String niche,
    required String statement,
    List<String> portfolioLinks = const <String>[],
  }) async {
    return VerificationApplicationModel(
      applicationId: 'app-1',
      userId: 'c-user-1',
      niche: niche,
      statement: statement,
    );
  }
}

void main() {
  group('CreatorDashboardScreen Widget Tests', () {
    late _FakeCreatorRepository fakeCreatorRepo;

    setUp(() {
      fakeCreatorRepo = _FakeCreatorRepository();
    });

    testWidgets('non-creator user sees Unlock Creator Studio CTA screen', (tester) async {
      final viewerAuth = AuthStateNotifier(
        tokenStorage: _FakeTokenStorage(),
        authRepository: _FakeAuthRepository(
          User(
            userId: 'u-viewer',
            name: 'Viewer User',
            email: 'viewer@vidsnap.ai',
            roles: const ['user'], // Not creator
            tokensRemaining: 10,
            emailVerified: true,
            timezone: 'UTC',
            createdAt: DateTime.now(),
          ),
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            creatorRepositoryProvider.overrideWithValue(fakeCreatorRepo),
            authStateProvider.overrideWith((ref) => viewerAuth),
          ],
          child: const MaterialApp(
            home: CreatorDashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Unlock Creator Studio'), findsOneWidget);
      expect(find.text('Activate Creator Account'), findsOneWidget);
    });

    testWidgets('creator user sees KPI tiles, handle, and generates AI Copilot strategy', (tester) async {
      final creatorAuth = AuthStateNotifier(
        tokenStorage: _FakeTokenStorage(),
        authRepository: _FakeAuthRepository(
          User(
            userId: 'c-user-1',
            name: 'Top Creator',
            email: 'creator@vidsnap.ai',
            roles: const ['user', 'creator'],
            tokensRemaining: 200,
            emailVerified: true,
            timezone: 'UTC',
            createdAt: DateTime.now(),
          ),
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            creatorRepositoryProvider.overrideWithValue(fakeCreatorRepo),
            authStateProvider.overrideWith((ref) => creatorAuth),
          ],
          child: const MaterialApp(
            home: CreatorDashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Creator Studio'), findsOneWidget);
      expect(find.text('@top_creator'), findsOneWidget);
      expect(find.text('50000'), findsOneWidget); // Total Views
      expect(find.text('10.0 hrs'), findsOneWidget); // Watch Time
      expect(find.text('Creator Copilot AI'), findsOneWidget);

      // Generate AI Copilot strategy
      final topicField = find.byType(TextField);
      await tester.enterText(topicField, 'Flutter 3.47');
      await tester.tap(find.text('Generate'));
      await tester.pumpAndSettle();

      expect(find.text('Viral Potential: 92/100'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (w) =>
              w is RichText &&
              w.text.toPlainText().contains('You won\'t believe this Flutter update!'),
        ),
        findsOneWidget,
      );
    });
  });
}
