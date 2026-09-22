import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/social/data/social_repository.dart';

void main() {
  group('SocialRepository Unit Tests', () {
    late Dio dio;
    late SocialRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = SocialRepository(dio: dio);
    });

    test(
      'followUser sends follow POST and returns FollowStatusModel',
      () async {
        dio.httpClientAdapter = _MockAdapter((options) {
          expect(options.path, '/api/v1/social/follow/creator-42');
          expect(options.method, 'POST');

          final data = {
            'target_user_id': 'creator-42',
            'is_following': true,
            'is_friend': false,
            'followers_count': 105,
            'following_count': 20,
          };

          return ResponseBody.fromString(
            jsonEncode(data),
            200,
            headers: {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
          );
        });

        final status = await repository.followUser('creator-42');
        expect(status.targetUserId, 'creator-42');
        expect(status.isFollowing, isTrue);
        expect(status.isFriend, isFalse);
        expect(status.followersCount, 105);
      },
    );

    test('unfollowUser sends DELETE and returns FollowStatusModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/social/follow/creator-42');
        expect(options.method, 'DELETE');

        final data = {
          'target_user_id': 'creator-42',
          'is_following': false,
          'is_friend': false,
          'followers_count': 104,
          'following_count': 20,
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final status = await repository.unfollowUser('creator-42');
      expect(status.isFollowing, isFalse);
      expect(status.followersCount, 104);
    });

    test('getFollowStatus checks relationship between users', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/social/follow-status/creator-42');

        final data = {
          'target_user_id': 'creator-42',
          'is_following': true,
          'is_friend': true,
          'followers_count': 150,
          'following_count': 80,
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final status = await repository.getFollowStatus('creator-42');
      expect(status.isFriend, isTrue);
    });

    test('listCommunities returns parsed interest communities', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/social/communities');
        expect(options.queryParameters['category'], 'tech');
        expect(options.queryParameters['q'], 'flutter');

        final data = {
          'total': 1,
          'items': [
            {
              'community_id': 'comm-1',
              'name': 'Flutter Devs Global',
              'slug': 'flutter-devs',
              'description': 'Mobile & cross-platform creators',
              'category': 'tech',
              'creator_id': 'user-1',
              'members_count': 342,
              'is_member': true,
              'created_at': '2026-01-01T00:00:00Z',
            },
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

      final communities = await repository.listCommunities(
        category: 'tech',
        query: 'flutter',
      );
      expect(communities.length, 1);
      final comm = communities.first;
      expect(comm.communityId, 'comm-1');
      expect(comm.name, 'Flutter Devs Global');
      expect(comm.isMember, isTrue);
      expect(comm.membersCount, 342);
    });

    test('joinCommunity joins community and returns updated model', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/social/communities/comm-1/join');

        final data = {
          'community_id': 'comm-1',
          'name': 'Flutter Devs Global',
          'slug': 'flutter-devs',
          'description': '',
          'category': 'tech',
          'creator_id': 'user-1',
          'members_count': 343,
          'is_member': true,
          'created_at': '2026-01-01T00:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final comm = await repository.joinCommunity('comm-1');
      expect(comm.isMember, isTrue);
      expect(comm.membersCount, 343);
    });

    test('leaveCommunity leaves community and returns updated model', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/social/communities/comm-1/leave');

        final data = {
          'community_id': 'comm-1',
          'name': 'Flutter Devs Global',
          'slug': 'flutter-devs',
          'description': '',
          'category': 'tech',
          'creator_id': 'user-1',
          'members_count': 342,
          'is_member': false,
          'created_at': '2026-01-01T00:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final comm = await repository.leaveCommunity('comm-1');
      expect(comm.isMember, isFalse);
      expect(comm.membersCount, 342);
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
