import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';
import 'package:vidsnap_ai/features/social/data/social_repository.dart';

class CommunitiesState {
  const CommunitiesState({
    this.communities = const [],
    this.isLoading = false,
    this.errorMessage,
    this.selectedCategory = 'all',
    this.searchQuery = '',
  });

  final List<CommunityModel> communities;
  final bool isLoading;
  final String? errorMessage;
  final String selectedCategory;
  final String searchQuery;

  CommunitiesState copyWith({
    List<CommunityModel>? communities,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
    String? selectedCategory,
    String? searchQuery,
  }) {
    return CommunitiesState(
      communities: communities ?? this.communities,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      selectedCategory: selectedCategory ?? this.selectedCategory,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class CommunitiesNotifier extends Notifier<CommunitiesState> {
  @override
  CommunitiesState build() {
    Future.microtask(() => loadCommunities());
    return const CommunitiesState(isLoading: true);
  }

  SocialRepository get _repository => ref.read(socialRepositoryProvider);

  Future<void> loadCommunities() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final items = await _repository.listCommunities(
        category: state.selectedCategory == 'all'
            ? null
            : state.selectedCategory,
        query: state.searchQuery.isEmpty ? null : state.searchQuery,
      );
      state = state.copyWith(communities: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  void setCategory(String category) {
    state = state.copyWith(selectedCategory: category);
    loadCommunities();
  }

  void setSearch(String query) {
    state = state.copyWith(searchQuery: query);
    loadCommunities();
  }

  Future<void> toggleJoin(String communityId) async {
    final index = state.communities.indexWhere(
      (c) => c.communityId == communityId,
    );
    if (index == -1) return;

    final target = state.communities[index];
    final wasMember = target.isMember;
    final optimisticCount = wasMember
        ? (target.membersCount - 1).clamp(0, 999999)
        : target.membersCount + 1;

    // Optimistic update
    final updatedList = [...state.communities];
    updatedList[index] = target.copyWith(
      isMember: !wasMember,
      membersCount: optimisticCount,
    );
    state = state.copyWith(communities: updatedList);

    try {
      if (wasMember) {
        await _repository.leaveCommunity(communityId);
      } else {
        await _repository.joinCommunity(communityId);
      }
    } catch (e) {
      // Revert on error
      final revertedList = [...state.communities];
      revertedList[index] = target;
      state = state.copyWith(
        communities: revertedList,
        errorMessage: 'Failed to update membership: $e',
      );
    }
  }
}

final communitiesProvider =
    NotifierProvider<CommunitiesNotifier, CommunitiesState>(
      CommunitiesNotifier.new,
    );
