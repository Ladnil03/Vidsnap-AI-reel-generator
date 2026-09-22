import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';

void main() {
  group('AppFailure', () {
    test('network failure factory creates retryable failure', () {
      final failure = AppFailure.network();
      expect(failure.type, equals(FailureType.network));
      expect(failure.isRetryable, isTrue);
      expect(failure.message, contains('Network connection error'));
    });

    test('auth failure factory creates non-retryable 401 failure', () {
      final failure = AppFailure.auth();
      expect(failure.type, equals(FailureType.auth));
      expect(failure.statusCode, equals(401));
      expect(failure.isRetryable, isFalse);
    });

    test('validation failure factory attaches details and 422 code', () {
      final failure = AppFailure.validation(
        message: 'Invalid email address',
        details: <String, dynamic>{'field': 'email'},
      );
      expect(failure.type, equals(FailureType.validation));
      expect(failure.statusCode, equals(422));
      expect(failure.details, isNotNull);
      expect(failure.isRetryable, isFalse);
    });

    test('server failure factory sets 500 status and retryable', () {
      final failure = AppFailure.server();
      expect(failure.type, equals(FailureType.server));
      expect(failure.statusCode, equals(500));
      expect(failure.isRetryable, isTrue);
    });

    test('toString formats expected debugging string', () {
      final failure = AppFailure.auth(message: 'Invalid session');
      expect(failure.toString(), contains('AppFailure(type: FailureType.auth'));
      expect(failure.toString(), contains('Invalid session'));
    });
  });
}
