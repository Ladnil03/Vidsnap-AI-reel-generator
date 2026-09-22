enum FeedTab {
  trending('trending', 'Trending'),
  following('following', 'Following'),
  friends('friends', 'Friends'),
  saved('saved', 'Saved'),
  forYou('for_you', 'For You');

  final String value;
  final String label;
  const FeedTab(this.value, this.label);

  static FeedTab fromValue(String value) {
    return FeedTab.values.firstWhere(
      (e) => e.value == value,
      orElse: () => FeedTab.trending,
    );
  }
}

class FeedItemModel {
  final String videoId;
  final String userId;
  final String authorName;
  final String title;
  final String description;
  final List<String> hashtags;
  final String videoUrl;
  final String? thumbnailUrl;
  final double duration;
  final int likesCount;
  final int savesCount;
  final int commentsCount;
  final int viewsCount;
  final bool hasLiked;
  final bool hasSaved;
  final String? explainabilityTag;
  final String? attributionText;
  final String? externalSourceUrl;
  final DateTime createdAt;

  const FeedItemModel({
    required this.videoId,
    required this.userId,
    required this.authorName,
    required this.title,
    required this.description,
    required this.hashtags,
    required this.videoUrl,
    this.thumbnailUrl,
    required this.duration,
    this.likesCount = 0,
    this.savesCount = 0,
    this.commentsCount = 0,
    this.viewsCount = 0,
    this.hasLiked = false,
    this.hasSaved = false,
    this.explainabilityTag,
    this.attributionText,
    this.externalSourceUrl,
    required this.createdAt,
  });

  factory FeedItemModel.fromJson(Map<String, dynamic> json) {
    return FeedItemModel(
      videoId: (json['video_id'] ?? json['id'] ?? '').toString(),
      userId: (json['user_id'] ?? json['author_id'] ?? 'creator').toString(),
      authorName: (json['author_name'] ?? 'Creator').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      hashtags:
          (json['hashtags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          const <String>[],
      videoUrl: (json['video_url'] ?? json['embed_url'] ?? '').toString(),
      thumbnailUrl: json['thumbnail_url']?.toString(),
      duration: ((json['duration'] ?? 0.0) as num).toDouble(),
      likesCount: (json['likes_count'] as num?)?.toInt() ?? 0,
      savesCount: (json['saves_count'] as num?)?.toInt() ?? 0,
      commentsCount: (json['comments_count'] as num?)?.toInt() ?? 0,
      viewsCount: (json['views_count'] as num?)?.toInt() ?? 0,
      hasLiked: json['has_liked'] == true,
      hasSaved: json['has_saved'] == true,
      explainabilityTag: json['explainability_tag']?.toString(),
      attributionText: json['attribution_text']?.toString(),
      externalSourceUrl:
          json['source_url']?.toString() ??
          json['external_source_url']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'video_id': videoId,
      'user_id': userId,
      'author_name': authorName,
      'title': title,
      'description': description,
      'hashtags': hashtags,
      'video_url': videoUrl,
      'thumbnail_url': thumbnailUrl,
      'duration': duration,
      'likes_count': likesCount,
      'saves_count': savesCount,
      'comments_count': commentsCount,
      'views_count': viewsCount,
      'has_liked': hasLiked,
      'has_saved': hasSaved,
      'explainability_tag': explainabilityTag,
      'attribution_text': attributionText,
      'external_source_url': externalSourceUrl,
      'created_at': createdAt.toIso8601String(),
    };
  }

  FeedItemModel copyWith({
    String? videoId,
    String? userId,
    String? authorName,
    String? title,
    String? description,
    List<String>? hashtags,
    String? videoUrl,
    String? thumbnailUrl,
    double? duration,
    int? likesCount,
    int? savesCount,
    int? commentsCount,
    int? viewsCount,
    bool? hasLiked,
    bool? hasSaved,
    String? explainabilityTag,
    String? attributionText,
    String? externalSourceUrl,
    DateTime? createdAt,
  }) {
    return FeedItemModel(
      videoId: videoId ?? this.videoId,
      userId: userId ?? this.userId,
      authorName: authorName ?? this.authorName,
      title: title ?? this.title,
      description: description ?? this.description,
      hashtags: hashtags ?? this.hashtags,
      videoUrl: videoUrl ?? this.videoUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      duration: duration ?? this.duration,
      likesCount: likesCount ?? this.likesCount,
      savesCount: savesCount ?? this.savesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      viewsCount: viewsCount ?? this.viewsCount,
      hasLiked: hasLiked ?? this.hasLiked,
      hasSaved: hasSaved ?? this.hasSaved,
      explainabilityTag: explainabilityTag ?? this.explainabilityTag,
      attributionText: attributionText ?? this.attributionText,
      externalSourceUrl: externalSourceUrl ?? this.externalSourceUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class WatchProgressRequestModel {
  final String videoId;
  final double watchedSeconds;
  final double totalSeconds;
  final bool completed;

  const WatchProgressRequestModel({
    required this.videoId,
    required this.watchedSeconds,
    required this.totalSeconds,
    this.completed = false,
  });

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'video_id': videoId,
      'watched_seconds': watchedSeconds,
      'total_seconds': totalSeconds,
      'completed': completed,
    };
  }
}

class WatchProgressModel {
  final String videoId;
  final double watchedSeconds;
  final double totalSeconds;
  final double percentage;
  final bool completed;
  final DateTime updatedAt;

  const WatchProgressModel({
    required this.videoId,
    required this.watchedSeconds,
    required this.totalSeconds,
    required this.percentage,
    required this.completed,
    required this.updatedAt,
  });

  factory WatchProgressModel.fromJson(Map<String, dynamic> json) {
    return WatchProgressModel(
      videoId: (json['video_id'] ?? '').toString(),
      watchedSeconds: ((json['watched_seconds'] ?? 0.0) as num).toDouble(),
      totalSeconds: ((json['total_seconds'] ?? 0.0) as num).toDouble(),
      percentage: ((json['percentage'] ?? 0.0) as num).toDouble(),
      completed: json['completed'] == true,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
