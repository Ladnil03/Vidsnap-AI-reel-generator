import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';

class FeedState {
  final FeedTab activeTab;
  final List<FeedItemModel> items;
  final bool isLoading;
  final bool isFetchingMore;
  final String? errorMessage;
  final String? cursor;
  final int currentIndex;
  final bool isMuted;

  const FeedState({
    this.activeTab = FeedTab.trending,
    this.items = const <FeedItemModel>[],
    this.isLoading = false,
    this.isFetchingMore = false,
    this.errorMessage,
    this.cursor,
    this.currentIndex = 0,
    this.isMuted = true,
  });

  FeedState copyWith({
    FeedTab? activeTab,
    List<FeedItemModel>? items,
    bool? isLoading,
    bool? isFetchingMore,
    String? errorMessage,
    String? cursor,
    int? currentIndex,
    bool? isMuted,
  }) {
    return FeedState(
      activeTab: activeTab ?? this.activeTab,
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isFetchingMore: isFetchingMore ?? this.isFetchingMore,
      errorMessage: errorMessage,
      cursor: cursor ?? this.cursor,
      currentIndex: currentIndex ?? this.currentIndex,
      isMuted: isMuted ?? this.isMuted,
    );
  }
}

class FeedNotifier extends Notifier<FeedState> {
  @override
  FeedState build() {
    // Initial fetch on mount
    Future.microtask(() => loadFeed());
    return const FeedState(isLoading: true);
  }

  FeedRepository get _repository => ref.read(feedRepositoryProvider);

  Future<void> loadFeed({FeedTab? tab, bool refresh = false}) async {
    final targetTab = tab ?? state.activeTab;
    state = state.copyWith(
      activeTab: targetTab,
      isLoading: true,
      errorMessage: null,
      currentIndex: 0,
      items: refresh ? const <FeedItemModel>[] : state.items,
    );

    try {
      final items = await _repository.getFeed(tab: targetTab, limit: 10);
      state = state.copyWith(
        items: items,
        isLoading: false,
        cursor: items.isNotEmpty ? items.last.videoId : null,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> switchTab(FeedTab tab) async {
    if (state.activeTab == tab && !state.isLoading) return;
    await loadFeed(tab: tab, refresh: true);
  }

  void setCurrentIndex(int index) {
    if (index >= 0 && index < state.items.length) {
      state = state.copyWith(currentIndex: index);
      // Pre-fetch more when reaching near the end
      if (index >= state.items.length - 2 && !state.isFetchingMore) {
        loadMore();
      }
    }
  }

  void toggleMute() {
    state = state.copyWith(isMuted: !state.isMuted);
  }

  Future<void> loadMore() async {
    if (state.isFetchingMore || state.cursor == null) return;
    state = state.copyWith(isFetchingMore: true);

    try {
      final moreItems = await _repository.getFeed(
        tab: state.activeTab,
        cursor: state.cursor,
        limit: 10,
      );

      final existingIds = state.items.map((e) => e.videoId).toSet();
      final newUnique = moreItems
          .where((e) => !existingIds.contains(e.videoId))
          .toList();

      state = state.copyWith(
        items: <FeedItemModel>[...state.items, ...newUnique],
        isFetchingMore: false,
        cursor: newUnique.isNotEmpty ? newUnique.last.videoId : null,
      );
    } catch (e) {
      state = state.copyWith(isFetchingMore: false);
    }
  }

  Future<void> toggleLike(String videoId) async {
    final index = state.items.indexWhere((it) => it.videoId == videoId);
    if (index == -1) return;

    final original = state.items[index];
    final newLiked = !original.hasLiked;
    final newCount = newLiked
        ? original.likesCount + 1
        : (original.likesCount > 0 ? original.likesCount - 1 : 0);

    // Optimistic update
    final updatedList = List<FeedItemModel>.from(state.items);
    updatedList[index] = original.copyWith(
      hasLiked: newLiked,
      likesCount: newCount,
    );
    state = state.copyWith(items: updatedList);

    try {
      await _repository.toggleLike(videoId, currentlyLiked: original.hasLiked);
    } catch (_) {
      // Rollback on error
      final rollbackList = List<FeedItemModel>.from(state.items);
      rollbackList[index] = original;
      state = state.copyWith(items: rollbackList);
    }
  }

  Future<void> toggleSave(String videoId) async {
    final index = state.items.indexWhere((it) => it.videoId == videoId);
    if (index == -1) return;

    final original = state.items[index];
    final newSaved = !original.hasSaved;
    final newCount = newSaved
        ? original.savesCount + 1
        : (original.savesCount > 0 ? original.savesCount - 1 : 0);

    // Optimistic update
    final updatedList = List<FeedItemModel>.from(state.items);
    updatedList[index] = original.copyWith(
      hasSaved: newSaved,
      savesCount: newCount,
    );
    state = state.copyWith(items: updatedList);

    try {
      await _repository.toggleSave(videoId, currentlySaved: original.hasSaved);
    } catch (_) {
      // Rollback on error
      final rollbackList = List<FeedItemModel>.from(state.items);
      rollbackList[index] = original;
      state = state.copyWith(items: rollbackList);
    }
  }
}

final feedProvider = NotifierProvider<FeedNotifier, FeedState>(
  FeedNotifier.new,
);
