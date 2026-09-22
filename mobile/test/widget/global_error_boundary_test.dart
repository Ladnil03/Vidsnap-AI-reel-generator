import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';
import 'package:vidsnap_ai/core/widgets/global_error_boundary.dart';

void main() {
  group('GlobalErrorBoundary Widget Tests', () {
    setUp(() {
      TelemetryService.instance.clear();
    });

    testWidgets('renders child normally when no error is present', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: GlobalErrorBoundary(child: Text('Normal Application Content')),
        ),
      );

      expect(find.text('Normal Application Content'), findsOneWidget);
      expect(find.text('Something went wrong'), findsNothing);
    });

    testWidgets(
      'displays graceful fallback when error is reported via context and allows retry',
      (tester) async {
        bool resetTriggered = false;

        await tester.pumpWidget(
          MaterialApp(
            home: GlobalErrorBoundary(
              onReset: () {
                resetTriggered = true;
              },
              child: Builder(
                builder: (context) => ElevatedButton(
                  onPressed: () {
                    context.reportWidgetError(
                      Exception('Simulated crash in video decoder'),
                    );
                  },
                  child: const Text('Simulate Crash'),
                ),
              ),
            ),
          ),
        );

        expect(find.text('Simulate Crash'), findsOneWidget);

        // Trigger error
        await tester.tap(find.text('Simulate Crash'));
        await tester.pumpAndSettle();

        // Graceful fallback is shown
        expect(find.text('Something went wrong'), findsOneWidget);
        expect(
          find.textContaining('An unexpected issue occurred'),
          findsOneWidget,
        );
        expect(find.text('Try Again'), findsOneWidget);

        // Verify telemetry recorded the error event
        expect(TelemetryService.instance.recordedErrors.length, 1);
        expect(
          TelemetryService.instance.recordedErrors.first.error,
          contains('Simulated crash in video decoder'),
        );

        // Tap 'Try Again'
        await tester.tap(find.text('Try Again'));
        await tester.pumpAndSettle();

        expect(resetTriggered, isTrue);
        expect(find.text('Simulate Crash'), findsOneWidget);
        expect(find.text('Something went wrong'), findsNothing);
      },
    );
  });
}
