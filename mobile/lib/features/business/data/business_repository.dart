import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/business/domain/business_models.dart';

final businessRepositoryProvider = Provider<BusinessRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return BusinessRepository(dio);
});

class BusinessRepository {
  BusinessRepository(this._dio);

  final Dio _dio;

  /// Fetch advertiser profile for authenticated user.
  Future<BusinessProfileModel> getProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/business/profile',
      );
      return BusinessProfileModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Register or update business advertiser profile.
  Future<BusinessProfileModel> updateProfile(
    CreateBusinessProfileInput input,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/business/profile',
        data: input.toJson(),
      );
      return BusinessProfileModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Browse active brand sponsorship briefs.
  Future<List<CampaignModel>> listCampaigns({
    String? category,
    String status = 'active',
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/v1/business/campaigns',
        queryParameters: <String, dynamic>{
          'status_filter': status,
          'category': ?category,
        },
      );
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(CampaignModel.fromJson)
            .toList();
      }
      return const <CampaignModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Get campaign brief details.
  Future<CampaignModel> getCampaign(String campaignId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/business/campaigns/$campaignId',
      );
      return CampaignModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Publish a new brand sponsorship campaign brief.
  Future<CampaignModel> createCampaign(CreateCampaignInput input) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/business/campaigns',
        data: input.toJson(),
      );
      return CampaignModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Submit a creator pitch to an active campaign brief.
  Future<CollabApplicationModel> applyToCampaign({
    required String campaignId,
    required String pitch,
    String? portfolioReelId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/business/campaigns/$campaignId/apply',
        data: <String, dynamic>{
          'pitch': pitch,
          'portfolio_reel_id': ?portfolioReelId,
        },
      );
      return CollabApplicationModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Review applications submitted to a brand campaign.
  Future<List<CollabApplicationModel>> getCampaignApplications(
    String campaignId,
  ) async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/v1/business/campaigns/$campaignId/applications',
      );
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(CollabApplicationModel.fromJson)
            .toList();
      }
      return const <CollabApplicationModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}
