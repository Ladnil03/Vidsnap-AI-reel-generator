import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vidsnap_ai/features/create/data/create_repository.dart';
import 'package:vidsnap_ai/features/create/domain/create_video_model.dart';

void main() {
  group('CreateRepository Unit Tests', () {
    late Dio dio;
    late SharedPreferences prefs;
    late CreateRepository repository;

    setUp(() async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      prefs = await SharedPreferences.getInstance();
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = CreateRepository(dio: dio, preferences: prefs);
    });

    test('suggestTags calls /api/v1/content/ai/suggest-tags and parses hashtags and hook', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/content/ai/suggest-tags');
        final body = options.data as Map<String, dynamic>;
        expect(body['title'], 'My Sunset Reel');

        return ResponseBody.fromString(
          jsonEncode(<String, dynamic>{
            'hashtags': <String>['sunset', 'aesthetic', 'cinematic'],
            'suggested_hook': 'You won’t believe this view...',
          }),
          200,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>[Headers.jsonContentType],
          },
        );
      });

      final result = await repository.suggestTags(title: 'My Sunset Reel');

      expect(result.hashtags, <String>['sunset', 'aesthetic', 'cinematic']);
      expect(result.suggestedHook, 'You won’t believe this view...');
    });

    test('saveDraft, getDrafts, and deleteDraft persist drafts correctly in SharedPreferences', () async {
      expect(repository.getDrafts().isEmpty, true);

      final draft1 = CreateVideoDraft(
        draftId: 'd-1',
        videoPath: '/tmp/reel1.mp4',
        title: 'Draft 1',
        description: 'First draft description',
        hashtags: const <String>['draft', 'test'],
        visibility: 'public',
        duration: 10.0,
        updatedAt: DateTime(2026, 3, 15, 10, 0),
      );

      await repository.saveDraft(draft1);

      final saved = repository.getDrafts();
      expect(saved.length, 1);
      expect(saved.first.draftId, 'd-1');
      expect(saved.first.title, 'Draft 1');
      expect(saved.first.hashtags, <String>['draft', 'test']);

      // Overwrite/update existing draft
      final updatedDraft1 = draft1.copyWith(title: 'Draft 1 Updated');
      await repository.saveDraft(updatedDraft1);

      final updatedList = repository.getDrafts();
      expect(updatedList.length, 1);
      expect(updatedList.first.title, 'Draft 1 Updated');

      // Delete draft
      await repository.deleteDraft('d-1');
      expect(repository.getDrafts().isEmpty, true);
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
