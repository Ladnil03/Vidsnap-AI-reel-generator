import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/rooms/data/room_socket_service.dart';

class _MockSocket implements IRoomSocket {
  final _inController = StreamController<dynamic>();
  final List<dynamic> sentMessages = [];

  @override
  Stream<dynamic> get stream => _inController.stream;

  @override
  void add(dynamic data) {
    sentMessages.add(data);
  }

  @override
  Future<void> close([int? code, String? reason]) async {
    await _inController.close();
  }

  void emit(Map<String, dynamic> json) {
    _inController.add(jsonEncode(json));
  }
}

class _MockTokenStorage extends TokenStorage {
  @override
  Future<String?> getAccessToken() async => 'test-jwt-token';
}

void main() {
  group('RoomSocketService Unit Tests', () {
    late _MockSocket mockSocket;
    late RoomSocketService socketService;

    setUp(() {
      mockSocket = _MockSocket();
      socketService = RoomSocketService(
        tokenStorage: _MockTokenStorage(),
        socketFactory: (uri) async => mockSocket,
      );
    });

    tearDown(() {
      socketService.dispose();
    });

    test('connects and receives RoomChatEvent', () async {
      await socketService.connect('room-123');
      expect(socketService.isConnected, isTrue);

      final eventFuture = socketService.events.first;

      mockSocket.emit({
        'type': 'chat',
        'message': {
          'message_id': 'm-1',
          'room_id': 'room-123',
          'user_id': 'u-1',
          'user_name': 'Bob',
          'text': 'Hi everyone!',
          'created_at': '2026-03-22T12:00:00Z',
        },
      });

      final event = await eventFuture;
      expect(event, isA<RoomChatEvent>());
      final chatEvent = event as RoomChatEvent;
      expect(chatEvent.message.text, 'Hi everyone!');
      expect(chatEvent.message.userName, 'Bob');
    });

    test('receives RoomReactionEvent and RoomSyncEvent', () async {
      await socketService.connect('room-123');

      final events = <RoomSocketEvent>[];
      final sub = socketService.events.listen(events.add);

      mockSocket.emit({
        'type': 'reaction',
        'user_id': 'u-2',
        'user_name': 'Alice',
        'emoji': '🔥',
      });

      mockSocket.emit({
        'type': 'sync_state',
        'watch_state': {
          'media_url': 'https://example.com/v.mp4',
          'media_title': 'Matrix',
          'state': 'playing',
          'position_seconds': 120.0,
          'playback_rate': 1.0,
          'last_updated_at': '2026-03-22T12:00:00Z',
        },
        'triggered_by': 'Alice',
      });

      await Future<void>.delayed(const Duration(milliseconds: 50));
      await sub.cancel();

      expect(events.length, 2);
      expect(events[0], isA<RoomReactionEvent>());
      expect((events[0] as RoomReactionEvent).emoji, '🔥');

      expect(events[1], isA<RoomSyncEvent>());
      expect((events[1] as RoomSyncEvent).watchState.mediaTitle, 'Matrix');
      expect((events[1] as RoomSyncEvent).triggeredBy, 'Alice');
    });

    test('receives user_joined and user_left events', () async {
      await socketService.connect('room-123');

      final events = <RoomSocketEvent>[];
      final sub = socketService.events.listen(events.add);

      mockSocket.emit({
        'type': 'user_joined',
        'user_id': 'u-new',
        'user_name': 'Charlie',
      });

      mockSocket.emit({
        'type': 'user_left',
        'user_id': 'u-new',
        'user_name': 'Charlie',
      });

      await Future<void>.delayed(const Duration(milliseconds: 50));
      await sub.cancel();

      expect(events.length, 2);
      expect(events[0], isA<RoomUserJoinedEvent>());
      expect((events[0] as RoomUserJoinedEvent).userName, 'Charlie');
      expect(events[1], isA<RoomUserLeftEvent>());
      expect((events[1] as RoomUserLeftEvent).userName, 'Charlie');
    });

    test('sends outgoing chat, reaction, and sync action messages', () async {
      await socketService.connect('room-123');

      socketService.sendChatMessage('Hello room');
      expect(mockSocket.sentMessages.length, 1);
      final chatData = jsonDecode(
        mockSocket.sentMessages.first as String,
      ) as Map<String, dynamic>;
      expect(chatData['type'], 'chat');
      expect(chatData['text'], 'Hello room');

      socketService.sendReaction('🎉');
      expect(mockSocket.sentMessages.length, 2);
      final reactionData = jsonDecode(
        mockSocket.sentMessages[1] as String,
      ) as Map<String, dynamic>;
      expect(reactionData['type'], 'reaction');
      expect(reactionData['emoji'], '🎉');

      socketService.sendSyncAction(action: 'play', positionSeconds: 15.0);
      expect(mockSocket.sentMessages.length, 3);
      final syncData = jsonDecode(
        mockSocket.sentMessages[2] as String,
      ) as Map<String, dynamic>;
      expect(syncData['type'], 'sync_action');
      expect(syncData['action'], 'play');
      expect(syncData['position_seconds'], 15.0);
    });
  });
}
