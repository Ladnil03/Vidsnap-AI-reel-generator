import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/auth/presentation/login_screen.dart';

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
    return const ProviderScope(child: MaterialApp(home: LoginScreen()));
  }

  void configureViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  group('LoginScreen Widget Tests', () {
    testWidgets('renders login screen fields and buttons', (tester) async {
      configureViewport(tester);
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Welcome Back'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Forgot password?'), findsOneWidget);
      expect(find.text('Log In'), findsOneWidget);
      expect(find.text('Create one'), findsOneWidget);
    });

    testWidgets('displays validation error when submitting with empty email', (
      tester,
    ) async {
      configureViewport(tester);
      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Log In'));
      await tester.pump();

      expect(find.text('Please enter a valid email address.'), findsOneWidget);
    });

    testWidgets(
      'displays validation error when submitting with empty password',
      (tester) async {
        configureViewport(tester);
        await tester.pumpWidget(createTestWidget());

        await tester.enterText(find.byType(TextField).first, 'test@vidsnap.ai');
        await tester.tap(find.text('Log In'));
        await tester.pump();

        expect(find.text('Please enter your password.'), findsOneWidget);
      },
    );
  });
}
