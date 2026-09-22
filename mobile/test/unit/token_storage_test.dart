import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';

class FakeSecureStoragePlatform extends FlutterSecureStoragePlatform {
  final Map<String, String> _storage = <String, String>{};

  @override
  Future<bool> containsKey({
    required String key,
    required Map<String, String> options,
  }) async {
    return _storage.containsKey(key);
  }

  @override
  Future<void> delete({
    required String key,
    required Map<String, String> options,
  }) async {
    _storage.remove(key);
  }

  @override
  Future<void> deleteAll({required Map<String, String> options}) async {
    _storage.clear();
  }

  @override
  Future<String?> read({
    required String key,
    required Map<String, String> options,
  }) async {
    return _storage[key];
  }

  @override
  Future<Map<String, String>> readAll({
    required Map<String, String> options,
  }) async {
    return Map<String, String>.from(_storage);
  }

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

  late FakeSecureStoragePlatform fakePlatform;
  late TokenStorage tokenStorage;

  setUp(() {
    fakePlatform = FakeSecureStoragePlatform();
    FlutterSecureStoragePlatform.instance = fakePlatform;
    tokenStorage = TokenStorage();
  });

  group('TokenStorage', () {
    test('initial state has no tokens', () async {
      expect(await tokenStorage.getAccessToken(), isNull);
      expect(await tokenStorage.getRefreshToken(), isNull);
      expect(await tokenStorage.hasValidToken(), isFalse);
    });

    test('stores and retrieves access and refresh tokens', () async {
      await tokenStorage.setTokens(
        accessToken: 'access_123',
        refreshToken: 'refresh_456',
      );

      expect(await tokenStorage.getAccessToken(), equals('access_123'));
      expect(await tokenStorage.getRefreshToken(), equals('refresh_456'));
      expect(await tokenStorage.hasValidToken(), isTrue);
    });

    test('clearTokens removes all stored tokens', () async {
      await tokenStorage.setTokens(
        accessToken: 'access_123',
        refreshToken: 'refresh_456',
      );

      await tokenStorage.clearTokens();

      expect(await tokenStorage.getAccessToken(), isNull);
      expect(await tokenStorage.getRefreshToken(), isNull);
      expect(await tokenStorage.hasValidToken(), isFalse);
    });
  });
}
