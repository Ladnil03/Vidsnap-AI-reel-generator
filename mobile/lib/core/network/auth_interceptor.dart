import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:vidsnap_ai/core/config/env_config.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';

typedef OnSessionExpired = void Function();

class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({required this.tokenStorage, this.onSessionExpired});

  final TokenStorage tokenStorage;
  final OnSessionExpired? onSessionExpired;

  bool _isRefreshing = false;
  final List<Completer<String>> _refreshQueue = <Completer<String>>[];

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip token attachment for public auth endpoints
    final path = options.path;
    if (_isPublicPath(path)) {
      handler.next(options);
      return;
    }

    final accessToken = await tokenStorage.getAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final path = err.requestOptions.path;

    // Only attempt refresh on 401 for non-auth endpoints
    if (response?.statusCode == 401 && !_isPublicPath(path)) {
      if (_isRefreshing) {
        // Enqueue this request until refresh finishes
        final completer = Completer<String>();
        _refreshQueue.add(completer);

        try {
          final newToken = await completer.future;
          final retryOptions = err.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer $newToken';
          final retryResponse = await _retryRequest(retryOptions);
          handler.resolve(retryResponse);
          return;
        } catch (_) {
          handler.next(err);
          return;
        }
      }

      _isRefreshing = true;
      try {
        final currentRefreshToken = await tokenStorage.getRefreshToken();
        if (currentRefreshToken == null || currentRefreshToken.isEmpty) {
          _handleSessionExpired();
          handler.next(err);
          return;
        }

        // Dedicated Dio instance for refresh without interceptors to prevent recursion
        final refreshDio = Dio(
          BaseOptions(
            baseUrl: EnvConfig.apiBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 10),
            headers: <String, dynamic>{'Content-Type': 'application/json'},
          ),
        );

        final refreshResponse = await refreshDio.post<Map<String, dynamic>>(
          '/api/v1/auth/refresh',
          data: <String, dynamic>{'refresh_token': currentRefreshToken},
        );

        if (refreshResponse.statusCode == 200 && refreshResponse.data != null) {
          final data = refreshResponse.data!;
          final newAccessToken = data['access_token'] as String;
          final newRefreshToken =
              (data['refresh_token'] as String?) ?? currentRefreshToken;

          await tokenStorage.setTokens(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          );

          // Drain queued requests with new token
          for (final c in _refreshQueue) {
            if (!c.isCompleted) {
              c.complete(newAccessToken);
            }
          }
          _refreshQueue.clear();

          // Retry the original request that failed
          final retryOptions = err.requestOptions;
          retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
          final retriedResponse = await _retryRequest(retryOptions);
          handler.resolve(retriedResponse);
          return;
        } else {
          _handleSessionExpired();
          handler.next(err);
          return;
        }
      } catch (refreshErr) {
        if (kDebugMode) {
          debugPrint('Silent refresh failed: $refreshErr');
        }
        _handleSessionExpired();
        for (final c in _refreshQueue) {
          if (!c.isCompleted) {
            c.completeError(refreshErr);
          }
        }
        _refreshQueue.clear();
        handler.next(err);
        return;
      } finally {
        _isRefreshing = false;
      }
    }

    handler.next(err);
  }

  Future<Response<dynamic>> _retryRequest(RequestOptions requestOptions) {
    final client = Dio(
      BaseOptions(
        baseUrl: requestOptions.baseUrl,
        connectTimeout: requestOptions.connectTimeout,
        receiveTimeout: requestOptions.receiveTimeout,
        sendTimeout: requestOptions.sendTimeout,
        responseType: requestOptions.responseType,
        contentType: requestOptions.contentType,
        validateStatus: requestOptions.validateStatus,
      ),
    );

    return client.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: Options(
        method: requestOptions.method,
        headers: requestOptions.headers,
      ),
    );
  }

  void _handleSessionExpired() {
    unawaited(tokenStorage.clearTokens());
    onSessionExpired?.call();
  }

  bool _isPublicPath(String path) {
    return path.contains('/auth/login') ||
        path.contains('/auth/signup') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/forgot-password') ||
        path.contains('/auth/reset-password') ||
        path.contains('/auth/verify-email') ||
        path.contains('/auth/resend-verification');
  }
}
