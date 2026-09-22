import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/companion/data/companion_repository.dart';
import 'package:vidsnap_ai/features/companion/domain/companion_models.dart';

void main() {
  group('CompanionRepository Unit Tests', () {
    late Dio dio;
    late CompanionRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = CompanionRepository(dio);
    });

    test('chat sends message and optional mood, returning CompanionChatResponseModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/companion/chat');
        expect(options.method, 'POST');
        final body = options.data as Map<String, dynamic>;
        expect(body['message'], 'Recommend some chill reels');
        expect(body['mood'], 'chill');

        final data = {
          'message': {
            'message_id': 'msg-1',
            'role': 'assistant',
            'content': 'Here are some relaxing lo-fi reels for you!',
            'reels': [
              {'reel_id': 'reel-101', 'title': 'Rainy Evening Lo-Fi Beats'},
            ],
            'timestamp': '2026-09-22T12:00:00Z',
          },
          'suggested_actions': [
            'Show more like this',
            'Switch to energetic vibe',
          ],
          'active_mood': 'chill',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final response = await repository.chat(
        message: 'Recommend some chill reels',
        mood: MoodType.chill,
      );

      expect(response.message.messageId, 'msg-1');
      expect(response.message.role, 'assistant');
      expect(response.message.content, contains('relaxing lo-fi reels'));
      expect(response.message.reels?.length, 1);
      expect(response.suggestedActions.length, 2);
      expect(response.activeMood, MoodType.chill);
    });

    test(
      'getHistory returns parsed messages with timestamps and reels',
      () async {
        dio.httpClientAdapter = _MockAdapter((options) {
          expect(options.path, '/api/v1/companion/history');
          expect(options.queryParameters['limit'], 20);

          final data = [
            {
              'message_id': 'msg-u1',
              'role': 'user',
              'content': 'Hello companion!',
              'timestamp': '2026-09-22T11:55:00Z',
            },
            {
              'message_id': 'msg-a1',
              'role': 'assistant',
              'content': 'Hello! How can I assist you today?',
              'timestamp': '2026-09-22T11:55:02Z',
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

        final history = await repository.getHistory(limit: 20);
        expect(history.length, 2);
        expect(history.first.isUser, isTrue);
        expect(history.last.isAssistant, isTrue);
      },
    );

    test('clearHistory purges companion chat history', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/companion/history');
        expect(options.method, 'DELETE');

        return ResponseBody.fromString(
          jsonEncode({'cleared': true}),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final cleared = await repository.clearHistory();
      expect(cleared, isTrue);
    });

    test('getActiveMood returns active mood state', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/companion/mood');

        final data = {
          'user_id': 'usr-test',
          'mood': 'focused',
          'intensity': 0.8,
          'consent_given': true,
          'note': 'Working on mobile design',
          'updated_at': '2026-09-22T10:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final mood = await repository.getActiveMood();
      expect(mood, isNotNull);
      expect(mood!.mood, MoodType.focused);
      expect(mood.intensity, 0.8);
      expect(mood.note, 'Working on mobile design');
    });

    test('setMood updates mood state with consent', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/companion/mood');
        expect(options.method, 'POST');
        final body = options.data as Map<String, dynamic>;
        expect(body['mood'], 'energized');
        expect(body['consent_given'], true);

        final data = {
          'user_id': 'usr-test',
          'mood': 'energized',
          'intensity': 1.0,
          'consent_given': true,
          'updated_at': '2026-09-22T12:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final mood = await repository.setMood(mood: MoodType.energized);
      expect(mood.mood, MoodType.energized);
      expect(mood.consentGiven, isTrue);
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
