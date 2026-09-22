import 'package:dio/dio.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/network/auth_interceptor.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';

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

class TestRequestInterceptorHandler extends RequestInterceptorHandler {
  RequestOptions? nextOptions;

  @override
  void next(RequestOptions requestOptions) {
    nextOptions = requestOptions;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late TokenStorage tokenStorage;
  late AuthInterceptor interceptor;

  setUp(() {
    FlutterSecureStoragePlatform.instance = FakeSecureStoragePlatform();
    tokenStorage = TokenStorage();
    interceptor = AuthInterceptor(tokenStorage: tokenStorage);
  });

  group('AuthInterceptor onRequest', () {
    test(
      'attaches Bearer token to private requests when token exists',
      () async {
        await tokenStorage.setAccessToken('my_test_jwt_token');

        final options = RequestOptions(path: '/api/v1/users/me');
        final handler = TestRequestInterceptorHandler();

        await interceptor.onRequest(options, handler);

        expect(
          handler.nextOptions?.headers['Authorization'],
          equals('Bearer my_test_jwt_token'),
        );
      },
    );

    test('skips Authorization header for public login request', () async {
      await tokenStorage.setAccessToken('my_test_jwt_token');

      final options = RequestOptions(path: '/api/v1/auth/login');
      final handler = TestRequestInterceptorHandler();

      await interceptor.onRequest(options, handler);

      expect(handler.nextOptions?.headers['Authorization'], isNull);
    });

    test('skips Authorization header for public signup request', () async {
      await tokenStorage.setAccessToken('my_test_jwt_token');

      final options = RequestOptions(path: '/api/v1/auth/signup');
      final handler = TestRequestInterceptorHandler();

      await interceptor.onRequest(options, handler);

      expect(handler.nextOptions?.headers['Authorization'], isNull);
    });
  });
}
