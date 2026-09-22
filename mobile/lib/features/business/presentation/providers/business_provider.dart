import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/business/data/business_repository.dart';
import 'package:vidsnap_ai/features/business/domain/business_models.dart';

@immutable
class BusinessState {
  const BusinessState({
    this.profile,
    this.campaigns = const <CampaignModel>[],
    this.selectedCategory,
    this.activeTab = 0, // 0: Browse Collabs, 1: Brand Campaigns
    this.isLoading = false,
    this.isSubmitting = false,
    this.feedbackMessage,
    this.errorMessage,
  });

  final BusinessProfileModel? profile;
  final List<CampaignModel> campaigns;
  final String? selectedCategory;
  final int activeTab;
  final bool isLoading;
  final bool isSubmitting;
  final String? feedbackMessage;
  final String? errorMessage;

  BusinessState copyWith({
    BusinessProfileModel? profile,
    List<CampaignModel>? campaigns,
    String? selectedCategory,
    int? activeTab,
    bool? isLoading,
    bool? isSubmitting,
    String? feedbackMessage,
    String? errorMessage,
    bool clearCategory = false,
    bool clearFeedback = false,
    bool clearError = false,
  }) {
    return BusinessState(
      profile: profile ?? this.profile,
      campaigns: campaigns ?? this.campaigns,
      selectedCategory:
          clearCategory ? null : (selectedCategory ?? this.selectedCategory),
      activeTab: activeTab ?? this.activeTab,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      feedbackMessage:
          clearFeedback ? null : (feedbackMessage ?? this.feedbackMessage),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final businessNotifierProvider =
    NotifierProvider<BusinessNotifier, BusinessState>(BusinessNotifier.new);

class BusinessNotifier extends Notifier<BusinessState> {
  BusinessRepository get _repo => ref.read(businessRepositoryProvider);

  @override
  BusinessState build() {
    Future.microtask(loadData);
    return const BusinessState(isLoading: true);
  }

  Future<void> loadData() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final campaignsFuture =
          _repo.listCampaigns(category: state.selectedCategory);
      final profileFuture = _repo.getProfile().catchError((_) {
        return const BusinessProfileModel(
          businessId: '',
          userId: '',
          companyName: '',
          website: '',
          industry: '',
        );
      });

      final results = await Future.wait([campaignsFuture, profileFuture]);
      state = state.copyWith(
        campaigns: results[0] as List<CampaignModel>,
        profile: results[1] as BusinessProfileModel,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load Collab Marketplace.',
      );
    }
  }

  Future<void> selectCategory(String? category) async {
    if (category == null || state.selectedCategory == category) {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategory: category);
    }

    try {
      final campaigns = await _repo.listCampaigns(category: state.selectedCategory);
      state = state.copyWith(campaigns: campaigns);
    } catch (_) {}
  }

  void switchTab(int tab) {
    if (state.activeTab == tab) return;
    state = state.copyWith(activeTab: tab);
  }

  Future<bool> createCampaign(CreateCampaignInput input) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final created = await _repo.createCampaign(input);
      state = state.copyWith(
        campaigns: <CampaignModel>[created, ...state.campaigns],
        isSubmitting: false,
        feedbackMessage: 'Campaign "${created.title}" published! 🚀',
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to publish campaign brief.',
      );
      return false;
    }
  }

  Future<bool> applyPitch({
    required String campaignId,
    required String pitch,
    String? reelId,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final app = await _repo.applyToCampaign(
        campaignId: campaignId,
        pitch: pitch,
        portfolioReelId: reelId,
      );

      final safeText = app.isBrandSafe ? 'Brand-Safe Verified ✅' : 'Flagged';
      state = state.copyWith(
        isSubmitting: false,
        feedbackMessage: 'Pitch submitted! Safety score: ${app.brandSafetyScore}/100 ($safeText)',
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to submit collab application.',
      );
      return false;
    }
  }

  Future<bool> registerBusiness(CreateBusinessProfileInput input) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final profile = await _repo.updateProfile(input);
      state = state.copyWith(
        profile: profile,
        isSubmitting: false,
        feedbackMessage: 'Business Profile Registered! Welcome to Brand Hub.',
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to register business profile.',
      );
      return false;
    }
  }

  void clearFeedback() {
    state = state.copyWith(clearFeedback: true, clearError: true);
  }
}
