import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/discovery/data/discovery_repository.dart';

void main() {
  group('DiscoveryRepository Unit Tests', () {
    late Dio dio;
    late DiscoveryRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = DiscoveryRepository(dio: dio);
    });

    test('search passes query parameters and returns DiscoverySearchResponseModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/discovery/search');
        expect(options.queryParameters['q'], 'flutter');
        expect(options.queryParameters['source'], 'youtube_shorts');
        expect(options.queryParameters['tag'], 'mobile');
        expect(options.queryParameters['page'], 1);
        expect(options.queryParameters['limit'], 20);

        final data = <String, dynamic>{
          'total': 1,
          'page': 1,
          'limit': 20,
          'has_more': false,
          'items': <Map<String, dynamic>>[
            <String, dynamic>{
              'item_id': 'disc-1',
              'source': 'youtube_shorts',
              'external_id': 'ext-yt-1',
              'title': 'Flutter Fast Hacks',
              'description': 'Top 5 Flutter animation tricks',
              'author_name': 'CodeDaily',
              'source_url': 'https://youtube.com/shorts/123',
              'embed_url': 'https://youtube.com/embed/123',
              'thumbnail_url': 'https://img.youtube.com/vi/123/hqdefault.jpg',
              'duration': 45.0,
              'tags': <String>['flutter', 'mobile'],
              'attribution_text': 'From YouTube Shorts',
              'views_count': 45000,
              'likes_count': 3200,
              'created_at': '2026-03-10T10:00:00Z',
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

      final result = await repository.search(
        query: 'flutter',
        source: 'youtube_shorts',
        tag: '#mobile',
        page: 1,
        limit: 20,
      );

      expect(result.items.length, 1);
      final item = result.items.first;
      expect(item.itemId, 'disc-1');
      expect(item.title, 'Flutter Fast Hacks');
      expect(item.authorName, 'CodeDaily');
      expect(item.viewsCount, 45000);
      expect(item.tags, <String>['flutter', 'mobile']);
    });

    test('getItem fetches a single discovery item by ID', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/discovery/items/item-999');

        final item = <String, dynamic>{
          'item_id': 'item-999',
          'source': 'pexels',
          'external_id': 'pex-123',
          'title': 'Calm Nature River',
          'description': '4k cinematic vertical stream',
          'author_name': 'NatureCreator',
          'source_url': 'https://pexels.com/video/123',
          'embed_url': 'https://videos.pexels.com/video-files/123.mp4',
          'thumbnail_url': 'https://images.pexels.com/123.jpg',
          'duration': 18.0,
          'tags': <String>['nature', 'relax'],
          'attribution_text': 'From Pexels',
          'views_count': 12000,
          'likes_count': 840,
          'created_at': '2026-03-12T08:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(item),
          200,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>[Headers.jsonContentType],
          },
        );
      });

      final item = await repository.getItem('item-999');
      expect(item.itemId, 'item-999');
      expect(item.source, 'pexels');
      expect(item.authorName, 'NatureCreator');
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
