import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/rooms/data/rooms_repository.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';
import 'package:vidsnap_ai/features/rooms/presentation/rooms_lobby_screen.dart';
import 'package:vidsnap_ai/features/rooms/presentation/widgets/create_room_sheet.dart';
import 'package:vidsnap_ai/features/social/data/social_repository.dart';

class _FakeRoomsRepository implements RoomsRepository {
  final List<RoomModel> mockRooms = [
    RoomModel(
      roomId: 'room-1',
      name: 'Cyberpunk Premiere',
      description: 'Official launch screening',
      roomType: 'public',
      controlMode: 'host_only',
      hostId: 'host-1',
      hostName: 'NeonDirector',
      watchState: WatchStateModel(
        mediaUrl: 'https://cdn.example.com/video1.mp4',
        mediaTitle: 'Trailer #1',
        mediaType: 'native',
        state: 'playing',
        positionSeconds: 15.0,
        playbackRate: 1.0,
        lastUpdatedAt: DateTime.now(),
      ),
      participantCount: 8,
      createdAt: DateTime.now(),
    ),
    RoomModel(
      roomId: 'room-2',
      name: 'Private Club',
      description: 'Friends only watch party',
      roomType: 'private',
      controlMode: 'host_only',
      hostId: 'host-2',
      hostName: 'VIPHost',
      watchState: WatchStateModel(
        mediaUrl: '',
        mediaTitle: 'Secret Footage',
        mediaType: 'native',
        state: 'paused',
        positionSeconds: 0.0,
        playbackRate: 1.0,
        lastUpdatedAt: DateTime.now(),
      ),
      participantCount: 2,
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<List<RoomModel>> listRooms({
    int skip = 0,
    int limit = 30,
    String? search,
    String? roomType,
  }) async {
    return mockRooms;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeSocialRepository implements SocialRepository {
  final List<CommunityModel> mockCommunities = [
    CommunityModel(
      communityId: 'comm-1',
      name: 'AI Filmmakers Guild',
      slug: 'ai-filmmakers',
      description: 'Generative cinema creators & storytellers',
      category: 'tech',
      creatorId: 'user-1',
      membersCount: 1420,
      isMember: false,
      createdAt: DateTime.now(),
    ),
    CommunityModel(
      communityId: 'comm-2',
      name: 'Indie Comedy Club',
      slug: 'indie-comedy',
      description: 'Daily skits and standup bits',
      category: 'comedy',
      creatorId: 'user-2',
      membersCount: 890,
      isMember: true,
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<List<CommunityModel>> listCommunities({
    String? category,
    String? query,
    int limit = 30,
  }) async {
    return mockCommunities;
  }

  @override
  Future<CommunityModel> joinCommunity(String communityId) async {
    final comm = mockCommunities.firstWhere(
      (c) => c.communityId == communityId,
    );
    return comm.copyWith(isMember: true, membersCount: comm.membersCount + 1);
  }

  @override
  Future<CommunityModel> leaveCommunity(String communityId) async {
    final comm = mockCommunities.firstWhere(
      (c) => c.communityId == communityId,
    );
    return comm.copyWith(isMember: false, membersCount: comm.membersCount - 1);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('RoomsLobbyScreen Widget Tests', () {
    testWidgets('renders Watch Together tab with room cards and filters', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRoomsRepo = _FakeRoomsRepository();
      final fakeSocialRepo = _FakeSocialRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            roomsRepositoryProvider.overrideWithValue(fakeRoomsRepo),
            socialRepositoryProvider.overrideWithValue(fakeSocialRepo),
          ],
          child: const MaterialApp(home: RoomsLobbyScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Top Tab bar
      expect(find.text('Rooms & Social'), findsOneWidget);
      expect(find.text('Watch Together'), findsOneWidget);
      expect(find.text('Communities'), findsOneWidget);

      // Filter chips
      expect(find.text('All Rooms'), findsOneWidget);
      expect(find.text('Public Only'), findsOneWidget);
      expect(find.text('Passcode Protected'), findsOneWidget);

      // Room cards
      expect(find.text('Cyberpunk Premiere'), findsOneWidget);
      expect(find.text('Private Club'), findsOneWidget);
      expect(find.text('Host: NeonDirector'), findsOneWidget);
      expect(find.text('PASSCODE'), findsOneWidget);
      expect(find.text('Join Party'), findsNWidgets(2));

      // FAB
      expect(find.text('Host Room'), findsOneWidget);
    });

    testWidgets('switches to Communities tab and renders community cards', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRoomsRepo = _FakeRoomsRepository();
      final fakeSocialRepo = _FakeSocialRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            roomsRepositoryProvider.overrideWithValue(fakeRoomsRepo),
            socialRepositoryProvider.overrideWithValue(fakeSocialRepo),
          ],
          child: const MaterialApp(home: RoomsLobbyScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Tap Communities tab
      await tester.tap(find.text('Communities'));
      await tester.pumpAndSettle();

      // Community cards rendered
      expect(find.text('AI Filmmakers Guild'), findsOneWidget);
      expect(find.text('Indie Comedy Club'), findsOneWidget);
      expect(find.text('1420 members'), findsOneWidget);

      // Join / Joined action buttons
      expect(find.text('Join'), findsOneWidget);
      expect(find.text('Joined'), findsOneWidget);

      // Tap Join on the first community -> optimistic update to Joined
      await tester.tap(find.text('Join'));
      await tester.pumpAndSettle();

      expect(find.text('Joined'), findsNWidgets(2));
    });

    testWidgets('tapping Host Room opens CreateRoomSheet', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRoomsRepo = _FakeRoomsRepository();
      final fakeSocialRepo = _FakeSocialRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            roomsRepositoryProvider.overrideWithValue(fakeRoomsRepo),
            socialRepositoryProvider.overrideWithValue(fakeSocialRepo),
          ],
          child: const MaterialApp(home: RoomsLobbyScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Tap FAB
      await tester.tap(find.text('Host Room'));
      await tester.pumpAndSettle();

      expect(find.byType(CreateRoomSheet), findsOneWidget);
      expect(find.text('Host Watch Party'), findsOneWidget);
      expect(find.text('Host Party Room'), findsOneWidget);
    });
  });
}
