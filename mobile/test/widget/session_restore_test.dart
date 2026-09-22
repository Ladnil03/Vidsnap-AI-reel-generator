import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/core/theme/theme_provider.dart';
import 'package:vidsnap_ai/main.dart';

class FakeSecureStoragePlatform extends FlutterSecureStoragePlatform {
  final Map<String, String> _storage = <String, String>{};

  @override
  Future<bool> containsKey({required String key, required Map<String, String> options}) async =>
      _storage.containsKey(key);

  @override
  Future<void> delete({required String key, required Map<String, String> options}) async =>
      _storage.remove(key);

  @override
  Future<void> deleteAll({required Map<String, String> options}) async => _storage.clear();

  @override
  Future<String?> read({required String key, required Map<String, String> options}) async =>
      _storage[key];

  @override
  Future<Map<String, String>> readAll({required Map<String, String> options}) async =>
      Map<String, String>.from(_storage);

  @override
  Future<void> write({
    required String key,
    required String value,
    required Map<String, String> options,
  }) async {
    _storage[key] = value;
  }
}

class FakeHttpAdapter implements HttpClientAdapter {
  ResponseBody? nextResponse;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return nextResponse ??
        ResponseBody.fromString(
          jsonEncode(<String, dynamic>{
            'user_id': 'u100',
            'name': 'Restored User',
            'email': 'restored@vidsnap.ai',
            'roles': <String>['creator'],
            'tokens_remaining': 15,
            'email_verified': true,
            'timezone': 'UTC',
            'created_at': DateTime.now().toIso8601String(),
          }),
          200,
          headers: <String, List<String>>{
            'content-type': <String>['application/json'],
          },
        );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeSecureStoragePlatform fakeSecureStorage;
  late FakeHttpAdapter fakeHttpAdapter;

  setUp(() {
    fakeSecureStorage = FakeSecureStoragePlatform();
    FlutterSecureStoragePlatform.instance = fakeSecureStorage;
    fakeHttpAdapter = FakeHttpAdapter();
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  group('Session Restore Integration Tests', () {
    testWidgets('unauthenticated user is redirected to LoginScreen', (tester) async {
      final prefs = await SharedPreferences.getInstance();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: const VidSnapApp(),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Welcome Back'), findsOneWidget);
      expect(find.text('Log In'), findsOneWidget);
    });

    testWidgets('session persists across restart: authenticated user redirects to Feed', (tester) async {
      // Simulate stored tokens from previous session
      await fakeSecureStorage.write(
        key: 'vidsnap_access_token',
        value: 'valid_access_jwt',
        options: <String, String>{},
      );
      await fakeSecureStorage.write(
        key: 'vidsnap_refresh_token',
        value: 'valid_refresh_jwt',
        options: <String, String>{},
      );

      final prefs = await SharedPreferences.getInstance();
      final testDio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'))
        ..httpClientAdapter = fakeHttpAdapter;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            dioProvider.overrideWithValue(testDio),
          ],
          child: const VidSnapApp(),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('VidSnap Feed'), findsOneWidget);
      expect(find.textContaining('Welcome, Restored User!'), findsOneWidget);
      expect(find.text('Credits: 15 tokens'), findsOneWidget);
    });
  });
}
