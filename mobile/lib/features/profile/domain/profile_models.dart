import 'package:flutter/foundation.dart';

/// Aggregated user & creator profile model with social metrics and role flags.
@immutable
class UserProfileModel {
  const UserProfileModel({
    required this.userId,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.bio = '',
    this.followersCount = 0,
    this.followingCount = 0,
    this.reelsCount = 0,
    this.tokensRemaining = 0,
    this.isFollowing = false,
    this.isFriend = false,
    this.roles = const <String>['user'],
    this.timezone = 'UTC',
    this.createdAt,
  });

  final String userId;
  final String name;
  final String email;
  final String? avatarUrl;
  final String bio;
  final int followersCount;
  final int followingCount;
  final int reelsCount;
  final int tokensRemaining;
  final bool isFollowing;
  final bool isFriend;
  final List<String> roles;
  final String timezone;
  final DateTime? createdAt;

  bool get isCreator => roles.contains('creator');
  bool get isBusiness => roles.contains('business');
  bool get isAdmin => roles.contains('admin');

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      avatarUrl: json['avatar_url']?.toString(),
      bio: (json['bio'] ?? '').toString(),
      followersCount:
          (json['followers_count'] ?? json['followersCount'] ?? 0) as int,
      followingCount:
          (json['following_count'] ?? json['followingCount'] ?? 0) as int,
      reelsCount: (json['reels_count'] ?? json['reelsCount'] ?? 0) as int,
      tokensRemaining:
          (json['tokens_remaining'] ?? json['tokensRemaining'] ?? 0) as int,
      isFollowing:
          (json['is_following'] ?? json['isFollowing'] ?? false) as bool,
      isFriend: (json['is_friend'] ?? json['isFriend'] ?? false) as bool,
      roles: (json['roles'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const <String>['user'],
      timezone: (json['timezone'] ?? 'UTC').toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'user_id': userId,
      'name': name,
      'email': email,
      'avatar_url': ?avatarUrl,
      'bio': bio,
      'followers_count': followersCount,
      'following_count': followingCount,
      'reels_count': reelsCount,
      'tokens_remaining': tokensRemaining,
      'is_following': isFollowing,
      'is_friend': isFriend,
      'roles': roles,
      'timezone': timezone,
      'created_at': ?createdAt?.toIso8601String(),
    };
  }

  UserProfileModel copyWith({
    String? userId,
    String? name,
    String? email,
    String? avatarUrl,
    String? bio,
    int? followersCount,
    int? followingCount,
    int? reelsCount,
    int? tokensRemaining,
    bool? isFollowing,
    bool? isFriend,
    List<String>? roles,
    String? timezone,
    DateTime? createdAt,
  }) {
    return UserProfileModel(
      userId: userId ?? this.userId,
      name: name ?? this.name,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      reelsCount: reelsCount ?? this.reelsCount,
      tokensRemaining: tokensRemaining ?? this.tokensRemaining,
      isFollowing: isFollowing ?? this.isFollowing,
      isFriend: isFriend ?? this.isFriend,
      roles: roles ?? this.roles,
      timezone: timezone ?? this.timezone,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Input payload for editing personal profile.
@immutable
class UpdateProfileInput {
  const UpdateProfileInput({
    this.name,
    this.bio,
    this.timezone,
  });

  final String? name;
  final String? bio;
  final String? timezone;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': ?name,
      'bio': ?bio,
      'timezone': ?timezone,
    };
  }
}
