import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/config/env_config.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/auth_interceptor.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';

class SafeLoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('--> ${options.method.toUpperCase()} ${options.uri}');
      // Strictly redact Authorization header
      final sanitizedHeaders = Map<String, dynamic>.from(options.headers);
      if (sanitizedHeaders.containsKey('Authorization')) {
        sanitizedHeaders['Authorization'] = 'Bearer [REDACTED]';
      }
      debugPrint('Headers: $sanitizedHeaders');
    }
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('<-- ${response.statusCode} ${response.requestOptions.uri}');
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('<-- ERROR ${err.response?.statusCode} ${err.requestOptions.uri}: ${err.message}');
    }
    handler.next(err);
  }
}

AppFailure mapDioExceptionToAppFailure(DioException err) {
  switch (err.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.transformTimeout:
    case DioExceptionType.connectionError:
      return AppFailure.network(
        message: 'Unable to connect to VidSnap server. Please check your network.',
      );

    case DioExceptionType.badResponse:
      final statusCode = err.response?.statusCode;
      final data = err.response?.data;
      String message = 'An unexpected server response was received.';

      if (data is Map<String, dynamic>) {
        if (data['detail'] is String) {
          message = data['detail'] as String;
        } else if (data['message'] is String) {
          message = data['message'] as String;
        }
      }

      if (statusCode == 401) {
        return AppFailure.auth(message: message, statusCode: statusCode);
      } else if (statusCode == 422 || statusCode == 400) {
        return AppFailure.validation(
          message: message,
          statusCode: statusCode,
          details: data,
        );
      } else if (statusCode != null && statusCode >= 500) {
        return AppFailure.server(message: message, statusCode: statusCode);
      }
      return AppFailure.unknown(message: message, details: data);

    case DioExceptionType.cancel:
      return const AppFailure(
        type: FailureType.unknown,
        message: 'Request was cancelled.',
        isRetryable: false,
      );

    case DioExceptionType.badCertificate:
    case DioExceptionType.unknown:
      return AppFailure.network(
        message: 'Network error. Please verify your connection.',
      );
  }
}

Dio createDioClient({
  required TokenStorage tokenStorage,
  OnSessionExpired? onSessionExpired,
  String? baseUrl,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl ?? EnvConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: <String, dynamic>{
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    AuthInterceptor(
      tokenStorage: tokenStorage,
      onSessionExpired: onSessionExpired,
    ),
  );

  if (kDebugMode) {
    dio.interceptors.add(SafeLoggingInterceptor());
  }

  return dio;
}

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return createDioClient(tokenStorage: storage);
});
