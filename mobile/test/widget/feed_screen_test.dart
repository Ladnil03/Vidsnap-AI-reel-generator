import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/domain/comment_model.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/feed/presentation/feed_screen.dart';

class _FakeFeedRepository implements FeedRepository {
  List<FeedItemModel> items = <FeedItemModel>[
    FeedItemModel(
      videoId: 'vid-test-1',
      userId: 'creator-1',
      authorName: 'CreativeCoder',
      title: 'Building Flutter in 2026',
      description: 'Flutter 3.47 is smooth and responsive',
      hashtags: const <String>['flutter', 'mobile'],
      videoUrl: 'https://cdn.vidsnap.ai/vid-test-1.mp4',
      duration: 15.0,
      likesCount: 150,
      savesCount: 30,
      commentsCount: 12,
      viewsCount: 3400,
      hasLiked: false,
      hasSaved: false,
      explainabilityTag: 'Popular in Tech',
      attributionText: 'From Community',
      createdAt: DateTime(2026, 3, 15),
    ),
  ];

  @override
  Future<List<FeedItemModel>> getFeed({
    FeedTab tab = FeedTab.trending,
    String? cursor,
    int limit = 10,
  }) async {
    return items;
  }

  @override
  Future<Map<String, dynamic>> toggleLike(
    String videoId, {
    required bool currentlyLiked,
  }) async {
    return <String, dynamic>{
      'liked': !currentlyLiked,
      'likes_count': currentlyLiked ? 149 : 151,
    };
  }

  @override
  Future<Map<String, dynamic>> toggleSave(
    String videoId, {
    required bool currentlySaved,
  }) async {
    return <String, dynamic>{
      'saved': !currentlySaved,
      'saves_count': currentlySaved ? 29 : 31,
    };
  }

  @override
  Future<List<CommentModel>> getComments(
    String videoId, {
    int skip = 0,
    int limit = 50,
  }) async {
    return <CommentModel>[
      CommentModel(
        commentId: 'c-1',
        videoId: videoId,
        userId: 'u-fan',
        userName: 'FanBoy',
        text: 'Awesome Flutter demo!',
        createdAt: DateTime(2026, 3, 15, 10, 0),
      ),
    ];
  }

  @override
  Future<CommentModel> addComment(String videoId, String text) async {
    return CommentModel(
      commentId: 'c-2',
      videoId: videoId,
      userId: 'u-me',
      userName: 'CurrentViewer',
      text: text,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<WatchProgressModel> recordWatchProgress(
    WatchProgressRequestModel request,
  ) async {
    return WatchProgressModel(
      videoId: request.videoId,
      watchedSeconds: request.watchedSeconds,
      totalSeconds: request.totalSeconds,
      percentage: (request.watchedSeconds / request.totalSeconds) * 100,
      completed: request.completed,
      updatedAt: DateTime.now(),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('FeedScreen Widget Tests', () {
    testWidgets('renders top tabs, creator info, and engagement buttons', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeFeedRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [feedRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: FeedScreen()),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Top Tabs
      expect(find.text('Trending'), findsOneWidget);
      expect(find.text('Following'), findsOneWidget);
      expect(find.text('Saved'), findsOneWidget);
      expect(find.text('For You'), findsOneWidget);

      // Creator & Video Info
      expect(find.text('@CreativeCoder'), findsOneWidget);
      expect(find.text('Building Flutter in 2026'), findsOneWidget);
      expect(find.text('#flutter'), findsOneWidget);
      expect(find.text('Popular in Tech'), findsOneWidget);
      expect(find.text('From Community'), findsOneWidget);

      // Counters
      expect(find.text('150'), findsOneWidget); // Likes
      expect(find.text('12'), findsOneWidget); // Comments
      expect(find.text('30'), findsOneWidget); // Saves
      expect(find.text('Share'), findsOneWidget);
    });

    testWidgets('tapping like button optimistically updates count', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeFeedRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [feedRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: FeedScreen()),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('150'), findsOneWidget);

      // Tap like button
      await tester.tap(find.byIcon(Icons.favorite_border_rounded));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Count should increment to 151
      expect(find.text('151'), findsOneWidget);
      expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
    });

    testWidgets('tapping comment button opens CommentsSheet modal', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeFeedRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [feedRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: FeedScreen()),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Tap comment button
      await tester.tap(find.byIcon(Icons.chat_bubble_outline_rounded));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Comments sheet should appear
      expect(find.textContaining('Comments'), findsOneWidget);
      expect(find.text('Awesome Flutter demo!'), findsOneWidget);
      expect(find.text('FanBoy'), findsOneWidget);
    });
  });
}
