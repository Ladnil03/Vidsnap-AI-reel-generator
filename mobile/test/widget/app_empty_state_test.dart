import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/theme/app_theme.dart';
import 'package:vidsnap_ai/core/widgets/app_empty_state.dart';

void main() {
  Widget createTestWidget(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: child),
    );
  }

  group('AppEmptyState Widget Tests', () {
    testWidgets('renders title and description', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const AppEmptyState(
            title: 'No Reels Yet',
            description:
                'Start creating or following creators to see content here.',
          ),
        ),
      );

      expect(find.text('No Reels Yet'), findsOneWidget);
      expect(
        find.text('Start creating or following creators to see content here.'),
        findsOneWidget,
      );
    });

    testWidgets('invokes onAction callback when action button is tapped', (
      tester,
    ) async {
      var actionFired = false;

      await tester.pumpWidget(
        createTestWidget(
          AppEmptyState(
            title: 'No Saved Reels',
            actionLabel: 'Explore Feed',
            onAction: () => actionFired = true,
          ),
        ),
      );

      expect(find.text('Explore Feed'), findsOneWidget);
      await tester.tap(find.text('Explore Feed'));
      await tester.pump();

      expect(actionFired, isTrue);
    });
  });
}
