import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/discovery/data/discovery_repository.dart';
import 'package:vidsnap_ai/features/discovery/domain/discovery_item_model.dart';

class DiscoveryState {
  final String searchQuery;
  final String selectedSource;
  final String? selectedTag;
  final List<DiscoveryItemModel> items;
  final bool isLoading;
  final bool isFetchingMore;
  final String? errorMessage;
  final int page;
  final bool hasMore;

  const DiscoveryState({
    this.searchQuery = '',
    this.selectedSource = 'all',
    this.selectedTag,
    this.items = const <DiscoveryItemModel>[],
    this.isLoading = false,
    this.isFetchingMore = false,
    this.errorMessage,
    this.page = 1,
    this.hasMore = false,
  });

  DiscoveryState copyWith({
    String? searchQuery,
    String? selectedSource,
    String? selectedTag,
    bool clearTag = false,
    List<DiscoveryItemModel>? items,
    bool? isLoading,
    bool? isFetchingMore,
    String? errorMessage,
    int? page,
    bool? hasMore,
  }) {
    return DiscoveryState(
      searchQuery: searchQuery ?? this.searchQuery,
      selectedSource: selectedSource ?? this.selectedSource,
      selectedTag: clearTag ? null : (selectedTag ?? this.selectedTag),
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isFetchingMore: isFetchingMore ?? this.isFetchingMore,
      errorMessage: errorMessage,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class DiscoveryNotifier extends Notifier<DiscoveryState> {
  @override
  DiscoveryState build() {
    Future.microtask(() => loadDiscovery());
    return const DiscoveryState(isLoading: true);
  }

  DiscoveryRepository get _repository => ref.read(discoveryRepositoryProvider);

  Future<void> loadDiscovery({bool refresh = false}) async {
    state = state.copyWith(
      isLoading: true,
      errorMessage: null,
      page: 1,
      items: refresh ? const <DiscoveryItemModel>[] : state.items,
    );

    try {
      final response = await _repository.search(
        query: state.searchQuery.isNotEmpty ? state.searchQuery : null,
        source: state.selectedSource != 'all' ? state.selectedSource : null,
        tag: state.selectedTag,
        page: 1,
        limit: 20,
      );

      state = state.copyWith(
        items: response.items,
        isLoading: false,
        page: 1,
        hasMore: response.hasMore,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> search(String query) async {
    if (state.searchQuery == query && !state.isLoading) return;
    state = state.copyWith(searchQuery: query);
    await loadDiscovery(refresh: true);
  }

  Future<void> setSource(String source) async {
    if (state.selectedSource == source && !state.isLoading) return;
    state = state.copyWith(selectedSource: source);
    await loadDiscovery(refresh: true);
  }

  Future<void> setTag(String? tag) async {
    if (state.selectedTag == tag && !state.isLoading) return;
    state = state.copyWith(selectedTag: tag, clearTag: tag == null);
    await loadDiscovery(refresh: true);
  }

  Future<void> loadMore() async {
    if (state.isFetchingMore || !state.hasMore) return;
    state = state.copyWith(isFetchingMore: true);

    try {
      final nextPage = state.page + 1;
      final response = await _repository.search(
        query: state.searchQuery.isNotEmpty ? state.searchQuery : null,
        source: state.selectedSource != 'all' ? state.selectedSource : null,
        tag: state.selectedTag,
        page: nextPage,
        limit: 20,
      );

      final existingIds = state.items.map((e) => e.itemId).toSet();
      final newUnique = response.items.where((e) => !existingIds.contains(e.itemId)).toList();

      state = state.copyWith(
        items: <DiscoveryItemModel>[...state.items, ...newUnique],
        isFetchingMore: false,
        page: nextPage,
        hasMore: response.hasMore,
      );
    } catch (e) {
      state = state.copyWith(isFetchingMore: false);
    }
  }
}

final discoveryProvider = NotifierProvider<DiscoveryNotifier, DiscoveryState>(DiscoveryNotifier.new);
