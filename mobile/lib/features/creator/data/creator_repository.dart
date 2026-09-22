import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/creator/domain/creator_models.dart';

final creatorRepositoryProvider = Provider<CreatorRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return CreatorRepository(dio);
});

class CreatorRepository {
  CreatorRepository(this._dio);

  final Dio _dio;

  /// Fetch current user's creator studio profile.
  Future<CreatorProfileModel> getProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/creator/profile',
      );
      return CreatorProfileModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Update creator bio, niche, or external social media links.
  Future<CreatorProfileModel> updateProfile({
    String? bio,
    String? niche,
    Map<String, String>? socialLinks,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/api/v1/creator/profile',
        data: <String, dynamic>{
          'bio': ?bio,
          'niche': ?niche,
          'social_links': ?socialLinks,
        },
      );
      return CreatorProfileModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Fetch aggregated creator audience metrics and analytics.
  Future<CreatorAnalyticsModel> getAnalytics({int days = 30}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/creator/analytics',
        queryParameters: <String, dynamic>{'days': days},
      );
      return CreatorAnalyticsModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Generate AI video hooks, viral score, and strategy with Creator Copilot.
  Future<CreatorCopilotResponseModel> getCopilotInsights({
    required String topic,
    String? targetAudience,
    String? moodVibe,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/creator/copilot',
        data: <String, dynamic>{
          'topic': topic,
          'target_audience': ?targetAudience,
          'mood_vibe': ?moodVibe,
        },
      );
      return CreatorCopilotResponseModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Submit application for verified creator badge.
  Future<VerificationApplicationModel> applyVerification({
    required String niche,
    required String statement,
    List<String> portfolioLinks = const <String>[],
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/creator/verify/apply',
        data: <String, dynamic>{
          'niche': niche,
          'statement': statement,
          'portfolio_links': portfolioLinks,
        },
      );
      return VerificationApplicationModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}
