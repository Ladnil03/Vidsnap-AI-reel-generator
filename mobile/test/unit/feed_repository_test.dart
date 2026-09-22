import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';

void main() {
  group('FeedRepository Unit Tests', () {
    late Dio dio;
    late FeedRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = FeedRepository(dio: dio);
    });

    test('getFeed calls /api/v1/feed with tab and limit and returns parsed items', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/feed');
        expect(options.queryParameters['tab'], 'trending');
        expect(options.queryParameters['limit'], 10);

        final data = <String, dynamic>{
          'tab': 'trending',
          'total': 1,
          'has_more': false,
          'items': <Map<String, dynamic>>[
            <String, dynamic>{
              'video_id': 'vid-123',
              'user_id': 'user-1',
              'author_name': 'SuperCreator',
              'title': 'Viral AI Reel',
              'description': 'Exploring agentic AI generation in 2026',
              'hashtags': <String>['ai', 'future'],
              'video_url': 'https://cdn.vidsnap.ai/vid-123.mp4',
              'thumbnail_url': 'https://cdn.vidsnap.ai/thumb-123.jpg',
              'duration': 15.5,
              'likes_count': 1420,
              'saves_count': 89,
              'comments_count': 34,
              'views_count': 9200,
              'has_liked': true,
              'has_saved': false,
              'created_at': '2026-03-15T12:00:00Z',
            },
          ],
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>[Headers.jsonContentType],
          },
        );
      });

      final items = await repository.getFeed(tab: FeedTab.trending, limit: 10);

      expect(items.length, 1);
      final item = items.first;
      expect(item.videoId, 'vid-123');
      expect(item.authorName, 'SuperCreator');
      expect(item.likesCount, 1420);
      expect(item.hasLiked, true);
      expect(item.hasSaved, false);
      expect(item.hashtags, <String>['ai', 'future']);
    });

    test('toggleLike sends POST when currently unliked and DELETE when currently liked', () async {
      int requestCount = 0;
      dio.httpClientAdapter = _MockAdapter((options) {
        requestCount++;
        if (options.method == 'POST') {
          expect(options.path, '/api/v1/content/videos/vid-1/like');
          return ResponseBody.fromString(
            jsonEncode(<String, dynamic>{
              'video_id': 'vid-1',
              'liked': true,
              'likes_count': 11,
            }),
            200,
            headers: <String, List<String>>{
              Headers.contentTypeHeader: <String>[Headers.jsonContentType],
            },
          );
        } else {
          expect(options.method, 'DELETE');
          expect(options.path, '/api/v1/content/videos/vid-1/like');
          return ResponseBody.fromString(
            jsonEncode(<String, dynamic>{
              'video_id': 'vid-1',
              'liked': false,
              'likes_count': 10,
            }),
            200,
            headers: <String, List<String>>{
              Headers.contentTypeHeader: <String>[Headers.jsonContentType],
            },
          );
        }
      });

      // Like
      final likeResp = await repository.toggleLike('vid-1', currentlyLiked: false);
      expect(likeResp['liked'], true);

      // Unlike
      final unlikeResp = await repository.toggleLike('vid-1', currentlyLiked: true);
      expect(unlikeResp['liked'], false);
      expect(requestCount, 2);
    });

    test('getComments fetches comment list from /api/v1/content/videos/:id/comments', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/content/videos/vid-1/comments');

        final comments = <Map<String, dynamic>>[
          <String, dynamic>{
            'comment_id': 'c-1',
            'video_id': 'vid-1',
            'user_id': 'u-1',
            'user_name': 'Fan1',
            'text': 'Amazing reel!',
            'created_at': '2026-03-15T12:30:00Z',
          },
        ];

        return ResponseBody.fromString(
          jsonEncode(comments),
          200,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>[Headers.jsonContentType],
          },
        );
      });

      final comments = await repository.getComments('vid-1');
      expect(comments.length, 1);
      expect(comments.first.commentId, 'c-1');
      expect(comments.first.userName, 'Fan1');
      expect(comments.first.text, 'Amazing reel!');
    });

    test('addComment posts new comment to backend', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.method, 'POST');
        expect(options.path, '/api/v1/content/videos/vid-1/comments');
        final body = options.data as Map<String, dynamic>;
        expect(body['text'], 'So helpful!');

        return ResponseBody.fromString(
          jsonEncode(<String, dynamic>{
            'comment_id': 'c-new',
            'video_id': 'vid-1',
            'user_id': 'u-me',
            'user_name': 'Tester',
            'text': 'So helpful!',
            'created_at': '2026-03-15T13:00:00Z',
          }),
          201,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>[Headers.jsonContentType],
          },
        );
      });

      final result = await repository.addComment('vid-1', 'So helpful!');
      expect(result.commentId, 'c-new');
      expect(result.text, 'So helpful!');
    });

    test('recordWatchProgress posts playback position beacon', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.method, 'POST');
        expect(options.path, '/api/v1/feed/watch-progress');
        final body = options.data as Map<String, dynamic>;
        expect(body['video_id'], 'vid-1');
        expect(body['watched_seconds'], 12.0);
        expect(body['total_seconds'], 15.0);

        return ResponseBody.fromString(
          jsonEncode(<String, dynamic>{
            'video_id': 'vid-1',
            'watched_seconds': 12.0,
            'total_seconds': 15.0,
            'percentage': 80.0,
            'completed': false,
            'updated_at': '2026-03-15T14:00:00Z',
          }),
          200,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>[Headers.jsonContentType],
          },
        );
      });

      final res = await repository.recordWatchProgress(
        const WatchProgressRequestModel(
          videoId: 'vid-1',
          watchedSeconds: 12.0,
          totalSeconds: 15.0,
        ),
      );

      expect(res.videoId, 'vid-1');
      expect(res.percentage, 80.0);
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
