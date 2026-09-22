import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/config/env_config.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';

sealed class RoomSocketEvent {
  const RoomSocketEvent();
}

class RoomChatEvent extends RoomSocketEvent {
  const RoomChatEvent(this.message);
  final RoomChatMessageModel message;
}

class RoomReactionEvent extends RoomSocketEvent {
  const RoomReactionEvent({
    required this.userId,
    required this.userName,
    required this.emoji,
  });
  final String userId;
  final String userName;
  final String emoji;
}

class RoomSyncEvent extends RoomSocketEvent {
  const RoomSyncEvent({
    required this.watchState,
    required this.triggeredBy,
  });
  final WatchStateModel watchState;
  final String triggeredBy;
}

class RoomUserJoinedEvent extends RoomSocketEvent {
  const RoomUserJoinedEvent({
    required this.userId,
    required this.userName,
  });
  final String userId;
  final String userName;
}

class RoomUserLeftEvent extends RoomSocketEvent {
  const RoomUserLeftEvent({
    required this.userId,
    required this.userName,
  });
  final String userId;
  final String userName;
}

class RoomErrorEvent extends RoomSocketEvent {
  const RoomErrorEvent(this.message);
  final String message;
}

abstract class IRoomSocket {
  Stream<dynamic> get stream;
  void add(dynamic data);
  Future<void> close([int? code, String? reason]);
}

class IoRoomSocket implements IRoomSocket {
  IoRoomSocket(this._socket);
  final WebSocket _socket;

  @override
  Stream<dynamic> get stream => _socket;

  @override
  void add(dynamic data) => _socket.add(data);

  @override
  Future<void> close([int? code, String? reason]) => _socket.close(code, reason);
}

typedef RoomSocketFactory = Future<IRoomSocket> Function(Uri uri);

class RoomSocketService {
  RoomSocketService({
    required this.tokenStorage,
    RoomSocketFactory? socketFactory,
  }) : _socketFactory = socketFactory ?? _defaultSocketFactory;

  final TokenStorage tokenStorage;
  final RoomSocketFactory _socketFactory;

  IRoomSocket? _socket;
  StreamSubscription<dynamic>? _subscription;
  // ignore: close_sinks
  final StreamController<RoomSocketEvent> _eventController =
      StreamController<RoomSocketEvent>.broadcast();
  Timer? _pingTimer;
  bool _isConnected = false;

  Stream<RoomSocketEvent> get events => _eventController.stream;
  bool get isConnected => _isConnected;

  static Future<IRoomSocket> _defaultSocketFactory(Uri uri) async {
    // ignore: close_sinks
    final ws = await WebSocket.connect(uri.toString());
    return IoRoomSocket(ws);
  }

  Future<void> connect(String roomId) async {
    await disconnect();

    final token = await tokenStorage.getAccessToken();
    const baseUrl = EnvConfig.apiBaseUrl;
    final wsScheme = baseUrl.startsWith('https') ? 'wss' : 'ws';
    final hostAndPort = baseUrl.replaceFirst(RegExp(r'^https?://'), '');

    final uri = Uri.parse('$wsScheme://$hostAndPort/api/v1/rooms/$roomId/ws?token=${token ?? ''}');

    try {
      _socket = await _socketFactory(uri);
      _isConnected = true;

      _subscription = _socket!.stream.listen(
        _handleRawMessage,
        onError: (Object error) {
          debugPrint('RoomSocket error: $error');
          _eventController.add(RoomErrorEvent(error.toString()));
          _isConnected = false;
        },
        onDone: () {
          _isConnected = false;
          _pingTimer?.cancel();
        },
      );

      _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
        sendPing();
      });
    } catch (e) {
      _isConnected = false;
      _eventController.add(RoomErrorEvent(e.toString()));
      rethrow;
    }
  }

  void _handleRawMessage(dynamic raw) {
    try {
      final jsonMap = jsonDecode(raw as String) as Map<String, dynamic>;
      final type = jsonMap['type'] as String?;

      switch (type) {
        case 'chat':
          final msgData = jsonMap['message'] as Map<String, dynamic>?;
          if (msgData != null) {
            _eventController.add(RoomChatEvent(RoomChatMessageModel.fromJson(msgData)));
          }
          break;
        case 'reaction':
          _eventController.add(RoomReactionEvent(
            userId: (jsonMap['user_id'] as String?) ?? '',
            userName: (jsonMap['user_name'] as String?) ?? '',
            emoji: (jsonMap['emoji'] as String?) ?? '🔥',
          ));
          break;
        case 'sync_state':
          final watchData = jsonMap['watch_state'] as Map<String, dynamic>?;
          if (watchData != null) {
            _eventController.add(RoomSyncEvent(
              watchState: WatchStateModel.fromJson(watchData),
              triggeredBy: (jsonMap['triggered_by'] as String?) ?? '',
            ));
          }
          break;
        case 'user_joined':
          _eventController.add(RoomUserJoinedEvent(
            userId: (jsonMap['user_id'] as String?) ?? '',
            userName: (jsonMap['user_name'] as String?) ?? 'Viewer',
          ));
          break;
        case 'user_left':
          _eventController.add(RoomUserLeftEvent(
            userId: (jsonMap['user_id'] as String?) ?? '',
            userName: (jsonMap['user_name'] as String?) ?? 'Viewer',
          ));
          break;
        case 'error':
          _eventController.add(RoomErrorEvent(
            (jsonMap['detail'] as String?) ?? (jsonMap['message'] as String?) ?? 'Unknown error',
          ));
          break;
        default:
          break;
      }
    } catch (e) {
      debugPrint('Failed to parse incoming socket message: $e');
    }
  }

  void sendChatMessage(String text) {
    if (!_isConnected || _socket == null) return;
    final payload = jsonEncode({'type': 'chat', 'text': text});
    _socket!.add(payload);
  }

  void sendReaction(String emoji) {
    if (!_isConnected || _socket == null) return;
    final payload = jsonEncode({'type': 'reaction', 'emoji': emoji});
    _socket!.add(payload);
  }

  void sendSyncAction({
    required String action,
    double? positionSeconds,
    double? playbackRate,
    String? mediaUrl,
    String? mediaTitle,
  }) {
    if (!_isConnected || _socket == null) return;
    final payload = jsonEncode({
      'type': 'sync_action',
      'action': action,
      'position_seconds': ?positionSeconds,
      'playback_rate': ?playbackRate,
      'media_url': ?mediaUrl,
      'media_title': ?mediaTitle,
    });
    _socket!.add(payload);
  }

  void sendPing() {
    if (!_isConnected || _socket == null) return;
    _socket!.add(jsonEncode({'type': 'ping'}));
  }

  Future<void> disconnect() async {
    _pingTimer?.cancel();
    _pingTimer = null;
    await _subscription?.cancel();
    _subscription = null;
    if (_socket != null) {
      await _socket!.close();
      _socket = null;
    }
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _eventController.close();
  }
}

final roomSocketServiceProvider = Provider<RoomSocketService>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  final service = RoomSocketService(tokenStorage: tokenStorage);
  ref.onDispose(service.dispose);
  return service;
});
