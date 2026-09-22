import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/gamification/data/gamification_repository.dart';

void main() {
  group('GamificationRepository Unit Tests', () {
    late Dio dio;
    late GamificationRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = GamificationRepository(dio);
    });

    test('getProfile returns parsed GamificationProfileModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/profile');

        final data = {
          'user_id': 'user-123',
          'level': {
            'user_id': 'user-123',
            'current_xp': 450,
            'level': 3,
            'title': 'Rising Talent ✨',
            'xp_for_current_level': 400,
            'xp_for_next_level': 900,
            'progress_pct': 10.0,
          },
          'streaks': [
            {
              'scope': 'daily',
              'current_streak': 5,
              'longest_streak': 12,
              'last_active_date': '2026-09-22',
              'freeze_tokens': 2,
              'is_frozen_today': false,
            }
          ],
          'active_challenges': [
            {
              'challenge_id': 'quest-1',
              'title': 'Watch 3 Reels',
              'description': 'Enjoy content in your feed',
              'action': 'watch_reel',
              'target_count': 3,
              'current_count': 2,
              'reward_xp': 30,
              'is_completed': false,
              'is_claimed': false,
            }
          ],
          'badges_unlocked': [
            {
              'badge_id': 'badge-first-reel',
              'name': 'First Reel',
              'description': 'Watched your first reel',
              'icon': '🎬',
              'category': 'watch',
              'is_unlocked': true,
            }
          ],
          'badges_unlocked_count': 1,
          'badges_total_count': 12,
          'freeze_tokens_available': 2,
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final profile = await repository.getProfile();
      expect(profile.userId, 'user-123');
      expect(profile.level.level, 3);
      expect(profile.level.title, 'Rising Talent ✨');
      expect(profile.dailyStreak?.currentStreak, 5);
      expect(profile.activeChallenges.length, 1);
      expect(profile.badgesUnlockedCount, 1);
      expect(profile.freezeTokensAvailable, 2);
    });

    test('recordStreakActivity records daily login and returns updated streak', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/streaks/record');
        expect(options.method, 'POST');

        final data = {
          'scope': 'daily',
          'current_streak': 6,
          'longest_streak': 12,
          'last_active_date': '2026-09-22',
          'freeze_tokens': 2,
          'is_frozen_today': false,
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final streak = await repository.recordStreakActivity();
      expect(streak.currentStreak, 6);
      expect(streak.lastActiveDate, '2026-09-22');
    });

    test('freezeStreak uses a freeze token to safeguard streak', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/streaks/freeze');
        expect(options.method, 'POST');

        final data = {
          'scope': 'daily',
          'current_streak': 5,
          'longest_streak': 12,
          'last_active_date': '2026-09-21',
          'freeze_tokens': 1,
          'is_frozen_today': true,
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final streak = await repository.freezeStreak();
      expect(streak.freezeTokens, 1);
      expect(streak.isFrozenToday, isTrue);
    });

    test('getChallenges returns active quests with progress', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/challenges');

        final data = [
          {
            'challenge_id': 'q1',
            'title': 'Like 2 Reels',
            'description': 'Show creators love',
            'action': 'like_reel',
            'target_count': 2,
            'current_count': 1,
            'reward_xp': 20,
            'is_completed': false,
            'is_claimed': false,
          }
        ];

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final quests = await repository.getChallenges();
      expect(quests.length, 1);
      expect(quests.first.progressFraction, 0.5);
    });

    test('claimChallenge claims quest and returns AwardXPResponseModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/challenges/q1/claim');
        expect(options.method, 'POST');

        final data = {
          'awarded': true,
          'amount': 50,
          'action': 'challenge_completed',
          'new_total_xp': 500,
          'current_level': 4,
          'leveled_up': true,
          'message': 'Challenge reward claimed successfully!',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final award = await repository.claimChallenge('q1');
      expect(award.awarded, isTrue);
      expect(award.amount, 50);
      expect(award.leveledUp, isTrue);
      expect(award.currentLevel, 4);
    });

    test('getBadgesCatalog returns catalog with unlock status', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/badges');

        final data = [
          {
            'badge_id': 'b1',
            'name': 'Early Bird',
            'description': 'Watched before 9 AM',
            'icon': '🌅',
            'category': 'special',
            'threshold': 1,
            'is_unlocked': true,
            'unlocked_at': '2026-09-22T08:00:00Z',
          }
        ];

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final badges = await repository.getBadgesCatalog();
      expect(badges.length, 1);
      expect(badges.first.name, 'Early Bird');
      expect(badges.first.isUnlocked, isTrue);
    });

    test('getLeaderboard returns leaderboard rankings', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/gamification/leaderboard');
        expect(options.queryParameters['scope'], 'all_time');

        final data = {
          'scope': 'all_time',
          'entries': [
            {
              'rank': 1,
              'user_id': 'top-user',
              'username': 'cryptoking',
              'display_name': 'Crypto King',
              'score': 12500,
              'level': 12,
              'title': 'Trendsetter 🚀',
            }
          ],
          'total_participants': 1420,
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final leaderboard = await repository.getLeaderboard();
      expect(leaderboard.entries.length, 1);
      expect(leaderboard.entries.first.rank, 1);
      expect(leaderboard.entries.first.displayName, 'Crypto King');
      expect(leaderboard.totalParticipants, 1420);
    });
  });
}

class _MockAdapter implements HttpClientAdapter {
  final ResponseBody Function(RequestOptions options) handler;
  _MockAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}
