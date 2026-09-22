import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/theme/app_theme.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';

void main() {
  Widget createTestWidget(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: child),
    );
  }

  group('AppCard Widget Tests', () {
    testWidgets('renders child widget inside card', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const AppCard(
            child: Text('Card Content'),
          ),
        ),
      );

      expect(find.text('Card Content'), findsOneWidget);
    });

    testWidgets('fires onTap callback when tapped', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        createTestWidget(
          AppCard(
            onTap: () => tapped = true,
            child: const Text('Interactive Card'),
          ),
        ),
      );

      await tester.tap(find.text('Interactive Card'));
      await tester.pump();

      expect(tapped, isTrue);
    });
  });
}
