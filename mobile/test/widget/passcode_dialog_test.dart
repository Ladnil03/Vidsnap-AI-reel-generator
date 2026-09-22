import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/rooms/presentation/widgets/passcode_dialog.dart';

void main() {
  group('PasscodeDialog Widget Tests', () {
    testWidgets('renders dialog and validates passcode length', (tester) async {
      String? enteredCode;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  enteredCode = await showDialog<String>(
                    context: context,
                    builder: (_) =>
                        const PasscodeDialog(roomTitle: 'Secret Watch Party'),
                  );
                },
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      );

      // Open dialog
      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      // Verify dialog elements
      expect(find.text('Private Room'), findsOneWidget);
      expect(find.text('Secret Watch Party'), findsOneWidget);
      expect(find.text('Join Party'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);

      // Submit empty passcode -> validation error
      await tester.tap(find.text('Join Party'));
      await tester.pumpAndSettle();
      expect(find.text('Passcode is required'), findsOneWidget);

      // Enter short passcode (< 8 chars)
      await tester.enterText(find.byType(TextField), '1234');
      await tester.tap(find.text('Join Party'));
      await tester.pumpAndSettle();
      expect(
        find.text('Passcode must be at least 8 characters'),
        findsOneWidget,
      );

      // Enter valid passcode (>= 8 chars)
      await tester.enterText(find.byType(TextField), 'passcode123');
      await tester.tap(find.text('Join Party'));
      await tester.pumpAndSettle();

      expect(find.byType(PasscodeDialog), findsNothing);
      expect(enteredCode, 'passcode123');
    });

    testWidgets('cancelling dialog returns null', (tester) async {
      String? enteredCode = 'initial';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  enteredCode = await showDialog<String>(
                    context: context,
                    builder: (_) =>
                        const PasscodeDialog(roomTitle: 'VIP Lounge'),
                  );
                },
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(enteredCode, isNull);
    });
  });
}
