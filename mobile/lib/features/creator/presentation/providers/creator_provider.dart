import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/creator/data/creator_repository.dart';
import 'package:vidsnap_ai/features/creator/domain/creator_models.dart';

@immutable
class CreatorState {
  const CreatorState({
    this.profile,
    this.analytics,
    this.copilot,
    this.periodDays = 30,
    this.isLoading = false,
    this.isGeneratingCopilot = false,
    this.isApplyingVerification = false,
    this.verificationSuccess = false,
    this.errorMessage,
  });

  final CreatorProfileModel? profile;
  final CreatorAnalyticsModel? analytics;
  final CreatorCopilotResponseModel? copilot;
  final int periodDays;
  final bool isLoading;
  final bool isGeneratingCopilot;
  final bool isApplyingVerification;
  final bool verificationSuccess;
  final String? errorMessage;

  CreatorState copyWith({
    CreatorProfileModel? profile,
    CreatorAnalyticsModel? analytics,
    CreatorCopilotResponseModel? copilot,
    int? periodDays,
    bool? isLoading,
    bool? isGeneratingCopilot,
    bool? isApplyingVerification,
    bool? verificationSuccess,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CreatorState(
      profile: profile ?? this.profile,
      analytics: analytics ?? this.analytics,
      copilot: copilot ?? this.copilot,
      periodDays: periodDays ?? this.periodDays,
      isLoading: isLoading ?? this.isLoading,
      isGeneratingCopilot: isGeneratingCopilot ?? this.isGeneratingCopilot,
      isApplyingVerification:
          isApplyingVerification ?? this.isApplyingVerification,
      verificationSuccess: verificationSuccess ?? this.verificationSuccess,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final creatorNotifierProvider =
    NotifierProvider<CreatorNotifier, CreatorState>(CreatorNotifier.new);

class CreatorNotifier extends Notifier<CreatorState> {
  CreatorRepository get _repo => ref.read(creatorRepositoryProvider);

  @override
  CreatorState build() {
    Future.microtask(loadStudio);
    return const CreatorState(isLoading: true);
  }

  Future<void> loadStudio() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final profileFuture = _repo.getProfile();
      final analyticsFuture = _repo.getAnalytics(days: state.periodDays);

      final results = await Future.wait([profileFuture, analyticsFuture]);
      state = state.copyWith(
        profile: results[0] as CreatorProfileModel,
        analytics: results[1] as CreatorAnalyticsModel,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load Creator Studio data.',
      );
    }
  }

  Future<void> setPeriod(int days) async {
    if (state.periodDays == days) return;
    state = state.copyWith(periodDays: days, isLoading: true);
    try {
      final analytics = await _repo.getAnalytics(days: days);
      state = state.copyWith(analytics: analytics, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to update analytics period.',
      );
    }
  }

  Future<void> generateCopilot(String topic) async {
    final trimmed = topic.trim();
    if (trimmed.isEmpty || state.isGeneratingCopilot) return;

    state = state.copyWith(isGeneratingCopilot: true, clearError: true);
    try {
      final response = await _repo.getCopilotInsights(topic: trimmed);
      state = state.copyWith(
        copilot: response,
        isGeneratingCopilot: false,
      );
    } catch (e) {
      state = state.copyWith(
        isGeneratingCopilot: false,
        errorMessage: 'Creator Copilot could not generate insights.',
      );
    }
  }

  Future<bool> applyVerification({
    required String niche,
    required String statement,
    List<String> links = const <String>[],
  }) async {
    state = state.copyWith(isApplyingVerification: true, clearError: true);
    try {
      final app = await _repo.applyVerification(
        niche: niche,
        statement: statement,
        portfolioLinks: links,
      );

      final current = state.profile;
      if (current != null) {
        state = state.copyWith(
          profile: CreatorProfileModel(
            userId: current.userId,
            handle: current.handle,
            displayName: current.displayName,
            bio: current.bio,
            niche: niche,
            socialLinks: current.socialLinks,
            verificationStatus: app.status,
            totalReels: current.totalReels,
            totalViews: current.totalViews,
            followersCount: current.followersCount,
          ),
          isApplyingVerification: false,
          verificationSuccess: true,
        );
      } else {
        state = state.copyWith(
          isApplyingVerification: false,
          verificationSuccess: true,
        );
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        isApplyingVerification: false,
        errorMessage: 'Failed to submit verification request.',
      );
      return false;
    }
  }
}
