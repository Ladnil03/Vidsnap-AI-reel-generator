import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/creator/data/creator_repository.dart';
import 'package:vidsnap_ai/features/creator/domain/creator_models.dart';

void main() {
  group('CreatorRepository Unit Tests', () {
    late Dio dio;
    late CreatorRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = CreatorRepository(dio);
    });

    test('getProfile returns parsed CreatorProfileModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/creator/profile');

        final data = {
          'user_id': 'c-100',
          'handle': 'neon_master',
          'display_name': 'Neon Master',
          'bio': 'Visual AI reels',
          'niche': 'tech',
          'verification_status': 'verified',
          'total_reels': 25,
          'total_views': 89000,
          'followers_count': 4200,
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
      expect(profile.handle, 'neon_master');
      expect(profile.isVerified, isTrue);
      expect(profile.totalViews, 89000);
      expect(profile.followersCount, 4200);
    });

    test('updateProfile sends PUT and returns updated CreatorProfileModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/creator/profile');
        expect(options.method, 'PUT');
        final body = options.data as Map<String, dynamic>;
        expect(body['bio'], 'Updated bio text');

        final data = {
          'user_id': 'c-100',
          'handle': 'neon_master',
          'display_name': 'Neon Master',
          'bio': 'Updated bio text',
          'niche': 'tech',
          'verification_status': 'verified',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final updated = await repository.updateProfile(bio: 'Updated bio text');
      expect(updated.bio, 'Updated bio text');
    });

    test('getAnalytics returns audience metrics, watch time, and affinity', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/creator/analytics');
        expect(options.queryParameters['days'], 30);

        final data = {
          'user_id': 'c-100',
          'period_days': 30,
          'total_impressions': 120000,
          'total_views': 45000,
          'total_watch_seconds': 72000,
          'avg_completion_rate_pct': 68.5,
          'engagement_rate_pct': 8.2,
          'audience_mood_affinity': [
            {'mood': 'energized', 'count': 1500}
          ],
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final analytics = await repository.getAnalytics(days: 30);
      expect(analytics.totalImpressions, 120000);
      expect(analytics.totalViews, 45000);
      expect(analytics.watchTimeHours, 20.0);
      expect(analytics.avgCompletionRatePct, 68.5);
      expect(analytics.audienceMoodAffinity.length, 1);
    });

    test('getCopilotInsights sends prompt and returns AI hooks with viral score', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/creator/copilot');
        expect(options.method, 'POST');
        final body = options.data as Map<String, dynamic>;
        expect(body['topic'], 'Flutter 3.47');

        final data = {
          'topic': 'Flutter 3.47',
          'hooks': [
            {
              'hook_text': 'Stop writing slow mobile apps with this new trick',
              'hook_style': 'curiosity_gap',
            }
          ],
          'viral_potential_score': 88,
          'optimal_posting_window': '19:00 - 22:00 UTC',
          'recommended_hashtags': ['#flutter', '#dev'],
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final copilot = await repository.getCopilotInsights(topic: 'Flutter 3.47');
      expect(copilot.viralPotentialScore, 88);
      expect(copilot.hooks.length, 1);
      expect(copilot.hooks.first.hookStyle, 'curiosity_gap');
      expect(copilot.optimalPostingWindow, contains('19:00'));
    });

    test('applyVerification submits application and returns VerificationApplicationModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/creator/verify/apply');
        expect(options.method, 'POST');

        final data = {
          'application_id': 'app-505',
          'user_id': 'c-100',
          'niche': 'tech',
          'statement': 'Active tutorial creator',
          'status': 'pending',
          'submitted_at': '2026-09-22T10:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final app = await repository.applyVerification(
        niche: 'tech',
        statement: 'Active tutorial creator',
      );
      expect(app.applicationId, 'app-505');
      expect(app.status, VerificationStatus.pending);
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
