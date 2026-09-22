import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/companion/domain/companion_models.dart';

final companionRepositoryProvider = Provider<CompanionRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return CompanionRepository(dio);
});

class CompanionRepository {
  CompanionRepository(this._dio);

  final Dio _dio;

  /// Chat with the personal AI companion.
  Future<CompanionChatResponseModel> chat({
    required String message,
    MoodType? mood,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/companion/chat',
        data: <String, dynamic>{
          'message': message,
          'mood': ?mood?.value,
        },
      );

      return CompanionChatResponseModel.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Retrieve conversation history.
  Future<List<CompanionMessageModel>> getHistory({int limit = 30}) async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/v1/companion/history',
        queryParameters: <String, dynamic>{'limit': limit},
      );

      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(CompanionMessageModel.fromJson)
            .toList();
      }
      return const <CompanionMessageModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Purge companion conversation history.
  Future<bool> clearHistory() async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>('/api/v1/companion/history');
      final data = response.data;
      return (data?['cleared'] ?? true) as bool;
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Get active user mood preference.
  Future<MoodStateModel?> getActiveMood() async {
    try {
      final response = await _dio.get<Map<String, dynamic>?>('/api/v1/companion/mood');
      if (response.data == null) return null;
      return MoodStateModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  /// Update active mood state.
  Future<MoodStateModel> setMood({
    required MoodType mood,
    bool consentGiven = true,
    String? note,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/companion/mood',
        data: <String, dynamic>{
          'mood': mood.value,
          'consent_given': consentGiven,
          'note': ?note,
        },
      );

      return MoodStateModel.fromJson(response.data ?? <String, dynamic>{});
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}
