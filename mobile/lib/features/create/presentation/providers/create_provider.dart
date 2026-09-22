import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/create/data/create_repository.dart';
import 'package:vidsnap_ai/features/create/domain/create_video_model.dart';

class CreateState {
  final String? pickedVideoPath;
  final double duration;
  final String title;
  final String description;
  final List<String> hashtags;
  final String visibility;
  final String? suggestedHook;
  final bool isGeneratingTags;
  final bool isUploading;
  final UploadProgressModel uploadProgress;
  final String? errorMessage;
  final bool isSuccess;
  final List<CreateVideoDraft> drafts;

  const CreateState({
    this.pickedVideoPath,
    this.duration = 0.0,
    this.title = '',
    this.description = '',
    this.hashtags = const <String>[],
    this.visibility = 'public',
    this.suggestedHook,
    this.isGeneratingTags = false,
    this.isUploading = false,
    this.uploadProgress = const UploadProgressModel(),
    this.errorMessage,
    this.isSuccess = false,
    this.drafts = const <CreateVideoDraft>[],
  });

  CreateState copyWith({
    String? pickedVideoPath,
    bool clearVideo = false,
    double? duration,
    String? title,
    String? description,
    List<String>? hashtags,
    String? visibility,
    String? suggestedHook,
    bool? isGeneratingTags,
    bool? isUploading,
    UploadProgressModel? uploadProgress,
    String? errorMessage,
    bool clearError = false,
    bool? isSuccess,
    List<CreateVideoDraft>? drafts,
  }) {
    return CreateState(
      pickedVideoPath: clearVideo ? null : (pickedVideoPath ?? this.pickedVideoPath),
      duration: duration ?? this.duration,
      title: title ?? this.title,
      description: description ?? this.description,
      hashtags: hashtags ?? this.hashtags,
      visibility: visibility ?? this.visibility,
      suggestedHook: suggestedHook ?? this.suggestedHook,
      isGeneratingTags: isGeneratingTags ?? this.isGeneratingTags,
      isUploading: isUploading ?? this.isUploading,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isSuccess: isSuccess ?? this.isSuccess,
      drafts: drafts ?? this.drafts,
    );
  }
}

class CreateNotifier extends Notifier<CreateState> {
  @override
  CreateState build() {
    final drafts = ref.read(createRepositoryProvider).getDrafts();
    return CreateState(drafts: drafts);
  }

  CreateRepository get _repository => ref.read(createRepositoryProvider);

  void refreshDrafts() {
    state = state.copyWith(drafts: _repository.getDrafts());
  }

  void setVideo(String path, {double duration = 0.0}) {
    state = state.copyWith(
      pickedVideoPath: path,
      duration: duration,
      clearError: true,
      isSuccess: false,
    );
  }

  void setTitle(String title) {
    state = state.copyWith(title: title, clearError: true);
  }

  void setDescription(String description) {
    state = state.copyWith(description: description, clearError: true);
  }

  void setVisibility(String visibility) {
    state = state.copyWith(visibility: visibility);
  }

  void addHashtag(String tag) {
    final clean = tag.trim().replaceAll('#', '');
    if (clean.isEmpty || state.hashtags.contains(clean)) return;
    state = state.copyWith(hashtags: <String>[...state.hashtags, clean]);
  }

  void removeHashtag(String tag) {
    final clean = tag.trim().replaceAll('#', '');
    state = state.copyWith(
      hashtags: state.hashtags.where((t) => t != clean).toList(),
    );
  }

  Future<void> generateAiTags() async {
    final title = state.title.trim();
    if (title.isEmpty) {
      state = state.copyWith(errorMessage: 'Please enter a title first to generate tags.');
      return;
    }

    state = state.copyWith(isGeneratingTags: true, clearError: true);

    try {
      final result = await _repository.suggestTags(
        title: title,
        transcript: state.description.isNotEmpty ? state.description : null,
      );

      final combined = Set<String>.from(state.hashtags)..addAll(result.hashtags);
      state = state.copyWith(
        hashtags: combined.toList(),
        suggestedHook: result.suggestedHook,
        isGeneratingTags: false,
      );
    } catch (e) {
      state = state.copyWith(
        isGeneratingTags: false,
        errorMessage: 'Could not generate AI tags. Please try again.',
      );
    }
  }

  Future<void> saveDraft() async {
    if (state.pickedVideoPath == null && state.title.isEmpty) return;

    final draft = CreateVideoDraft(
      draftId: DateTime.now().millisecondsSinceEpoch.toString(),
      videoPath: state.pickedVideoPath ?? '',
      title: state.title.isNotEmpty ? state.title : 'Untitled Draft',
      description: state.description,
      hashtags: state.hashtags,
      visibility: state.visibility,
      duration: state.duration,
      updatedAt: DateTime.now(),
    );

    await _repository.saveDraft(draft);
    refreshDrafts();
  }

  void loadDraft(CreateVideoDraft draft) {
    state = state.copyWith(
      pickedVideoPath: draft.videoPath.isNotEmpty ? draft.videoPath : null,
      title: draft.title,
      description: draft.description,
      hashtags: draft.hashtags,
      visibility: draft.visibility,
      duration: draft.duration,
      clearError: true,
      isSuccess: false,
    );
  }

  Future<void> deleteDraft(String draftId) async {
    await _repository.deleteDraft(draftId);
    refreshDrafts();
  }

  Future<bool> uploadVideo() async {
    if (state.pickedVideoPath == null || state.pickedVideoPath!.isEmpty) {
      state = state.copyWith(errorMessage: 'Please select or record a video first.');
      return false;
    }

    if (state.title.trim().isEmpty) {
      state = state.copyWith(errorMessage: 'Please enter a title for your reel.');
      return false;
    }

    state = state.copyWith(
      isUploading: true,
      clearError: true,
      uploadProgress: const UploadProgressModel(percentage: 0.0),
    );

    try {
      await _repository.uploadVideo(
        filePath: state.pickedVideoPath!,
        title: state.title.trim(),
        description: state.description.trim(),
        hashtags: state.hashtags,
        visibility: state.visibility,
        onSendProgress: (sent, total) {
          if (total > 0) {
            final pct = (sent / total) * 100;
            state = state.copyWith(
              uploadProgress: UploadProgressModel(
                bytesSent: sent,
                totalBytes: total,
                percentage: pct,
              ),
            );
          }
        },
      );

      state = state.copyWith(
        isUploading: false,
        isSuccess: true,
        uploadProgress: const UploadProgressModel(
          percentage: 100.0,
          isCompleted: true,
        ),
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isUploading: false,
        errorMessage: e.toString(),
        uploadProgress: UploadProgressModel(
          isFailed: true,
          errorMessage: e.toString(),
        ),
      );
      return false;
    }
  }

  void clear() {
    state = CreateState(drafts: _repository.getDrafts());
  }
}

final createProvider = NotifierProvider<CreateNotifier, CreateState>(CreateNotifier.new);
