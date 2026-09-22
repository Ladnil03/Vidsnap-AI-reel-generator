import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/gamification/domain/gamification_models.dart';

final gamificationRepositoryProvider = Provider<GamificationRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return GamificationRepository(dio);
});

class GamificationRepository {
  GamificationRepository(this._dio);

  final Dio _dio;

  /// Fetch the aggregated gamification profile.
  Future<GamificationProfileModel> getProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/gamification/profile',
      );
      return GamificationProfileModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Fetch user level and progress status.
  Future<UserLevelModel> getUserLevel() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/gamification/level',
      );
      return UserLevelModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Record daily streak activity (check-in / daily login).
  Future<StreakStateModel> recordStreakActivity({
    String scope = 'daily',
    String? targetId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/gamification/streaks/record',
        data: <String, dynamic>{'scope': scope, 'target_id': ?targetId},
      );
      return StreakStateModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Use a freeze token to safeguard an ongoing streak.
  Future<StreakStateModel> freezeStreak({
    String scope = 'daily',
    String? targetId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/gamification/streaks/freeze',
        data: <String, dynamic>{'scope': scope, 'target_id': ?targetId},
      );
      return StreakStateModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Get active daily and weekly quest challenges with progress.
  Future<List<UserChallengeModel>> getChallenges() async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/v1/gamification/challenges',
      );
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(UserChallengeModel.fromJson)
            .toList();
      }
      return const <UserChallengeModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Claim a completed quest challenge reward.
  Future<AwardXPResponseModel> claimChallenge(String challengeId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/gamification/challenges/$challengeId/claim',
      );
      return AwardXPResponseModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Get badge achievement catalog with unlock status.
  Future<List<UserBadgeModel>> getBadgesCatalog() async {
    try {
      final response = await _dio.get<dynamic>('/api/v1/gamification/badges');
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(UserBadgeModel.fromJson)
            .toList();
      }
      return const <UserBadgeModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Fetch global or weekly leaderboard rankings.
  Future<LeaderboardResponseModel> getLeaderboard({
    String scope = 'all_time',
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/gamification/leaderboard',
        queryParameters: <String, dynamic>{'scope': scope, 'limit': limit},
      );
      return LeaderboardResponseModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}
