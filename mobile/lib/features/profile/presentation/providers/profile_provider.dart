import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/profile/data/profile_repository.dart';
import 'package:vidsnap_ai/features/profile/domain/profile_models.dart';

@immutable
class ProfileState {
  const ProfileState({
    this.profile,
    this.reels = const <FeedItemModel>[],
    this.savedReels = const <FeedItemModel>[],
    this.activeTab = 0,
    this.isLoading = false,
    this.isSaving = false,
    this.errorMessage,
  });

  final UserProfileModel? profile;
  final List<FeedItemModel> reels;
  final List<FeedItemModel> savedReels;
  final int activeTab; // 0: My Reels, 1: Saved Reels
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;

  ProfileState copyWith({
    UserProfileModel? profile,
    List<FeedItemModel>? reels,
    List<FeedItemModel>? savedReels,
    int? activeTab,
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ProfileState(
      profile: profile ?? this.profile,
      reels: reels ?? this.reels,
      savedReels: savedReels ?? this.savedReels,
      activeTab: activeTab ?? this.activeTab,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final profileNotifierProvider = NotifierProvider<ProfileNotifier, ProfileState>(
  ProfileNotifier.new,
);

class ProfileNotifier extends Notifier<ProfileState> {
  ProfileRepository get _repo => ref.read(profileRepositoryProvider);

  @override
  ProfileState build() {
    Future.microtask(loadProfile);
    return const ProfileState(isLoading: true);
  }

  Future<void> loadProfile() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final profile = await _repo.getMyProfile();
      final reels = await _repo.getUserReels(profile.userId);

      state = state.copyWith(profile: profile, reels: reels, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load profile data.',
      );
    }
  }

  Future<void> switchTab(int index) async {
    if (state.activeTab == index) return;
    state = state.copyWith(activeTab: index);

    if (index == 1 && state.savedReels.isEmpty) {
      try {
        final saved = await _repo.getSavedReels();
        state = state.copyWith(savedReels: saved);
      } catch (_) {}
    }
  }

  Future<bool> updateProfile(UpdateProfileInput input) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final updated = await _repo.updateProfile(input);
      final current = state.profile;
      if (current != null) {
        state = state.copyWith(
          profile: current.copyWith(
            name: updated.name.isNotEmpty ? updated.name : current.name,
            bio: input.bio ?? current.bio,
            timezone: updated.timezone,
          ),
          isSaving: false,
        );
      } else {
        state = state.copyWith(profile: updated, isSaving: false);
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Failed to update profile.',
      );
      return false;
    }
  }
}
