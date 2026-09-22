import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/auth/presentation/verify_email_screen.dart';

class FakeSecureStoragePlatform extends FlutterSecureStoragePlatform {
  final Map<String, String> _storage = <String, String>{};

  @override
  Future<bool> containsKey({
    required String key,
    required Map<String, String> options,
  }) async => _storage.containsKey(key);

  @override
  Future<void> delete({
    required String key,
    required Map<String, String> options,
  }) async => _storage.remove(key);

  @override
  Future<void> deleteAll({required Map<String, String> options}) async =>
      _storage.clear();

  @override
  Future<String?> read({
    required String key,
    required Map<String, String> options,
  }) async => _storage[key];

  @override
  Future<Map<String, String>> readAll({
    required Map<String, String> options,
  }) async => Map<String, String>.from(_storage);

  @override
  Future<void> write({
    required String key,
    required String value,
    required Map<String, String> options,
  }) async {
    _storage[key] = value;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStoragePlatform.instance = FakeSecureStoragePlatform();
  });

  Widget createTestWidget() {
    return const ProviderScope(
      child: MaterialApp(home: VerifyEmailScreen(email: 'creator@vidsnap.ai')),
    );
  }

  group('VerifyEmailScreen Widget Tests', () {
    testWidgets('renders verify email header and target email', (tester) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Verify Your Email'), findsOneWidget);
      expect(find.textContaining('creator@vidsnap.ai'), findsOneWidget);
      expect(find.text('Verification Code'), findsOneWidget);
      expect(find.text('Verify Email'), findsOneWidget);
    });

    testWidgets('validates 6-digit code length on submit', (tester) async {
      await tester.pumpWidget(createTestWidget());

      await tester.enterText(find.byType(TextField), '123');
      await tester.tap(find.text('Verify Email'));
      await tester.pump();

      expect(
        find.text('Please enter the 6-digit verification code.'),
        findsOneWidget,
      );
    });
  });
}
