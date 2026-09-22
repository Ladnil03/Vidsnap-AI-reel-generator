import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/create/data/create_repository.dart';
import 'package:vidsnap_ai/features/create/domain/create_video_model.dart';
import 'package:vidsnap_ai/features/create/presentation/create_screen.dart';
import 'package:vidsnap_ai/features/create/presentation/providers/create_provider.dart';

class _FakeCreateRepository implements CreateRepository {
  final List<CreateVideoDraft> savedDrafts = <CreateVideoDraft>[];
  bool uploadCalled = false;

  @override
  List<CreateVideoDraft> getDrafts() => List<CreateVideoDraft>.from(savedDrafts);

  @override
  Future<void> saveDraft(CreateVideoDraft draft) async {
    savedDrafts.add(draft);
  }

  @override
  Future<void> deleteDraft(String draftId) async {
    savedDrafts.removeWhere((d) => d.draftId == draftId);
  }

  @override
  Future<HashtagSuggestionResponseModel> suggestTags({
    required String title,
    String? transcript,
  }) async {
    return const HashtagSuggestionResponseModel(
      hashtags: <String>['viral', 'ai', 'flutter'],
      suggestedHook: 'Wait till you see this...',
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('CreateScreen Widget Tests', () {
    testWidgets('renders camera & gallery buttons when no video is selected', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeCreateRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            createRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: CreateScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Create Reel'), findsOneWidget);
      expect(find.text('Record or Upload 9:16 Reel'), findsOneWidget);
      expect(find.text('Camera'), findsOneWidget);
      expect(find.text('Gallery'), findsOneWidget);
    });

    testWidgets('renders metadata form and generates AI tags when video is picked', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final fakeRepo = _FakeCreateRepository();

      final container = ProviderContainer(
        overrides: [
          createRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );
      addTearDown(container.dispose);

      // Pre-select a video
      container.read(createProvider.notifier).setVideo('/storage/emulated/0/DCIM/my_reel.mp4', duration: 15.0);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: CreateScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Ready to publish'), findsOneWidget);
      expect(find.text('my_reel.mp4'), findsOneWidget);
      expect(find.text('Headline Title *'), findsOneWidget);
      expect(find.text('AI Assistant'), findsOneWidget);
      expect(find.text('Publish Reel'), findsOneWidget);
      expect(find.text('Save Draft'), findsOneWidget);

      // Enter headline
      final titleField = find.widgetWithText(TextField, 'Catchy headline (min 3 chars)');
      await tester.enterText(titleField, 'My Super AI Video');
      await tester.pumpAndSettle();

      // Tap AI Generate tags button
      await tester.tap(find.text('Generate'));
      await tester.pumpAndSettle();

      // Verify AI suggestions populated
      expect(find.text('#viral'), findsOneWidget);
      expect(find.text('#ai'), findsOneWidget);
      expect(find.text('#flutter'), findsOneWidget);
      expect(find.textContaining('Wait till you see this...'), findsOneWidget);

      // Tap Save Draft
      await tester.tap(find.text('Save Draft'));
      await tester.pumpAndSettle();

      expect(fakeRepo.savedDrafts.length, 1);
      expect(fakeRepo.savedDrafts.first.title, 'My Super AI Video');
    });
  });
}
