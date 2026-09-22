class CommentModel {
  final String commentId;
  final String videoId;
  final String userId;
  final String userName;
  final String text;
  final DateTime createdAt;

  const CommentModel({
    required this.commentId,
    required this.videoId,
    required this.userId,
    required this.userName,
    required this.text,
    required this.createdAt,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    return CommentModel(
      commentId: (json['comment_id'] ?? json['id'] ?? '').toString(),
      videoId: (json['video_id'] ?? '').toString(),
      userId: (json['user_id'] ?? '').toString(),
      userName: (json['user_name'] ?? json['author_name'] ?? 'Viewer').toString(),
      text: (json['text'] ?? '').toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'comment_id': commentId,
      'video_id': videoId,
      'user_id': userId,
      'user_name': userName,
      'text': text,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
