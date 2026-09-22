import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/auth/data/auth_repository.dart';
import 'package:vidsnap_ai/features/auth/domain/user_model.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/profile/data/profile_repository.dart';
import 'package:vidsnap_ai/features/profile/domain/profile_models.dart';
import 'package:vidsnap_ai/features/profile/presentation/profile_screen.dart';

class _FakeTokenStorage extends TokenStorage {
  @override
  Future<bool> hasValidToken() async => true;
  @override
  Future<String?> getAccessToken() async => 'mock-token';
}

class _FakeAuthRepository extends AuthRepository {
  final User mockUser;
  _FakeAuthRepository(this.mockUser)
    : super(dio: Dio(), tokenStorage: _FakeTokenStorage());

  @override
  Future<User> getMe() async => mockUser;
}

class _FakeProfileRepository implements ProfileRepository {
  UserProfileModel mockProfile = const UserProfileModel(
    userId: 'u-1',
    name: 'Alex Creator',
    email: 'alex@vidsnap.ai',
    bio: 'Mobile dev & video enthusiast',
    followersCount: 1500,
    followingCount: 300,
    reelsCount: 2,
    tokensRemaining: 250,
    roles: ['user', 'creator'],
  );

  final List<FeedItemModel> mockReels = [
    FeedItemModel(
      videoId: 'v-1',
      userId: 'u-1',
      authorName: 'Alex Creator',
      title: 'First Reel',
      description: 'Intro to profile',
      hashtags: const ['flutter'],
      videoUrl: 'https://example.com/v1.mp4',
      duration: 15.0,
      viewsCount: 1200,
      likesCount: 150,
      commentsCount: 12,
      createdAt: DateTime.now(),
    ),
  ];

  final List<FeedItemModel> mockSaved = [
    FeedItemModel(
      videoId: 'v-saved',
      userId: 'c-99',
      authorName: 'Other Creator',
      title: 'Saved Inspiration',
      description: 'Saved video',
      hashtags: const ['design'],
      videoUrl: 'https://example.com/v2.mp4',
      duration: 20.0,
      viewsCount: 850,
      likesCount: 95,
      commentsCount: 6,
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<UserProfileModel> getMyProfile() async => mockProfile;

  @override
  Future<UserProfileModel> getUserProfile(String userId) async => mockProfile;

  @override
  Future<List<FeedItemModel>> getUserReels(String userId) async => mockReels;

  @override
  Future<List<FeedItemModel>> getSavedReels() async => mockSaved;

  @override
  Future<UserProfileModel> updateProfile(UpdateProfileInput input) async {
    mockProfile = mockProfile.copyWith(
      name: input.name ?? mockProfile.name,
      bio: input.bio ?? mockProfile.bio,
    );
    return mockProfile;
  }
}

void main() {
  group('ProfileScreen Widget Tests', () {
    late _FakeProfileRepository fakeProfileRepo;
    late _FakeAuthRepository fakeAuthRepo;
    late AuthStateNotifier authNotifier;

    setUp(() {
      fakeProfileRepo = _FakeProfileRepository();
      fakeAuthRepo = _FakeAuthRepository(
        User(
          userId: 'u-1',
          name: 'Alex Creator',
          email: 'alex@vidsnap.ai',
          roles: const ['user', 'creator'],
          tokensRemaining: 250,
          emailVerified: true,
          timezone: 'UTC',
          createdAt: DateTime.now(),
        ),
      );
      authNotifier = AuthStateNotifier(
        tokenStorage: _FakeTokenStorage(),
        authRepository: fakeAuthRepo,
      );
    });

    Widget createWidget() {
      return ProviderScope(
        overrides: [
          profileRepositoryProvider.overrideWithValue(fakeProfileRepo),
          authStateProvider.overrideWith((ref) => authNotifier),
        ],
        child: const MaterialApp(home: ProfileScreen()),
      );
    }

    testWidgets(
      'renders profile details, stats, role badge, and published reels tab',
      (tester) async {
        await tester.pumpWidget(createWidget());
        await tester.pumpAndSettle();

        expect(find.text('My Profile'), findsOneWidget);
        expect(find.text('Alex Creator'), findsOneWidget);
        expect(find.text('alex@vidsnap.ai'), findsOneWidget);
        expect(find.text('Mobile dev & video enthusiast'), findsOneWidget);
        expect(find.text('Creator 🎨'), findsOneWidget);

        // Stats
        expect(find.text('1500'), findsOneWidget); // Followers
        expect(find.text('300'), findsOneWidget); // Following
        expect(find.text('1200'), findsOneWidget); // Reel view count
      },
    );

    testWidgets('switching to Saved tab renders saved reels', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final savedTab = find.text('Saved');
      expect(savedTab, findsOneWidget);

      await tester.tap(savedTab);
      await tester.pumpAndSettle();

      expect(find.text('850'), findsOneWidget); // Saved video view count
    });

    testWidgets('tapping Edit Profile opens edit profile bottom sheet', (
      tester,
    ) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final editButton = find.text('Edit Profile');
      expect(editButton, findsOneWidget);

      await tester.tap(editButton);
      await tester.pumpAndSettle();

      expect(
        find.text('Edit Profile'),
        findsNWidgets(2),
      ); // Button & Sheet title
      expect(find.text('Save Changes'), findsOneWidget);
    });
  });
}
