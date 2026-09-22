import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/companion/data/companion_repository.dart';
import 'package:vidsnap_ai/features/companion/domain/companion_models.dart';
import 'package:vidsnap_ai/features/companion/presentation/companion_chat_screen.dart';

class _FakeCompanionRepository implements CompanionRepository {
  MoodStateModel? currentMood = const MoodStateModel(
    userId: 'user-test',
    mood: MoodType.chill,
    intensity: 1.0,
    consentGiven: true,
  );

  final List<CompanionMessageModel> messages = [
    CompanionMessageModel(
      messageId: 'msg-0',
      role: 'assistant',
      content: 'Welcome! How are you feeling today?',
      timestamp: DateTime.now(),
    ),
  ];

  @override
  Future<MoodStateModel?> getActiveMood() async {
    return currentMood;
  }

  @override
  Future<List<CompanionMessageModel>> getHistory({int limit = 30}) async {
    return List<CompanionMessageModel>.from(messages);
  }

  @override
  Future<MoodStateModel> setMood({
    required MoodType mood,
    bool consentGiven = true,
    String? note,
  }) async {
    currentMood = MoodStateModel(
      userId: 'user-test',
      mood: mood,
      intensity: 1.0,
      consentGiven: consentGiven,
      note: note,
    );
    return currentMood!;
  }

  @override
  Future<CompanionChatResponseModel> chat({
    required String message,
    MoodType? mood,
  }) async {
    final reply = CompanionMessageModel(
      messageId: 'reply-${DateTime.now().millisecondsSinceEpoch}',
      role: 'assistant',
      content: 'I found great recommendations for "$message"!',
      reels: const [
        {'reel_id': 'reel-404', 'title': 'AI Filmmaking 101'},
      ],
      timestamp: DateTime.now(),
    );
    messages.add(reply);

    return CompanionChatResponseModel(
      message: reply,
      suggestedActions: const ['Find similar reels', 'Save to playlist'],
      activeMood: mood ?? currentMood?.mood,
    );
  }

  @override
  Future<bool> clearHistory() async {
    messages.clear();
    return true;
  }
}

void main() {
  group('CompanionChatScreen Widget Tests', () {
    late _FakeCompanionRepository fakeRepo;

    setUp(() {
      fakeRepo = _FakeCompanionRepository();
    });

    Widget createWidget() {
      return ProviderScope(
        overrides: [companionRepositoryProvider.overrideWithValue(fakeRepo)],
        child: const MaterialApp(home: CompanionChatScreen()),
      );
    }

    testWidgets(
      'renders companion screen, mood chips, initial message and input bar',
      (tester) async {
        await tester.pumpWidget(createWidget());
        await tester.pumpAndSettle();

        expect(find.widgetWithText(AppBar, 'AI Companion'), findsOneWidget);
        expect(find.text('🌿 Chill'), findsOneWidget);
        expect(find.text('⚡ Energized'), findsOneWidget);
        expect(
          find.text('Welcome! How are you feeling today?'),
          findsOneWidget,
        );
        expect(find.byType(TextField), findsOneWidget);
        expect(find.byIcon(Icons.send), findsOneWidget);
      },
    );

    testWidgets('selecting mood chip updates active mood', (tester) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final energizedChip = find.text('⚡ Energized');
      expect(energizedChip, findsOneWidget);

      await tester.tap(energizedChip);
      await tester.pumpAndSettle();

      expect(fakeRepo.currentMood?.mood, MoodType.energized);
    });

    testWidgets(
      'typing message and tapping send button sends message and displays reply',
      (tester) async {
        await tester.pumpWidget(createWidget());
        await tester.pumpAndSettle();

        final textField = find.byType(TextField);
        await tester.enterText(textField, 'Tell me something cool');
        await tester.tap(find.byIcon(Icons.send));
        await tester.pumpAndSettle();

        expect(find.text('Tell me something cool'), findsOneWidget);
        expect(
          find.text(
            'I found great recommendations for "Tell me something cool"!',
          ),
          findsOneWidget,
        );
        expect(find.text('AI Filmmaking 101'), findsOneWidget);
      },
    );

    testWidgets('tapping suggested action chip sends query directly', (
      tester,
    ) async {
      await tester.pumpWidget(createWidget());
      await tester.pumpAndSettle();

      final actionChip = find.text('Show trending reels');
      expect(actionChip, findsOneWidget);

      await tester.tap(actionChip);
      await tester.pumpAndSettle();

      expect(find.text('Show trending reels'), findsOneWidget);
      expect(
        find.text('I found great recommendations for "Show trending reels"!'),
        findsOneWidget,
      );
    });
  });
}
