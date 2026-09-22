import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/profile/domain/profile_models.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ProfileRepository(dio);
});

class ProfileRepository {
  ProfileRepository(this._dio);

  final Dio _dio;

  /// Fetch full profile metrics for current authenticated user.
  Future<UserProfileModel> getMyProfile() async {
    try {
      final meResponse =
          await _dio.get<Map<String, dynamic>>('/api/v1/users/me');
      final meData = meResponse.data ?? <String, dynamic>{};
      final userId = meData['user_id']?.toString() ?? '';

      // Fetch social metrics
      int followers = 0;
      int following = 0;
      int reels = 0;
      String bio = '';
      String? avatarUrl;

      if (userId.isNotEmpty) {
        try {
          final socialResponse = await _dio
              .get<Map<String, dynamic>>('/api/v1/social/profile/$userId');
          final socialData = socialResponse.data ?? <String, dynamic>{};
          followers = (socialData['followers_count'] ?? 0) as int;
          following = (socialData['following_count'] ?? 0) as int;
          reels = (socialData['reels_count'] ?? 0) as int;
          bio = (socialData['bio'] ?? '').toString();
          avatarUrl = socialData['avatar_url']?.toString();
        } catch (_) {
          // If social profile doesn't exist yet, fallback to default
        }
      }

      return UserProfileModel(
        userId: userId,
        name: (meData['name'] ?? '').toString(),
        email: (meData['email'] ?? '').toString(),
        avatarUrl: avatarUrl,
        bio: bio,
        followersCount: followers,
        followingCount: following,
        reelsCount: reels,
        tokensRemaining: (meData['tokens_remaining'] ?? 0) as int,
        roles: (meData['roles'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const <String>['user'],
        timezone: (meData['timezone'] ?? 'UTC').toString(),
        createdAt: meData['created_at'] != null
            ? DateTime.tryParse(meData['created_at'].toString())
            : null,
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Fetch public profile for a specific user ID.
  Future<UserProfileModel> getUserProfile(String userId) async {
    try {
      final response = await _dio
          .get<Map<String, dynamic>>('/api/v1/social/profile/$userId');
      return UserProfileModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Update personal profile info (display name, bio, timezone).
  Future<UserProfileModel> updateProfile(UpdateProfileInput input) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        '/api/v1/users/me',
        data: input.toJson(),
      );
      final data = response.data ?? <String, dynamic>{};
      return UserProfileModel(
        userId: (data['user_id'] ?? '').toString(),
        name: (data['name'] ?? '').toString(),
        email: (data['email'] ?? '').toString(),
        roles: (data['roles'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const <String>['user'],
        tokensRemaining: (data['tokens_remaining'] ?? 0) as int,
        timezone: (data['timezone'] ?? 'UTC').toString(),
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Fetch reels published by a specific user.
  Future<List<FeedItemModel>> getUserReels(String userId) async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/v1/content/videos',
        queryParameters: <String, dynamic>{'user_id': userId},
      );
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(FeedItemModel.fromJson)
            .toList();
      }
      return const <FeedItemModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Fetch saved reels for current user.
  Future<List<FeedItemModel>> getSavedReels() async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/v1/feed',
        queryParameters: <String, dynamic>{'tab': 'saved'},
      );
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(FeedItemModel.fromJson)
            .toList();
      }
      return const <FeedItemModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}
