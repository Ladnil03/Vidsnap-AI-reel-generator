import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/rooms/data/rooms_repository.dart';

void main() {
  group('RoomsRepository Unit Tests', () {
    late Dio dio;
    late RoomsRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = RoomsRepository(dio: dio);
    });

    test('listRooms sends search and room_type and returns parsed rooms', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms');
        expect(options.queryParameters['search'], 'Anime');
        expect(options.queryParameters['room_type'], 'public');

        final data = [
          {
            'room_id': 'room-101',
            'name': 'Anime Night',
            'description': 'Watching ep 1-3',
            'room_type': 'public',
            'control_mode': 'host_only',
            'host_id': 'host-1',
            'host_name': 'OtakuKing',
            'participant_count': 5,
            'participants': [
              {
                'user_id': 'host-1',
                'name': 'OtakuKing',
                'is_host': true,
                'joined_at': '2026-03-22T10:00:00Z',
                'last_seen_at': '2026-03-22T10:05:00Z',
              },
            ],
            'watch_state': {
              'media_url': 'https://cdn.example.com/anime.mp4',
              'media_title': 'Episode 1',
              'media_type': 'native',
              'state': 'playing',
              'position_seconds': 45.2,
              'playback_rate': 1.0,
              'last_updated_at': '2026-03-22T10:05:00Z',
            },
            'created_at': '2026-03-22T10:00:00Z',
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

      final rooms = await repository.listRooms(search: 'Anime', roomType: 'public');
      expect(rooms.length, 1);
      final room = rooms.first;
      expect(room.roomId, 'room-101');
      expect(room.name, 'Anime Night');
      expect(room.participantCount, 5);
      expect(room.watchState.isPlaying, isTrue);
      expect(room.watchState.positionSeconds, 45.2);
    });

    test('getRoom fetches single room details', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-999');
        final data = {
          'room_id': 'room-999',
          'name': 'Chill Lounge',
          'description': 'Lofi beats and chat',
          'room_type': 'public',
          'control_mode': 'democratic',
          'host_id': 'host-2',
          'host_name': 'LofiGuru',
          'participant_count': 12,
          'participants': <Map<String, dynamic>>[],
          'watch_state': {
            'media_url': 'https://cdn.example.com/lofi.mp4',
            'media_title': 'Synthwave Chill',
            'state': 'playing',
            'position_seconds': 120.0,
            'playback_rate': 1.0,
            'last_updated_at': '2026-03-22T11:00:00Z',
          },
          'created_at': '2026-03-22T10:30:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final room = await repository.getRoom('room-999');
      expect(room.roomId, 'room-999');
      expect(room.name, 'Chill Lounge');
      expect(room.controlMode, 'democratic');
    });

    test('createRoom sends payload and parses created room', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms');
        expect(options.method, 'POST');
        final reqData = options.data as Map<String, dynamic>;
        expect(reqData['name'], 'Secret VIP Room');
        expect(reqData['room_type'], 'private');
        expect(reqData['passcode'], 'secret1234');

        final data = {
          'room_id': 'room-created-1',
          'name': 'Secret VIP Room',
          'description': '',
          'room_type': 'private',
          'control_mode': 'host_only',
          'host_id': 'user-self',
          'host_name': 'You',
          'participant_count': 1,
          'participants': <Map<String, dynamic>>[],
          'watch_state': {
            'media_url': '',
            'media_title': 'No video selected',
            'state': 'paused',
            'position_seconds': 0.0,
            'playback_rate': 1.0,
            'last_updated_at': '2026-03-22T11:00:00Z',
          },
          'created_at': '2026-03-22T11:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          201,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final room = await repository.createRoom(
        name: 'Secret VIP Room',
        roomType: 'private',
        passcode: 'secret1234',
      );

      expect(room.roomId, 'room-created-1');
      expect(room.isPrivate, isTrue);
    });

    test('joinRoom sends passcode and parses updated room', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-777/join');
        final reqData = options.data as Map<String, dynamic>;
        expect(reqData['passcode'], 'secret1234');

        final data = {
          'room_id': 'room-777',
          'name': 'Joined Room',
          'description': '',
          'room_type': 'private',
          'control_mode': 'host_only',
          'host_id': 'host-9',
          'host_name': 'Boss',
          'participant_count': 3,
          'participants': <Map<String, dynamic>>[],
          'watch_state': {
            'media_url': '',
            'media_title': 'Movie',
            'state': 'playing',
            'position_seconds': 300.0,
            'playback_rate': 1.0,
            'last_updated_at': '2026-03-22T11:00:00Z',
          },
          'created_at': '2026-03-22T11:00:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final room = await repository.joinRoom('room-777', passcode: 'secret1234');
      expect(room.roomId, 'room-777');
      expect(room.participantCount, 3);
    });

    test('leaveRoom sends leave request and returns true', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-777/leave');
        return ResponseBody.fromString(
          jsonEncode({'left': true}),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final success = await repository.leaveRoom('room-777');
      expect(success, isTrue);
    });

    test('syncPlayback sends sync commands and returns updated watch state', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-101/sync');
        final reqData = options.data as Map<String, dynamic>;
        expect(reqData['action'], 'play');
        expect(reqData['position_seconds'], 60.5);

        final data = {
          'media_url': 'https://cdn.example.com/video.mp4',
          'media_title': 'Cyberpunk Reel',
          'media_type': 'native',
          'state': 'playing',
          'position_seconds': 60.5,
          'playback_rate': 1.0,
          'last_updated_at': '2026-03-22T12:00:00Z',
          'updated_by_user_id': 'self',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final watchState = await repository.syncPlayback(
        'room-101',
        action: 'play',
        positionSeconds: 60.5,
      );

      expect(watchState.isPlaying, isTrue);
      expect(watchState.positionSeconds, 60.5);
      expect(watchState.mediaTitle, 'Cyberpunk Reel');
    });

    test('getChatHistory fetches chat messages', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-101/messages');
        expect(options.queryParameters['limit'], 50);

        final data = [
          {
            'message_id': 'msg-1',
            'room_id': 'room-101',
            'user_id': 'u1',
            'user_name': 'Alice',
            'text': 'Hello everyone!',
            'created_at': '2026-03-22T12:01:00Z',
            'is_system': false,
            'is_assistant': false,
          },
          {
            'message_id': 'msg-2',
            'room_id': 'room-101',
            'user_id': 'assistant',
            'user_name': 'AI Assistant',
            'text': 'Welcome to the watch party!',
            'created_at': '2026-03-22T12:01:05Z',
            'is_system': false,
            'is_assistant': true,
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

      final messages = await repository.getChatHistory('room-101');
      expect(messages.length, 2);
      expect(messages[0].text, 'Hello everyone!');
      expect(messages[1].isAssistant, isTrue);
    });

    test('getRtcToken fetches LiveKit credentials', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-101/rtc-token');

        final data = {
          'token': 'mock-jwt-rtc-token',
          'server_url': 'wss://livekit.vidsnap.ai',
          'room_name': 'room-101',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final creds = await repository.getRtcToken('room-101');
      expect(creds.token, 'mock-jwt-rtc-token');
      expect(creds.serverUrl, 'wss://livekit.vidsnap.ai');
      expect(creds.roomName, 'room-101');
    });

    test('getRoomRecap fetches AI summary and highlights', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/rooms/room-101/summary');

        final data = {
          'room_id': 'room-101',
          'summary': 'The group watched the premiere and discussed visual effects.',
          'highlights': [
            'Alice praised the sound design at 00:45',
            'Bob noticed the hidden easter egg at 01:20',
          ],
          'generated_at': '2026-03-22T12:30:00Z',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final recap = await repository.getRoomRecap('room-101');
      expect(recap.summary, contains('visual effects'));
      expect(recap.highlights.length, 2);
      expect(recap.highlights[0], contains('Alice'));
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
