import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/auth/domain/auth_requests.dart';
import 'package:vidsnap_ai/features/auth/domain/auth_response_model.dart';
import 'package:vidsnap_ai/features/auth/domain/user_model.dart';

class AuthRepository {
  AuthRepository({required this.dio, required this.tokenStorage});

  final Dio dio;
  final TokenStorage tokenStorage;

  Future<AuthResponse> login(LoginRequest request) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/login',
        data: request.toJson(),
      );
      final authResp = AuthResponse.fromJson(response.data!);
      if (authResp.refreshToken != null) {
        await tokenStorage.setTokens(
          accessToken: authResp.accessToken,
          refreshToken: authResp.refreshToken!,
        );
      } else {
        await tokenStorage.setAccessToken(authResp.accessToken);
      }
      return authResp;
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<AuthResponse> signup(SignupRequest request) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/signup',
        data: request.toJson(),
      );
      final authResp = AuthResponse.fromJson(response.data!);
      if (authResp.refreshToken != null) {
        await tokenStorage.setTokens(
          accessToken: authResp.accessToken,
          refreshToken: authResp.refreshToken!,
        );
      } else {
        await tokenStorage.setAccessToken(authResp.accessToken);
      }
      return authResp;
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<Map<String, dynamic>> verifyEmail(VerifyEmailRequest request) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/verify-email',
        data: request.toJson(),
      );
      return response.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<String> resendVerification(String email) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/resend-verification',
        data: ResendVerificationRequest(email: email).toJson(),
      );
      return response.data?['message'] as String? ?? 'Verification code sent.';
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<String> forgotPassword(String email) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/forgot-password',
        data: ForgotPasswordRequest(email: email).toJson(),
      );
      return response.data?['message'] as String? ?? 'Verification code sent.';
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<String> resetPassword(ResetPasswordRequest request) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/reset-password',
        data: request.toJson(),
      );
      return response.data?['message'] as String? ??
          'Password reset successfully.';
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<User> getMe() async {
    try {
      final response = await dio.get<Map<String, dynamic>>('/api/v1/users/me');
      return User.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      await dio.post<Map<String, dynamic>>(
        '/api/v1/auth/logout',
        data: refreshToken != null
            ? TokenRefreshRequest(refreshToken: refreshToken).toJson()
            : null,
      );
    } catch (_) {
      // Ignore network errors on logout - token must still be purged locally
    } finally {
      await tokenStorage.clearTokens();
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final dio = ref.watch(dioProvider);
  final tokenStorage = ref.watch(tokenStorageProvider);
  return AuthRepository(dio: dio, tokenStorage: tokenStorage);
});
