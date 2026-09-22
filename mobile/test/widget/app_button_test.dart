import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/theme/app_theme.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';

void main() {
  Widget createTestWidget(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: Center(child: child)),
    );
  }

  group('AppButton Widget Tests', () {
    testWidgets('renders button label and fires onPressed on tap', (
      tester,
    ) async {
      var tapped = false;

      await tester.pumpWidget(
        createTestWidget(
          AppButton(label: 'Submit', onPressed: () => tapped = true),
        ),
      );

      expect(find.text('Submit'), findsOneWidget);
      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('disabled button does not invoke onPressed', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        createTestWidget(
          AppButton(
            label: 'Disabled Button',
            isDisabled: true,
            onPressed: () => tapped = true,
          ),
        ),
      );

      await tester.tap(find.text('Disabled Button'));
      await tester.pump();

      expect(tapped, isFalse);
    });

    testWidgets(
      'loading state shows CircularProgressIndicator and disables tap',
      (tester) async {
        var tapped = false;

        await tester.pumpWidget(
          createTestWidget(
            AppButton(
              label: 'Saving',
              isLoading: true,
              onPressed: () => tapped = true,
            ),
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        await tester.tap(find.text('Saving'));
        await tester.pump();

        expect(tapped, isFalse);
      },
    );
  });
}
