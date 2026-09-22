import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/domain/comment_model.dart';
import 'package:vidsnap_ai/features/feed/presentation/widgets/comments_sheet.dart';

class _FakeFeedRepository implements FeedRepository {
  final List<CommentModel> comments = <CommentModel>[
    CommentModel(
      commentId: 'c-1',
      videoId: 'v-test',
      userId: 'u-1',
      userName: 'Alice',
      text: 'First comment on VidSnap!',
      createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
    ),
  ];

  @override
  Future<List<CommentModel>> getComments(String videoId, {int skip = 0, int limit = 50}) async {
    return List<CommentModel>.from(comments);
  }

  @override
  Future<CommentModel> addComment(String videoId, String text) async {
    final newC = CommentModel(
      commentId: 'c-${comments.length + 1}',
      videoId: videoId,
      userId: 'u-me',
      userName: 'CurrentViewer',
      text: text,
      createdAt: DateTime.now(),
    );
    comments.insert(0, newC);
    return newC;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('CommentsSheet Widget Tests', () {
    testWidgets('renders comments list and adds a new comment', (tester) async {
      final fakeRepo = _FakeFeedRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            feedRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: CommentsSheet(videoId: 'v-test', initialCount: 1),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Comments (1)'), findsOneWidget);
      expect(find.text('Alice'), findsOneWidget);
      expect(find.text('First comment on VidSnap!'), findsOneWidget);

      // Enter new comment
      await tester.enterText(find.byType(TextField), 'This is pure fire!');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      expect(find.text('This is pure fire!'), findsOneWidget);
      expect(find.text('CurrentViewer'), findsOneWidget);
      expect(find.text('Comments (2)'), findsOneWidget);
    });
  });
}
