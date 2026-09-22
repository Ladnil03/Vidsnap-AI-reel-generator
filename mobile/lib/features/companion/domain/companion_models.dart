import 'package:flutter/foundation.dart';

/// Supported user mood categories for personalization and recommendations.
enum MoodType {
  energized('energized', '⚡ Energized'),
  chill('chill', '🌿 Chill'),
  focused('focused', '🎯 Focused'),
  curious('curious', '🔍 Curious'),
  melancholic('melancholic', '🌧️ Melancholic'),
  inspired('inspired', '✨ Inspired'),
  humorous('humorous', '😂 Humorous');

  const MoodType(this.value, this.label);
  final String value;
  final String label;

  static MoodType fromString(String? value) {
    if (value == null) return MoodType.chill;
    return MoodType.values.firstWhere(
      (m) => m.value.toLowerCase() == value.toLowerCase(),
      orElse: () => MoodType.chill,
    );
  }
}

/// User's current mood state with consent gating.
@immutable
class MoodStateModel {
  const MoodStateModel({
    required this.userId,
    required this.mood,
    this.intensity = 1.0,
    this.consentGiven = true,
    this.note,
    this.updatedAt,
  });

  final String userId;
  final MoodType mood;
  final double intensity;
  final bool consentGiven;
  final String? note;
  final DateTime? updatedAt;

  factory MoodStateModel.fromJson(Map<String, dynamic> json) {
    return MoodStateModel(
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      mood: MoodType.fromString(json['mood']?.toString()),
      intensity: (json['intensity'] as num?)?.toDouble() ?? 1.0,
      consentGiven: (json['consent_given'] ?? json['consentGiven'] ?? true) as bool,
      note: json['note'] as String?,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'user_id': userId,
      'mood': mood.value,
      'intensity': intensity,
      'consent_given': consentGiven,
      if (note != null) 'note': note,
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }

  MoodStateModel copyWith({
    String? userId,
    MoodType? mood,
    double? intensity,
    bool? consentGiven,
    String? note,
    DateTime? updatedAt,
  }) {
    return MoodStateModel(
      userId: userId ?? this.userId,
      mood: mood ?? this.mood,
      intensity: intensity ?? this.intensity,
      consentGiven: consentGiven ?? this.consentGiven,
      note: note ?? this.note,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Individual message in personal AI companion conversation.
@immutable
class CompanionMessageModel {
  const CompanionMessageModel({
    required this.messageId,
    required this.role,
    required this.content,
    this.toolCalls,
    this.reels,
    this.timestamp,
  });

  final String messageId;
  final String role; // 'user', 'assistant', 'system', 'tool'
  final String content;
  final List<Map<String, dynamic>>? toolCalls;
  final List<Map<String, dynamic>>? reels;
  final DateTime? timestamp;

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';

  factory CompanionMessageModel.fromJson(Map<String, dynamic> json) {
    return CompanionMessageModel(
      messageId: (json['message_id'] ?? json['messageId'] ?? '').toString(),
      role: (json['role'] ?? 'assistant').toString(),
      content: (json['content'] ?? '').toString(),
      toolCalls: (json['tool_calls'] as List<dynamic>?)
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      reels: (json['reels'] as List<dynamic>?)
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'message_id': messageId,
      'role': role,
      'content': content,
      if (toolCalls != null) 'tool_calls': toolCalls,
      if (reels != null) 'reels': reels,
      if (timestamp != null) 'timestamp': timestamp!.toIso8601String(),
    };
  }
}

/// Companion response with synthesized text, embedded reels, and follow-up chips.
@immutable
class CompanionChatResponseModel {
  const CompanionChatResponseModel({
    required this.message,
    this.suggestedActions = const <String>[],
    this.activeMood,
  });

  final CompanionMessageModel message;
  final List<String> suggestedActions;
  final MoodType? activeMood;

  factory CompanionChatResponseModel.fromJson(Map<String, dynamic> json) {
    final msgJson = json['message'] is Map<String, dynamic>
        ? json['message'] as Map<String, dynamic>
        : <String, dynamic>{
            'message_id': 'gen_${DateTime.now().millisecondsSinceEpoch}',
            'role': 'assistant',
            'content': json['reply']?.toString() ?? '',
          };

    return CompanionChatResponseModel(
      message: CompanionMessageModel.fromJson(msgJson),
      suggestedActions: (json['suggested_actions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const <String>[],
      activeMood: json['active_mood'] != null
          ? MoodType.fromString(json['active_mood']?.toString())
          : null,
    );
  }
}
