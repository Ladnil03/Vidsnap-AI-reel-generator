import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';

class RoomsRepository {
  RoomsRepository({required this.dio});

  final Dio dio;

  Future<List<RoomModel>> listRooms({
    int skip = 0,
    int limit = 30,
    String? search,
    String? roomType,
  }) async {
    try {
      final queryParams = <String, dynamic>{'skip': skip, 'limit': limit};
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (roomType != null && roomType.isNotEmpty) {
        queryParams['room_type'] = roomType;
      }

      final response = await dio.get<dynamic>(
        '/api/v1/rooms',
        queryParameters: queryParams,
      );

      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(RoomModel.fromJson)
            .toList();
      }
      return const <RoomModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<RoomModel> getRoom(String roomId) async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/api/v1/rooms/$roomId',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Room not found', statusCode: 404);
      }
      return RoomModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<RoomModel> createRoom({
    required String name,
    String description = '',
    String roomType = 'public',
    String? passcode,
    String controlMode = 'host_only',
    String? initialMediaUrl,
    String? initialMediaTitle,
  }) async {
    try {
      final payload = <String, dynamic>{
        'name': name,
        'description': description,
        'room_type': roomType,
        'control_mode': controlMode,
        if (passcode != null && passcode.isNotEmpty) 'passcode': passcode,
        'initial_media_url': ?initialMediaUrl,
        'initial_media_title': ?initialMediaTitle,
      };

      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/rooms',
        data: payload,
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to create room');
      }
      return RoomModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<RoomModel> joinRoom(String roomId, {String? passcode}) async {
    try {
      final payload = <String, dynamic>{'passcode': ?passcode};

      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/rooms/$roomId/join',
        data: payload,
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to join room');
      }
      return RoomModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<bool> leaveRoom(String roomId) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/rooms/$roomId/leave',
      );
      final data = response.data;
      return data?['left'] == true;
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<WatchStateModel> syncPlayback(
    String roomId, {
    required String action,
    double? positionSeconds,
    double? playbackRate,
    String? mediaUrl,
    String? mediaTitle,
  }) async {
    try {
      final payload = <String, dynamic>{
        'action': action,
        'position_seconds': ?positionSeconds,
        'playback_rate': ?playbackRate,
        'media_url': ?mediaUrl,
        'media_title': ?mediaTitle,
      };

      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/rooms/$roomId/sync',
        data: payload,
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to sync playback');
      }
      return WatchStateModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<List<RoomChatMessageModel>> getChatHistory(
    String roomId, {
    int limit = 50,
  }) async {
    try {
      final response = await dio.get<dynamic>(
        '/api/v1/rooms/$roomId/messages',
        queryParameters: {'limit': limit},
      );
      final data = response.data;
      if (data is List) {
        return data
            .whereType<Map<String, dynamic>>()
            .map(RoomChatMessageModel.fromJson)
            .toList();
      }
      return const <RoomChatMessageModel>[];
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<LiveKitCredentialsModel> getRtcToken(String roomId) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/rooms/$roomId/rtc-token',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to get RTC token');
      }
      return LiveKitCredentialsModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<RoomSummaryModel> getRoomRecap(String roomId) async {
    try {
      final response = await dio.post<Map<String, dynamic>>(
        '/api/v1/rooms/$roomId/summary',
      );
      final data = response.data;
      if (data == null) {
        throw AppFailure.server(message: 'Failed to generate recap');
      }
      return RoomSummaryModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}

final roomsRepositoryProvider = Provider<RoomsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return RoomsRepository(dio: dio);
});
