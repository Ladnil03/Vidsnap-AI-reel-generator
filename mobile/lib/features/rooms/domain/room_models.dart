enum RoomType {
  public,
  private,
}

enum PlaybackAction {
  play,
  pause,
  seek,
  changeMedia,
  setRate,
}

class WatchStateModel {
  const WatchStateModel({
    required this.mediaUrl,
    required this.mediaTitle,
    required this.mediaType,
    required this.state,
    required this.positionSeconds,
    required this.playbackRate,
    required this.lastUpdatedAt,
    this.updatedByUserId,
  });

  final String mediaUrl;
  final String mediaTitle;
  final String mediaType;
  final String state; // 'playing', 'paused', 'buffering'
  final double positionSeconds;
  final double playbackRate;
  final DateTime lastUpdatedAt;
  final String? updatedByUserId;

  bool get isPlaying => state == 'playing';

  factory WatchStateModel.fromJson(Map<String, dynamic> json) {
    return WatchStateModel(
      mediaUrl: (json['media_url'] as String?) ?? '',
      mediaTitle: (json['media_title'] as String?) ?? 'No video selected',
      mediaType: (json['media_type'] as String?) ?? 'native',
      state: (json['state'] as String?) ?? 'paused',
      positionSeconds: (json['position_seconds'] as num?)?.toDouble() ?? 0.0,
      playbackRate: (json['playback_rate'] as num?)?.toDouble() ?? 1.0,
      lastUpdatedAt: json['last_updated_at'] != null
          ? DateTime.tryParse(json['last_updated_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      updatedByUserId: json['updated_by_user_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'media_url': mediaUrl,
        'media_title': mediaTitle,
        'media_type': mediaType,
        'state': state,
        'position_seconds': positionSeconds,
        'playback_rate': playbackRate,
        'last_updated_at': lastUpdatedAt.toIso8601String(),
        'updated_by_user_id': updatedByUserId,
      };

  WatchStateModel copyWith({
    String? mediaUrl,
    String? mediaTitle,
    String? mediaType,
    String? state,
    double? positionSeconds,
    double? playbackRate,
    DateTime? lastUpdatedAt,
    String? updatedByUserId,
  }) {
    return WatchStateModel(
      mediaUrl: mediaUrl ?? this.mediaUrl,
      mediaTitle: mediaTitle ?? this.mediaTitle,
      mediaType: mediaType ?? this.mediaType,
      state: state ?? this.state,
      positionSeconds: positionSeconds ?? this.positionSeconds,
      playbackRate: playbackRate ?? this.playbackRate,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      updatedByUserId: updatedByUserId ?? this.updatedByUserId,
    );
  }
}

class RoomParticipantModel {
  const RoomParticipantModel({
    required this.userId,
    required this.name,
    this.avatarUrl,
    this.isHost = false,
    required this.joinedAt,
    required this.lastSeenAt,
  });

  final String userId;
  final String name;
  final String? avatarUrl;
  final bool isHost;
  final DateTime joinedAt;
  final DateTime lastSeenAt;

  factory RoomParticipantModel.fromJson(Map<String, dynamic> json) {
    return RoomParticipantModel(
      userId: (json['user_id'] as String?) ?? '',
      name: (json['name'] as String?) ?? 'Viewer',
      avatarUrl: json['avatar_url'] as String?,
      isHost: (json['is_host'] as bool?) ?? false,
      joinedAt: json['joined_at'] != null
          ? DateTime.tryParse(json['joined_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      lastSeenAt: json['last_seen_at'] != null
          ? DateTime.tryParse(json['last_seen_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'user_id': userId,
        'name': name,
        'avatar_url': avatarUrl,
        'is_host': isHost,
        'joined_at': joinedAt.toIso8601String(),
        'last_seen_at': lastSeenAt.toIso8601String(),
      };
}

class RoomModel {
  const RoomModel({
    required this.roomId,
    required this.name,
    required this.description,
    required this.roomType,
    required this.controlMode,
    required this.hostId,
    required this.hostName,
    required this.watchState,
    required this.participantCount,
    this.participants = const [],
    required this.createdAt,
  });

  final String roomId;
  final String name;
  final String description;
  final String roomType; // 'public' | 'private'
  final String controlMode; // 'host_only' | 'democratic'
  final String hostId;
  final String hostName;
  final WatchStateModel watchState;
  final int participantCount;
  final List<RoomParticipantModel> participants;
  final DateTime createdAt;

  bool get isPrivate => roomType == 'private';
  bool get hasPasscode => isPrivate;

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    final rawParticipants = json['participants'] as List<dynamic>? ?? [];
    return RoomModel(
      roomId: (json['room_id'] as String?) ?? '',
      name: (json['name'] as String?) ?? 'Watch Party',
      description: (json['description'] as String?) ?? '',
      roomType: (json['room_type'] as String?) ?? 'public',
      controlMode: (json['control_mode'] as String?) ?? 'host_only',
      hostId: (json['host_id'] as String?) ?? '',
      hostName: (json['host_name'] as String?) ?? 'Host',
      watchState: json['watch_state'] != null
          ? WatchStateModel.fromJson(json['watch_state'] as Map<String, dynamic>)
          : WatchStateModel(
              mediaUrl: '',
              mediaTitle: '',
              mediaType: 'native',
              state: 'paused',
              positionSeconds: 0,
              playbackRate: 1,
              lastUpdatedAt: DateTime.now(),
            ),
      participantCount: (json['participant_count'] as num?)?.toInt() ?? 0,
      participants: rawParticipants
          .whereType<Map<String, dynamic>>()
          .map(RoomParticipantModel.fromJson)
          .toList(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'room_id': roomId,
        'name': name,
        'description': description,
        'room_type': roomType,
        'control_mode': controlMode,
        'host_id': hostId,
        'host_name': hostName,
        'watch_state': watchState.toJson(),
        'participant_count': participantCount,
        'participants': participants.map((p) => p.toJson()).toList(),
        'created_at': createdAt.toIso8601String(),
      };

  RoomModel copyWith({
    String? roomId,
    String? name,
    String? description,
    String? roomType,
    String? controlMode,
    String? hostId,
    String? hostName,
    WatchStateModel? watchState,
    int? participantCount,
    List<RoomParticipantModel>? participants,
    DateTime? createdAt,
  }) {
    return RoomModel(
      roomId: roomId ?? this.roomId,
      name: name ?? this.name,
      description: description ?? this.description,
      roomType: roomType ?? this.roomType,
      controlMode: controlMode ?? this.controlMode,
      hostId: hostId ?? this.hostId,
      hostName: hostName ?? this.hostName,
      watchState: watchState ?? this.watchState,
      participantCount: participantCount ?? this.participantCount,
      participants: participants ?? this.participants,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class RoomChatMessageModel {
  const RoomChatMessageModel({
    required this.messageId,
    required this.roomId,
    required this.userId,
    required this.userName,
    this.avatarUrl,
    required this.text,
    required this.createdAt,
    this.isSystem = false,
    this.isAssistant = false,
  });

  final String messageId;
  final String roomId;
  final String userId;
  final String userName;
  final String? avatarUrl;
  final String text;
  final DateTime createdAt;
  final bool isSystem;
  final bool isAssistant;

  factory RoomChatMessageModel.fromJson(Map<String, dynamic> json) {
    return RoomChatMessageModel(
      messageId: (json['message_id'] as String?) ?? '',
      roomId: (json['room_id'] as String?) ?? '',
      userId: (json['user_id'] as String?) ?? '',
      userName: (json['user_name'] as String?) ?? 'Viewer',
      avatarUrl: json['avatar_url'] as String?,
      text: (json['text'] as String?) ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      isSystem: (json['is_system'] as bool?) ?? false,
      isAssistant: (json['is_assistant'] as bool?) ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'message_id': messageId,
        'room_id': roomId,
        'user_id': userId,
        'user_name': userName,
        'avatar_url': avatarUrl,
        'text': text,
        'created_at': createdAt.toIso8601String(),
        'is_system': isSystem,
        'is_assistant': isAssistant,
      };
}

class LiveKitCredentialsModel {
  const LiveKitCredentialsModel({
    required this.token,
    required this.serverUrl,
    required this.roomName,
  });

  final String token;
  final String serverUrl;
  final String roomName;

  factory LiveKitCredentialsModel.fromJson(Map<String, dynamic> json) {
    return LiveKitCredentialsModel(
      token: (json['token'] as String?) ?? '',
      serverUrl: (json['server_url'] as String?) ?? '',
      roomName: (json['room_name'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'server_url': serverUrl,
        'room_name': roomName,
      };
}

class RoomSummaryModel {
  const RoomSummaryModel({
    required this.roomId,
    required this.summary,
    required this.highlights,
    required this.generatedAt,
  });

  final String roomId;
  final String summary;
  final List<String> highlights;
  final DateTime generatedAt;

  factory RoomSummaryModel.fromJson(Map<String, dynamic> json) {
    final rawHighlights = json['highlights'] as List<dynamic>? ?? [];
    return RoomSummaryModel(
      roomId: (json['room_id'] as String?) ?? '',
      summary: (json['summary'] as String?) ?? '',
      highlights: rawHighlights.map((e) => e.toString()).toList(),
      generatedAt: json['generated_at'] != null
          ? DateTime.tryParse(json['generated_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'room_id': roomId,
        'summary': summary,
        'highlights': highlights,
        'generated_at': generatedAt.toIso8601String(),
      };
}

class CommunityModel {
  const CommunityModel({
    required this.communityId,
    required this.name,
    required this.slug,
    required this.description,
    required this.category,
    this.avatarUrl,
    this.bannerUrl,
    required this.creatorId,
    required this.membersCount,
    this.isMember = false,
    this.role,
    required this.createdAt,
  });

  final String communityId;
  final String name;
  final String slug;
  final String description;
  final String category;
  final String? avatarUrl;
  final String? bannerUrl;
  final String creatorId;
  final int membersCount;
  final bool isMember;
  final String? role;
  final DateTime createdAt;

  factory CommunityModel.fromJson(Map<String, dynamic> json) {
    return CommunityModel(
      communityId: (json['community_id'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      slug: (json['slug'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      category: (json['category'] as String?) ?? 'general',
      avatarUrl: json['avatar_url'] as String?,
      bannerUrl: json['banner_url'] as String?,
      creatorId: (json['creator_id'] as String?) ?? '',
      membersCount: (json['members_count'] as num?)?.toInt() ?? 0,
      isMember: (json['is_member'] as bool?) ?? false,
      role: json['role'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'community_id': communityId,
        'name': name,
        'slug': slug,
        'description': description,
        'category': category,
        'avatar_url': avatarUrl,
        'banner_url': bannerUrl,
        'creator_id': creatorId,
        'members_count': membersCount,
        'is_member': isMember,
        'role': role,
        'created_at': createdAt.toIso8601String(),
      };

  CommunityModel copyWith({
    String? communityId,
    String? name,
    String? slug,
    String? description,
    String? category,
    String? avatarUrl,
    String? bannerUrl,
    String? creatorId,
    int? membersCount,
    bool? isMember,
    String? role,
    DateTime? createdAt,
  }) {
    return CommunityModel(
      communityId: communityId ?? this.communityId,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      category: category ?? this.category,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bannerUrl: bannerUrl ?? this.bannerUrl,
      creatorId: creatorId ?? this.creatorId,
      membersCount: membersCount ?? this.membersCount,
      isMember: isMember ?? this.isMember,
      role: role ?? this.role,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class FollowStatusModel {
  const FollowStatusModel({
    required this.targetUserId,
    required this.isFollowing,
    required this.isFriend,
    required this.followersCount,
    required this.followingCount,
  });

  final String targetUserId;
  final bool isFollowing;
  final bool isFriend;
  final int followersCount;
  final int followingCount;

  factory FollowStatusModel.fromJson(Map<String, dynamic> json) {
    return FollowStatusModel(
      targetUserId: (json['target_user_id'] as String?) ?? '',
      isFollowing: (json['is_following'] as bool?) ?? false,
      isFriend: (json['is_friend'] as bool?) ?? false,
      followersCount: (json['followers_count'] as num?)?.toInt() ?? 0,
      followingCount: (json['following_count'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'target_user_id': targetUserId,
        'is_following': isFollowing,
        'is_friend': isFriend,
        'followers_count': followersCount,
        'following_count': followingCount,
      };
}
