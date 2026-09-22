import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';

class SocialRepository {
  SocialRepository({required this.dio});

  final Dio dio;

  Future<FollowStatusModel> followUser(String userId) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/social/follow/$userId',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to follow user');
      }
      return FollowStatusModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<FollowStatusModel> unfollowUser(String userId) async {
    try {
      final response = await dio.delete<Map<String, dynamic>>(
        '/api/v1/social/follow/$userId',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to unfollow user');
      }
      return FollowStatusModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<FollowStatusModel> getFollowStatus(String userId) async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/api/v1/social/follow-status/$userId',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to get follow status');
      }
      return FollowStatusModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<List<CommunityModel>> listCommunities({
    String? category,
    String? query,
    int limit = 30,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limit': limit,
      };
      if (category != null && category.isNotEmpty && category != 'all') {
        queryParams['category'] = category;
      }
      if (query != null && query.isNotEmpty) {
        queryParams['q'] = query;
      }

      final response = await dio.get<Map<String, dynamic>>(
        '/api/v1/social/communities',
        queryParameters: queryParams,
      );
      final data = response.data;
      if (data == null) return const <CommunityModel>[];

      final itemsRaw = data['items'] as List<dynamic>? ?? const <dynamic>[];
      return itemsRaw
          .whereType<Map<String, dynamic>>()
          .map(CommunityModel.fromJson)
          .toList();
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<CommunityModel> joinCommunity(String communityId) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/social/communities/$communityId/join',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to join community');
      }
      return CommunityModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<CommunityModel> leaveCommunity(String communityId) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/social/communities/$communityId/leave',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to leave community');
      }
      return CommunityModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}

final socialRepositoryProvider = Provider<SocialRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return SocialRepository(dio: dio);
});
