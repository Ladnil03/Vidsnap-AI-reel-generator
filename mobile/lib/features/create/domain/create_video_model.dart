class CreateVideoDraft {
  final String draftId;
  final String videoPath;
  final String title;
  final String description;
  final List<String> hashtags;
  final String visibility;
  final double duration;
  final DateTime updatedAt;

  const CreateVideoDraft({
    required this.draftId,
    required this.videoPath,
    required this.title,
    this.description = '',
    this.hashtags = const <String>[],
    this.visibility = 'public',
    this.duration = 0.0,
    required this.updatedAt,
  });

  factory CreateVideoDraft.fromJson(Map<String, dynamic> json) {
    return CreateVideoDraft(
      draftId: (json['draft_id'] ?? '').toString(),
      videoPath: (json['video_path'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      hashtags:
          (json['hashtags'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const <String>[],
      visibility: (json['visibility'] ?? 'public').toString(),
      duration: ((json['duration'] ?? 0.0) as num).toDouble(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'draft_id': draftId,
      'video_path': videoPath,
      'title': title,
      'description': description,
      'hashtags': hashtags,
      'visibility': visibility,
      'duration': duration,
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  CreateVideoDraft copyWith({
    String? draftId,
    String? videoPath,
    String? title,
    String? description,
    List<String>? hashtags,
    String? visibility,
    double? duration,
    DateTime? updatedAt,
  }) {
    return CreateVideoDraft(
      draftId: draftId ?? this.draftId,
      videoPath: videoPath ?? this.videoPath,
      title: title ?? this.title,
      description: description ?? this.description,
      hashtags: hashtags ?? this.hashtags,
      visibility: visibility ?? this.visibility,
      duration: duration ?? this.duration,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class HashtagSuggestionResponseModel {
  final List<String> hashtags;
  final String suggestedHook;

  const HashtagSuggestionResponseModel({
    required this.hashtags,
    required this.suggestedHook,
  });

  factory HashtagSuggestionResponseModel.fromJson(Map<String, dynamic> json) {
    final rawTags = json['hashtags'] as List<dynamic>? ?? const <dynamic>[];
    return HashtagSuggestionResponseModel(
      hashtags: rawTags.map((e) => e.toString()).toList(),
      suggestedHook: (json['suggested_hook'] ?? '').toString(),
    );
  }
}

class UploadProgressModel {
  final int bytesSent;
  final int totalBytes;
  final double percentage;
  final bool isCompleted;
  final bool isFailed;
  final String? errorMessage;

  const UploadProgressModel({
    this.bytesSent = 0,
    this.totalBytes = 0,
    this.percentage = 0.0,
    this.isCompleted = false,
    this.isFailed = false,
    this.errorMessage,
  });

  UploadProgressModel copyWith({
    int? bytesSent,
    int? totalBytes,
    double? percentage,
    bool? isCompleted,
    bool? isFailed,
    String? errorMessage,
  }) {
    return UploadProgressModel(
      bytesSent: bytesSent ?? this.bytesSent,
      totalBytes: totalBytes ?? this.totalBytes,
      percentage: percentage ?? this.percentage,
      isCompleted: isCompleted ?? this.isCompleted,
      isFailed: isFailed ?? this.isFailed,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}
