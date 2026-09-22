import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';

void main() {
  group('TelemetryService Unit Tests', () {
    final telemetry = TelemetryService.instance;

    setUp(() {
      telemetry.clear();
    });

    test('adds breadcrumb and logs category and timestamp', () {
      telemetry.addBreadcrumb(
        'Tapped play button',
        category: 'ui',
        data: {'reel_id': 'r-1'},
      );

      expect(telemetry.breadcrumbs.length, 1);
      final bc = telemetry.breadcrumbs.first;
      expect(bc.message, 'Tapped play button');
      expect(bc.category, 'ui');
      expect(bc.data?['reel_id'], 'r-1');
    });

    test('caps breadcrumb ring buffer at 50 items', () {
      for (int i = 0; i < 60; i++) {
        telemetry.addBreadcrumb('Event $i');
      }

      expect(telemetry.breadcrumbs.length, 50);
      expect(telemetry.breadcrumbs.first.message, 'Event 10');
      expect(telemetry.breadcrumbs.last.message, 'Event 59');
    });

    test('sets and tracks current user id in breadcrumbs', () {
      telemetry.setUserId('user_test_99');

      expect(telemetry.currentUserId, 'user_test_99');
      expect(
        telemetry.breadcrumbs.any((b) => b.message.contains('user_test_99')),
        isTrue,
      );
    });

    test(
      'records exception with stack trace and snapshot of active breadcrumbs',
      () {
        telemetry.addBreadcrumb('Prior step 1');
        telemetry.addBreadcrumb('Prior step 2');

        try {
          throw const FormatException('Invalid JSON payload');
        } catch (e, stack) {
          telemetry.recordError(
            e,
            stack,
            reason: 'Failed parsing response',
            isFatal: true,
          );
        }

        expect(telemetry.recordedErrors.length, 1);
        final errorEvent = telemetry.recordedErrors.first;
        expect(
          errorEvent.error,
          contains('FormatException: Invalid JSON payload'),
        );
        expect(errorEvent.reason, 'Failed parsing response');
        expect(errorEvent.isFatal, isTrue);
        expect(errorEvent.breadcrumbs.length, 2);
      },
    );
  });
}
