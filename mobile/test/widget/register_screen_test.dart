import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/auth/presentation/register_screen.dart';

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
    return const ProviderScope(child: MaterialApp(home: RegisterScreen()));
  }

  void configureViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  group('RegisterScreen Widget Tests', () {
    testWidgets('renders register screen fields and bonus credits banner', (
      tester,
    ) async {
      configureViewport(tester);
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Create Your Account'), findsOneWidget);
      expect(
        find.text('Special Welcome: 5 Free AI Video Credits'),
        findsOneWidget,
      );
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);
      expect(find.text('Create Account'), findsOneWidget);
    });

    testWidgets('validates empty name input on submit', (tester) async {
      configureViewport(tester);
      await tester.pumpWidget(createTestWidget());

      await tester.tap(find.text('Create Account'));
      await tester.pump();

      expect(find.text('Please enter your name.'), findsOneWidget);
    });

    testWidgets('validates password mismatch on submit', (tester) async {
      configureViewport(tester);
      await tester.pumpWidget(createTestWidget());

      final textFields = find.byType(TextField);
      await tester.enterText(textFields.at(0), 'Alice');
      await tester.enterText(textFields.at(1), 'alice@vidsnap.ai');
      await tester.enterText(textFields.at(2), 'Password123');
      await tester.enterText(textFields.at(3), 'DifferentPassword');

      await tester.tap(find.text('Create Account'));
      await tester.pump();

      expect(find.text('Passwords do not match.'), findsOneWidget);
    });
  });
}
