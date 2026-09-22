import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/core/theme/theme_provider.dart';
import 'package:vidsnap_ai/features/create/domain/create_video_model.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';

class CreateRepository {
  CreateRepository({
    required this.dio,
    required this.preferences,
  });

  final Dio dio;
  final SharedPreferences preferences;

  static const String _draftsKey = 'vidsnap_reel_drafts';

  Future<FeedItemModel> uploadVideo({
    required String filePath,
    required String title,
    String description = '',
    List<String> hashtags = const <String>[],
    String visibility = 'public',
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final fileName = filePath.split(RegExp(r'[/\\]')).last;
      final multipartFile = await MultipartFile.fromFile(
        filePath,
        filename: fileName.isNotEmpty ? fileName : 'reel.mp4',
      );

      final formData = FormData.fromMap(<String, dynamic>{
        'video': multipartFile,
        'title': title,
        'description': description,
        'hashtags': hashtags.join(','),
        'visibility': visibility,
        'is_draft': false,
      });

      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/content/videos/upload',
        data: formData,
        onSendProgress: onSendProgress,
      );

      return FeedItemModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<HashtagSuggestionResponseModel> suggestTags({
    required String title,
    String? transcript,
  }) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/content/ai/suggest-tags',
        data: <String, dynamic>{
          'title': title,
          if (transcript != null && transcript.isNotEmpty) 'transcript': transcript,
        },
      );
      return HashtagSuggestionResponseModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  List<CreateVideoDraft> getDrafts() {
    final rawList = preferences.getStringList(_draftsKey) ?? const <String>[];
    final drafts = <CreateVideoDraft>[];
    for (final raw in rawList) {
      try {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        drafts.add(CreateVideoDraft.fromJson(map));
      } catch (_) {
        // Skip corrupted draft
      }
    }
    return drafts;
  }

  Future<void> saveDraft(CreateVideoDraft draft) async {
    final drafts = getDrafts();
    final index = drafts.indexWhere((d) => d.draftId == draft.draftId);
    if (index >= 0) {
      drafts[index] = draft;
    } else {
      drafts.insert(0, draft);
    }

    final encoded = drafts.map((d) => jsonEncode(d.toJson())).toList();
    await preferences.setStringList(_draftsKey, encoded);
  }

  Future<void> deleteDraft(String draftId) async {
    final drafts = getDrafts().where((d) => d.draftId != draftId).toList();
    final encoded = drafts.map((d) => jsonEncode(d.toJson())).toList();
    await preferences.setStringList(_draftsKey, encoded);
  }
}

final createRepositoryProvider = Provider<CreateRepository>((ref) {
  final dio = ref.watch(dioProvider);
  final prefs = ref.watch(sharedPreferencesProvider);
  return CreateRepository(dio: dio, preferences: prefs);
});
