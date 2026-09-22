import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/discovery/data/discovery_repository.dart';
import 'package:vidsnap_ai/features/discovery/domain/discovery_item_model.dart';
import 'package:vidsnap_ai/features/discovery/presentation/explore_screen.dart';

class _FakeDiscoveryRepository implements DiscoveryRepository {
  String? lastSearchQuery;
  String? lastSource;

  @override
  Future<DiscoverySearchResponseModel> search({
    String? query,
    String? source,
    String? tag,
    int page = 1,
    int limit = 20,
  }) async {
    lastSearchQuery = query;
    lastSource = source;

    return DiscoverySearchResponseModel(
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
      items: <DiscoveryItemModel>[
        DiscoveryItemModel(
          itemId: 'disc-mock-1',
          source: 'community',
          externalId: 'ext-1',
          title: 'Cinematic Mountain Drone',
          description: 'Shot in 4k HDR',
          authorName: 'DronePilot',
          sourceUrl: 'https://vidsnap.ai/reel/1',
          embedUrl: 'https://cdn.vidsnap.ai/drone.mp4',
          viewsCount: 23400,
          likesCount: 1540,
          createdAt: DateTime(2026, 3, 10),
        ),
      ],
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('ExploreScreen Widget Tests', () {
    testWidgets('renders search field, filter chips, and video grid items', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeDiscoveryRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [discoveryRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: ExploreScreen()),
        ),
      );

      await tester.pumpAndSettle();

      // Search bar
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Search reels, creators, hashtags...'), findsOneWidget);

      // Source Filter Chips
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Community'), findsOneWidget);
      expect(find.text('YouTube Shorts'), findsOneWidget);
      expect(find.text('Pexels'), findsOneWidget);

      // Trending Tag Chips
      expect(find.text('#ai'), findsOneWidget);
      expect(find.text('#nature'), findsOneWidget);

      // Video Grid Card
      expect(find.text('Cinematic Mountain Drone'), findsOneWidget);
      expect(find.text('@DronePilot'), findsOneWidget);
      expect(find.text('23.4K'), findsOneWidget);
    });

    testWidgets('submitting search updates query and fetches results', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeDiscoveryRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [discoveryRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: ExploreScreen()),
        ),
      );

      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Drone 4K');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      expect(fakeRepo.lastSearchQuery, 'Drone 4K');
    });
  });
}
