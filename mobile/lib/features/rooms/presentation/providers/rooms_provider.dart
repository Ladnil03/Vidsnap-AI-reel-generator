import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/rooms/data/room_socket_service.dart';
import 'package:vidsnap_ai/features/rooms/data/rooms_repository.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';

// -------------------------------------------------------------
// Rooms Lobby State & Notifier
// -------------------------------------------------------------

class RoomsLobbyState {
  const RoomsLobbyState({
    this.rooms = const [],
    this.isLoading = false,
    this.errorMessage,
    this.searchQuery = '',
    this.selectedFilter = 'all',
    this.isCreating = false,
  });

  final List<RoomModel> rooms;
  final bool isLoading;
  final String? errorMessage;
  final String searchQuery;
  final String selectedFilter;
  final bool isCreating;

  RoomsLobbyState copyWith({
    List<RoomModel>? rooms,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    String? searchQuery,
    String? selectedFilter,
    bool? isCreating,
  }) {
    return RoomsLobbyState(
      rooms: rooms ?? this.rooms,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      searchQuery: searchQuery ?? this.searchQuery,
      selectedFilter: selectedFilter ?? this.selectedFilter,
      isCreating: isCreating ?? this.isCreating,
    );
  }
}

class RoomsLobbyNotifier extends Notifier<RoomsLobbyState> {
  @override
  RoomsLobbyState build() {
    Future.microtask(() => loadRooms());
    return const RoomsLobbyState(isLoading: true);
  }

  RoomsRepository get _repository => ref.read(roomsRepositoryProvider);

  Future<void> loadRooms() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final roomType = state.selectedFilter == 'all'
          ? null
          : state.selectedFilter;
      final rooms = await _repository.listRooms(
        search: state.searchQuery.isEmpty ? null : state.searchQuery,
        roomType: roomType,
      );
      state = state.copyWith(rooms: rooms, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    loadRooms();
  }

  void setFilter(String filter) {
    state = state.copyWith(selectedFilter: filter);
    loadRooms();
  }

  Future<RoomModel?> createRoom({
    required String name,
    String description = '',
    String roomType = 'public',
    String? passcode,
    String controlMode = 'host_only',
    String? initialMediaUrl,
    String? initialMediaTitle,
  }) async {
    state = state.copyWith(isCreating: true, clearError: true);
    try {
      final room = await _repository.createRoom(
        name: name,
        description: description,
        roomType: roomType,
        passcode: passcode,
        controlMode: controlMode,
        initialMediaUrl: initialMediaUrl,
        initialMediaTitle: initialMediaTitle,
      );
      state = state.copyWith(isCreating: false);
      await loadRooms();
      return room;
    } catch (e) {
      state = state.copyWith(isCreating: false, errorMessage: e.toString());
      return null;
    }
  }
}

final roomsLobbyProvider =
    NotifierProvider<RoomsLobbyNotifier, RoomsLobbyState>(
      RoomsLobbyNotifier.new,
    );

// -------------------------------------------------------------
// Active Room State & Notifier
// -------------------------------------------------------------

class ActiveRoomState {
  const ActiveRoomState({
    this.room,
    this.watchState,
    this.messages = const [],
    this.participants = const [],
    this.recentReaction,
    this.rtcCredentials,
    this.summary,
    this.isLoading = false,
    this.isConnectingSocket = false,
    this.isSummarizing = false,
    this.errorMessage,
  });

  final RoomModel? room;
  final WatchStateModel? watchState;
  final List<RoomChatMessageModel> messages;
  final List<RoomParticipantModel> participants;
  final String? recentReaction;
  final LiveKitCredentialsModel? rtcCredentials;
  final RoomSummaryModel? summary;
  final bool isLoading;
  final bool isConnectingSocket;
  final bool isSummarizing;
  final String? errorMessage;

  ActiveRoomState copyWith({
    RoomModel? room,
    WatchStateModel? watchState,
    List<RoomChatMessageModel>? messages,
    List<RoomParticipantModel>? participants,
    String? recentReaction,
    bool clearReaction = false,
    LiveKitCredentialsModel? rtcCredentials,
    RoomSummaryModel? summary,
    bool clearSummary = false,
    bool? isLoading,
    bool? isConnectingSocket,
    bool? isSummarizing,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ActiveRoomState(
      room: room ?? this.room,
      watchState: watchState ?? this.watchState,
      messages: messages ?? this.messages,
      participants: participants ?? this.participants,
      recentReaction: clearReaction
          ? null
          : (recentReaction ?? this.recentReaction),
      rtcCredentials: rtcCredentials ?? this.rtcCredentials,
      summary: clearSummary ? null : (summary ?? this.summary),
      isLoading: isLoading ?? this.isLoading,
      isConnectingSocket: isConnectingSocket ?? this.isConnectingSocket,
      isSummarizing: isSummarizing ?? this.isSummarizing,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class ActiveRoomNotifier extends Notifier<ActiveRoomState> {
  StreamSubscription<RoomSocketEvent>? _socketSubscription;

  @override
  ActiveRoomState build() {
    final socket = ref.read(roomSocketServiceProvider);
    ref.onDispose(() {
      _socketSubscription?.cancel();
      socket.disconnect();
    });
    return const ActiveRoomState();
  }

  RoomsRepository get _repository => ref.read(roomsRepositoryProvider);
  RoomSocketService get _socketService => ref.read(roomSocketServiceProvider);

  Future<void> joinRoom(String roomId, {String? passcode}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final room = await _repository.joinRoom(roomId, passcode: passcode);
      final messages = await _repository.getChatHistory(roomId);

      state = state.copyWith(
        room: room,
        watchState: room.watchState,
        participants: room.participants,
        messages: messages,
        isLoading: false,
        isConnectingSocket: true,
      );

      // Connect WebSocket
      try {
        await _socketService.connect(roomId);
        _listenToSocket();
        state = state.copyWith(isConnectingSocket: false);
      } catch (wsErr) {
        state = state.copyWith(
          isConnectingSocket: false,
          errorMessage:
              'Realtime socket connection failed; falling back to REST: $wsErr',
        );
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  void _listenToSocket() {
    _socketSubscription?.cancel();
    _socketSubscription = _socketService.events.listen((event) {
      switch (event) {
        case RoomChatEvent(:final message):
          state = state.copyWith(messages: [...state.messages, message]);
        case RoomReactionEvent(:final emoji):
          state = state.copyWith(recentReaction: emoji);
          Future.delayed(const Duration(seconds: 3), () {
            if (state.recentReaction == emoji) {
              state = state.copyWith(clearReaction: true);
            }
          });
        case RoomSyncEvent(:final watchState):
          state = state.copyWith(watchState: watchState);
        case RoomUserJoinedEvent(:final userId, :final userName):
          if (!state.participants.any((p) => p.userId == userId)) {
            final newParticipant = RoomParticipantModel(
              userId: userId,
              name: userName,
              joinedAt: DateTime.now(),
              lastSeenAt: DateTime.now(),
            );
            state = state.copyWith(
              participants: [...state.participants, newParticipant],
            );
          }
        case RoomUserLeftEvent(:final userId):
          state = state.copyWith(
            participants: state.participants
                .where((p) => p.userId != userId)
                .toList(),
          );
        case RoomErrorEvent(:final message):
          state = state.copyWith(errorMessage: message);
      }
    });
  }

  void sendChatMessage(String text) {
    if (text.trim().isEmpty) return;
    if (_socketService.isConnected) {
      _socketService.sendChatMessage(text.trim());
    } else if (state.room != null) {
      // Local optimistic append when socket disconnected
      final tempMsg = RoomChatMessageModel(
        messageId: DateTime.now().millisecondsSinceEpoch.toString(),
        roomId: state.room!.roomId,
        userId: 'self',
        userName: 'You',
        text: text.trim(),
        createdAt: DateTime.now(),
      );
      state = state.copyWith(messages: [...state.messages, tempMsg]);
    }
  }

  void sendReaction(String emoji) {
    if (_socketService.isConnected) {
      _socketService.sendReaction(emoji);
    }
    state = state.copyWith(recentReaction: emoji);
    Future.delayed(const Duration(seconds: 3), () {
      if (state.recentReaction == emoji) {
        state = state.copyWith(clearReaction: true);
      }
    });
  }

  Future<void> syncPlayback({
    required String action,
    double? positionSeconds,
    double? playbackRate,
    String? mediaUrl,
    String? mediaTitle,
  }) async {
    final roomId = state.room?.roomId;
    if (roomId == null) return;

    if (_socketService.isConnected) {
      _socketService.sendSyncAction(
        action: action,
        positionSeconds: positionSeconds,
        playbackRate: playbackRate,
        mediaUrl: mediaUrl,
        mediaTitle: mediaTitle,
      );
    } else {
      // REST fallback
      try {
        final updated = await _repository.syncPlayback(
          roomId,
          action: action,
          positionSeconds: positionSeconds,
          playbackRate: playbackRate,
          mediaUrl: mediaUrl,
          mediaTitle: mediaTitle,
        );
        state = state.copyWith(watchState: updated);
      } catch (e) {
        state = state.copyWith(errorMessage: e.toString());
      }
    }
  }

  Future<void> fetchRtcToken() async {
    final roomId = state.room?.roomId;
    if (roomId == null) return;
    try {
      final creds = await _repository.getRtcToken(roomId);
      state = state.copyWith(rtcCredentials: creds);
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'Failed to obtain LiveKit RTC token: $e',
      );
    }
  }

  Future<void> fetchAiRecap() async {
    final roomId = state.room?.roomId;
    if (roomId == null) return;
    state = state.copyWith(isSummarizing: true, clearError: true);
    try {
      final summary = await _repository.getRoomRecap(roomId);
      state = state.copyWith(summary: summary, isSummarizing: false);
    } catch (e) {
      state = state.copyWith(
        isSummarizing: false,
        errorMessage: 'Failed to generate AI recap: $e',
      );
    }
  }

  Future<void> leaveRoom() async {
    final roomId = state.room?.roomId;
    await _socketSubscription?.cancel();
    _socketSubscription = null;
    await _socketService.disconnect();
    if (roomId != null) {
      try {
        await _repository.leaveRoom(roomId);
      } catch (_) {}
    }
    state = const ActiveRoomState();
  }
}

final activeRoomProvider =
    NotifierProvider<ActiveRoomNotifier, ActiveRoomState>(
      ActiveRoomNotifier.new,
    );
