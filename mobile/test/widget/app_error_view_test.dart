import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/theme/app_theme.dart';
import 'package:vidsnap_ai/core/widgets/app_error_view.dart';

void main() {
  Widget createTestWidget(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: child),
    );
  }

  group('AppErrorView Widget Tests', () {
    testWidgets('renders failure message and title', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          AppErrorView(
            failure: AppFailure.network(message: 'Cannot reach server'),
          ),
        ),
      );

      expect(find.text('Connection Problem'), findsOneWidget);
      expect(find.text('Cannot reach server'), findsOneWidget);
    });

    testWidgets('invokes onRetry when Retry button is tapped', (tester) async {
      var retried = false;

      await tester.pumpWidget(
        createTestWidget(
          AppErrorView(
            failure: AppFailure.network(message: 'Timeout occurred'),
            onRetry: () => retried = true,
          ),
        ),
      );

      expect(find.text('Retry'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      await tester.pump();

      expect(retried, isTrue);
    });
  });
}
