import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage_platform_interface/flutter_secure_storage_platform_interface.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/auth/data/auth_repository.dart';
import 'package:vidsnap_ai/features/auth/domain/auth_requests.dart';

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

class FakeHttpAdapter implements HttpClientAdapter {
  ResponseBody? nextResponse;
  DioException? nextError;
  RequestOptions? lastRequestOptions;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequestOptions = options;
    if (nextError != null) {
      throw nextError!;
    }
    return nextResponse!;
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeHttpAdapter fakeAdapter;
  late Dio dio;
  late TokenStorage tokenStorage;
  late AuthRepository repository;

  setUp(() {
    FlutterSecureStoragePlatform.instance = FakeSecureStoragePlatform();
    fakeAdapter = FakeHttpAdapter();
    dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'))
      ..httpClientAdapter = fakeAdapter;
    tokenStorage = TokenStorage();
    repository = AuthRepository(dio: dio, tokenStorage: tokenStorage);
  });

  group('AuthRepository Unit Tests', () {
    test('login success saves tokens and returns AuthResponse', () async {
      final responseJson = jsonEncode(<String, dynamic>{
        'access_token': 'jwt_access_123',
        'token_type': 'bearer',
        'refresh_token': 'rt_456',
        'user': <String, dynamic>{
          'user_id': 'u1',
          'name': 'Test User',
          'email': 'test@vidsnap.ai',
          'roles': <String>['creator'],
          'tokens_remaining': 10,
          'email_verified': true,
          'timezone': 'UTC',
          'created_at': DateTime.now().toIso8601String(),
        },
      });

      fakeAdapter.nextResponse = ResponseBody.fromString(
        responseJson,
        200,
        headers: <String, List<String>>{
          'content-type': <String>['application/json'],
        },
      );

      final authResp = await repository.login(
        const LoginRequest(email: 'test@vidsnap.ai', password: 'password123'),
      );

      expect(authResp.accessToken, equals('jwt_access_123'));
      expect(authResp.refreshToken, equals('rt_456'));
      expect(authResp.user.email, equals('test@vidsnap.ai'));
      expect(await tokenStorage.getAccessToken(), equals('jwt_access_123'));
      expect(await tokenStorage.getRefreshToken(), equals('rt_456'));
    });

    test('login invalid credentials throws AppFailure.auth', () async {
      fakeAdapter.nextError = DioException(
        requestOptions: RequestOptions(path: '/api/v1/auth/login'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: RequestOptions(path: '/api/v1/auth/login'),
          statusCode: 401,
          data: <String, dynamic>{'detail': 'Invalid email or password.'},
        ),
      );

      expect(
        () => repository.login(
          const LoginRequest(email: 'wrong@vidsnap.ai', password: 'bad'),
        ),
        throwsA(
          isA<AppFailure>()
              .having((e) => e.type, 'type', equals(FailureType.auth))
              .having((e) => e.statusCode, 'statusCode', equals(401)),
        ),
      );
    });

    test('login network failure throws AppFailure.network', () async {
      fakeAdapter.nextError = DioException(
        requestOptions: RequestOptions(path: '/api/v1/auth/login'),
        type: DioExceptionType.connectionError,
        message: 'Connection refused',
      );

      expect(
        () => repository.login(
          const LoginRequest(email: 'test@vidsnap.ai', password: 'pass'),
        ),
        throwsA(
          isA<AppFailure>()
              .having((e) => e.type, 'type', equals(FailureType.network))
              .having((e) => e.isRetryable, 'isRetryable', isTrue),
        ),
      );
    });

    test(
      'logout sends refresh token to /api/v1/auth/logout and clears tokens',
      () async {
        await tokenStorage.setTokens(accessToken: 'at_1', refreshToken: 'rt_1');

        fakeAdapter.nextResponse = ResponseBody.fromString(
          jsonEncode(<String, dynamic>{'message': 'Logged out successfully.'}),
          200,
          headers: <String, List<String>>{
            'content-type': <String>['application/json'],
          },
        );

        await repository.logout();

        expect(
          fakeAdapter.lastRequestOptions?.path,
          equals('/api/v1/auth/logout'),
        );
        expect(await tokenStorage.getAccessToken(), isNull);
        expect(await tokenStorage.getRefreshToken(), isNull);
      },
    );
  });
}
