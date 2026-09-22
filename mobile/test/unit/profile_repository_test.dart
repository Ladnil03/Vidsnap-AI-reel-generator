import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/profile/data/profile_repository.dart';
import 'package:vidsnap_ai/features/profile/domain/profile_models.dart';

void main() {
  group('ProfileRepository Unit Tests', () {
    late Dio dio;
    late ProfileRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = ProfileRepository(dio);
    });

    test('getMyProfile aggregates user details and social metrics', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        if (options.path == '/api/v1/users/me') {
          return ResponseBody.fromString(
            jsonEncode({
              'user_id': 'u-prof-1',
              'name': 'Dev Creator',
              'email': 'creator@vidsnap.ai',
              'roles': ['user', 'creator'],
              'tokens_remaining': 150,
              'timezone': 'Asia/Kolkata',
              'created_at': '2026-01-01T00:00:00Z',
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        } else if (options.path == '/api/v1/social/profile/u-prof-1') {
          return ResponseBody.fromString(
            jsonEncode({
              'user_id': 'u-prof-1',
              'name': 'Dev Creator',
              'email': 'creator@vidsnap.ai',
              'bio': 'Flutter mobile enthusiast',
              'followers_count': 1240,
              'following_count': 320,
              'reels_count': 18,
            }),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        }
        return ResponseBody.fromString('{}', 404);
      });

      final profile = await repository.getMyProfile();
      expect(profile.userId, 'u-prof-1');
      expect(profile.name, 'Dev Creator');
      expect(profile.followersCount, 1240);
      expect(profile.followingCount, 320);
      expect(profile.reelsCount, 18);
      expect(profile.bio, 'Flutter mobile enthusiast');
      expect(profile.isCreator, isTrue);
      expect(profile.tokensRemaining, 150);
    });

    test('updateProfile updates display name and bio', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/users/me');
        expect(options.method, 'PATCH');

        return ResponseBody.fromString(
          jsonEncode({
            'user_id': 'u-prof-1',
            'name': 'Updated Name',
            'email': 'creator@vidsnap.ai',
            'roles': ['user'],
            'tokens_remaining': 150,
            'timezone': 'UTC',
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final updated = await repository.updateProfile(
        const UpdateProfileInput(name: 'Updated Name', bio: 'New bio'),
      );
      expect(updated.name, 'Updated Name');
    });

    test('getUserReels returns parsed list of user videos', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/content/videos');
        expect(options.queryParameters['user_id'], 'u-prof-1');

        final data = [
          {
            'video_id': 'v-101',
            'creator_id': 'u-prof-1',
            'creator_name': 'Dev Creator',
            'title': 'Flutter 3.47 Features',
            'video_url': 'https://cdn.example.com/v101.mp4',
            'likes_count': 450,
            'comments_count': 22,
            'views_count': 3200,
          },
        ];

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final reels = await repository.getUserReels('u-prof-1');
      expect(reels.length, 1);
      expect(reels.first.videoId, 'v-101');
      expect(reels.first.viewsCount, 3200);
    });

    test('getSavedReels returns saved videos tab', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/feed');
        expect(options.queryParameters['tab'], 'saved');

        final data = {
          'items': [
            {
              'video_id': 'v-saved-1',
              'creator_id': 'c-2',
              'creator_name': 'Saved Creator',
              'title': 'Design Tokens Guide',
              'video_url': 'https://cdn.example.com/v_saved.mp4',
              'likes_count': 100,
              'comments_count': 5,
              'views_count': 1200,
            },
          ],
        };

        return ResponseBody.fromString(
          jsonEncode(data['items']),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final saved = await repository.getSavedReels();
      expect(saved.length, 1);
      expect(saved.first.videoId, 'v-saved-1');
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
