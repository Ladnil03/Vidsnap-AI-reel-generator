import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/feed/domain/comment_model.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';

class FeedRepository {
  FeedRepository({required this.dio});

  final Dio dio;

  Future<List<FeedItemModel>> getFeed({
    FeedTab tab = FeedTab.trending,
    String? cursor,
    int limit = 10,
  }) async {
    try {
      final queryParams = <String, dynamic>{'tab': tab.value, 'limit': limit};
      if (cursor != null && cursor.isNotEmpty) {
        queryParams['cursor'] = cursor;
      }

      final response = await dio.get<Map<String, dynamic>>(
        '/api/v1/feed',
        queryParameters: queryParams,
      );

      final data = response.data;
      if (data == null) return const <FeedItemModel>[];

      final itemsRaw = data['items'] as List<dynamic>? ?? const <dynamic>[];
      return itemsRaw
          .map((item) => FeedItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<Map<String, dynamic>> toggleLike(
    String videoId, {
    required bool currentlyLiked,
  }) async {
    try {
      final Response<Map<String, dynamic>> response;
      if (currentlyLiked) {
        response = await dio.delete<Map<String, dynamic>>(
          '/api/v1/content/videos/$videoId/like',
        );
      } else {
        response = await dio.post<Map<String, dynamic>>(
          '/api/v1/content/videos/$videoId/like',
        );
      }
      return response.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<Map<String, dynamic>> toggleSave(
    String videoId, {
    required bool currentlySaved,
  }) async {
    try {
      final Response<Map<String, dynamic>> response;
      if (currentlySaved) {
        response = await dio.delete<Map<String, dynamic>>(
          '/api/v1/content/videos/$videoId/save',
        );
      } else {
        response = await dio.post<Map<String, dynamic>>(
          '/api/v1/content/videos/$videoId/save',
        );
      }
      return response.data ?? <String, dynamic>{};
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<List<CommentModel>> getComments(
    String videoId, {
    int skip = 0,
    int limit = 50,
  }) async {
    try {
      final response = await dio.get<List<dynamic>>(
        '/api/v1/content/videos/$videoId/comments',
        queryParameters: <String, dynamic>{'skip': skip, 'limit': limit},
      );
      final rawList = response.data ?? const <dynamic>[];
      return rawList
          .map((item) => CommentModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<CommentModel> addComment(String videoId, String text) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/content/videos/$videoId/comments',
        data: <String, dynamic>{'text': text},
      );
      return CommentModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<WatchProgressModel> recordWatchProgress(
    WatchProgressRequestModel request,
  ) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/feed/watch-progress',
        data: request.toJson(),
      );
      return WatchProgressModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}

final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return FeedRepository(dio: dio);
});
