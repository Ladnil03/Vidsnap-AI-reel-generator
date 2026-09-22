import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/rooms/data/room_socket_service.dart';
import 'package:vidsnap_ai/features/rooms/data/rooms_repository.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';
import 'package:vidsnap_ai/features/rooms/presentation/active_room_screen.dart';

class _FakeActiveRoomRepository implements RoomsRepository {
  final List<RoomChatMessageModel> mockMessages = [
    RoomChatMessageModel(
      messageId: 'm-1',
      roomId: 'room-1',
      userId: 'u-1',
      userName: 'Alice',
      text: 'Movie time!',
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<RoomModel> joinRoom(String roomId, {String? passcode}) async {
    return RoomModel(
      roomId: roomId,
      name: 'Avengers Premiere',
      description: 'Synchronized screening',
      roomType: 'public',
      controlMode: 'host_only',
      hostId: 'host-1',
      hostName: 'Stark',
      watchState: WatchStateModel(
        mediaUrl: 'https://example.com/stream.mp4',
        mediaTitle: 'Avengers Trailer',
        mediaType: 'native',
        state: 'playing',
        positionSeconds: 42.0,
        playbackRate: 1.0,
        lastUpdatedAt: DateTime.now(),
      ),
      participantCount: 2,
      participants: [
        RoomParticipantModel(
          userId: 'host-1',
          name: 'Stark',
          isHost: true,
          joinedAt: DateTime.now(),
          lastSeenAt: DateTime.now(),
        ),
        RoomParticipantModel(
          userId: 'u-1',
          name: 'Alice',
          isHost: false,
          joinedAt: DateTime.now(),
          lastSeenAt: DateTime.now(),
        ),
      ],
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<List<RoomChatMessageModel>> getChatHistory(
    String roomId, {
    int limit = 50,
  }) async {
    return mockMessages;
  }

  @override
  Future<WatchStateModel> syncPlayback(
    String roomId, {
    required String action,
    double? positionSeconds,
    double? playbackRate,
    String? mediaUrl,
    String? mediaTitle,
  }) async {
    return WatchStateModel(
      mediaUrl: 'https://example.com/stream.mp4',
      mediaTitle: 'Avengers Trailer',
      mediaType: 'native',
      state: action == 'play' ? 'playing' : 'paused',
      positionSeconds: positionSeconds ?? 42.0,
      playbackRate: 1.0,
      lastUpdatedAt: DateTime.now(),
    );
  }

  @override
  Future<LiveKitCredentialsModel> getRtcToken(String roomId) async {
    return const LiveKitCredentialsModel(
      token: 'test-token',
      serverUrl: 'wss://livekit.test',
      roomName: 'room-1',
    );
  }

  @override
  Future<RoomSummaryModel> getRoomRecap(String roomId) async {
    return RoomSummaryModel(
      roomId: roomId,
      summary: 'Exciting trailer playback with synchronized discussion.',
      highlights: const ['Intro sequence at 00:15', 'Climax action at 00:40'],
      generatedAt: DateTime.now(),
    );
  }

  @override
  Future<bool> leaveRoom(String roomId) async => true;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _DummySocket implements IRoomSocket {
  final _ctrl = StreamController<dynamic>.broadcast();

  @override
  Stream<dynamic> get stream => _ctrl.stream;
  @override
  void add(dynamic data) {}
  @override
  Future<void> close([int? code, String? reason]) async => _ctrl.close();
}

void main() {
  group('ActiveRoomScreen Widget Tests', () {
    testWidgets('renders video player, participants, and sends chat message', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeActiveRoomRepository();
      final dummySocket = _DummySocket();
      final socketService = RoomSocketService(
        tokenStorage: TokenStorage(),
        socketFactory: (_) async => dummySocket,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            roomsRepositoryProvider.overrideWithValue(fakeRepo),
            roomSocketServiceProvider.overrideWithValue(socketService),
          ],
          child: const MaterialApp(home: ActiveRoomScreen(roomId: 'room-1')),
        ),
      );

      // Settle initial load and post frame callback
      await tester.pumpAndSettle();

      // Top title and info
      expect(find.text('Avengers Premiere'), findsOneWidget);
      expect(find.text('2 watching • Host: Stark'), findsOneWidget);

      // Video banner
      expect(find.text('HOST SYNCED'), findsOneWidget);
      expect(find.text('Avengers Trailer'), findsOneWidget);
      expect(find.text('Streaming Synchronously'), findsOneWidget);

      // Participants rail
      expect(find.text('S'), findsOneWidget); // Stark avatar
      expect(find.text('A'), findsOneWidget); // Alice avatar

      // Chat stream
      expect(find.text('Movie time!'), findsOneWidget);

      // Quick reactions
      expect(find.text('🔥'), findsOneWidget);
      expect(find.text('🎉'), findsOneWidget);

      // Send a chat message
      await tester.enterText(
        find.byType(TextField),
        'Cant wait for the movie!',
      );
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();

      expect(find.text('Cant wait for the movie!'), findsOneWidget);
    });

    testWidgets('tapping AI Room Recap opens catch-up summary sheet', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeActiveRoomRepository();
      final dummySocket = _DummySocket();
      final socketService = RoomSocketService(
        tokenStorage: TokenStorage(),
        socketFactory: (_) async => dummySocket,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            roomsRepositoryProvider.overrideWithValue(fakeRepo),
            roomSocketServiceProvider.overrideWithValue(socketService),
          ],
          child: const MaterialApp(home: ActiveRoomScreen(roomId: 'room-1')),
        ),
      );

      await tester.pumpAndSettle();

      // Tap AI recap button in AppBar
      await tester.tap(find.byIcon(Icons.auto_awesome));
      await tester.pumpAndSettle();

      expect(find.text('AI Room Catch-up Recap'), findsOneWidget);
      expect(
        find.text('Exciting trailer playback with synchronized discussion.'),
        findsOneWidget,
      );
      expect(find.text('Intro sequence at 00:15'), findsOneWidget);

      // Close recap
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      expect(find.text('AI Room Catch-up Recap'), findsNothing);
    });

    testWidgets('tapping Audio Lounge action opens LiveKit credentials modal', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeActiveRoomRepository();
      final dummySocket = _DummySocket();
      final socketService = RoomSocketService(
        tokenStorage: TokenStorage(),
        socketFactory: (_) async => dummySocket,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            roomsRepositoryProvider.overrideWithValue(fakeRepo),
            roomSocketServiceProvider.overrideWithValue(socketService),
          ],
          child: const MaterialApp(home: ActiveRoomScreen(roomId: 'room-1')),
        ),
      );

      await tester.pumpAndSettle();

      // Tap headset audio lounge button
      await tester.tap(find.byIcon(Icons.headset_mic_outlined));
      await tester.pumpAndSettle();

      expect(find.text('Audio Lounge'), findsOneWidget);
      expect(find.text('Server: wss://livekit.test'), findsOneWidget);
      expect(find.text('Room: room-1'), findsOneWidget);

      // Close dialog
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();

      expect(find.text('Audio Lounge'), findsNothing);
    });
  });
}
