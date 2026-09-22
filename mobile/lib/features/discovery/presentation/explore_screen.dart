import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_empty_state.dart';
import 'package:vidsnap_ai/core/widgets/app_error_view.dart';
import 'package:vidsnap_ai/features/discovery/domain/discovery_item_model.dart';
import 'package:vidsnap_ai/features/discovery/presentation/providers/discovery_provider.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  static const List<Map<String, String>> _sources = <Map<String, String>>[
    <String, String>{'id': 'all', 'label': 'All'},
    <String, String>{'id': 'community', 'label': 'Community'},
    <String, String>{'id': 'youtube_shorts', 'label': 'YouTube Shorts'},
    <String, String>{'id': 'pexels', 'label': 'Pexels'},
    <String, String>{'id': 'pixabay', 'label': 'Pixabay'},
  ];

  static const List<String> _trendingTags = <String>[
    '#ai',
    '#nature',
    '#tech',
    '#travel',
    '#comedy',
    '#fitness',
  ];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(discoveryProvider.notifier).loadMore();
    }
  }

  void _handleSearch(String query) {
    ref.read(discoveryProvider.notifier).search(query);
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(discoveryProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.forest950 : AppColors.cream50;
    final cardBg = isDark ? AppColors.forest900 : AppColors.cream100;
    final textColor = isDark ? AppColors.cream50 : AppColors.forest900;
    final subtleTextColor = isDark ? AppColors.sage300 : AppColors.forest700;

    return Scaffold(
      backgroundColor: surfaceColor,
      appBar: AppBar(
        backgroundColor: surfaceColor,
        elevation: 0,
        title: Container(
          height: 42.0,
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(AppRadii.pill),
            border: Border.all(
              color: isDark ? AppColors.forest700 : AppColors.cream200,
            ),
          ),
          child: TextField(
            controller: _searchController,
            style: TextStyle(color: textColor, fontSize: 14.0),
            decoration: InputDecoration(
              hintText: 'Search reels, creators, hashtags...',
              hintStyle: TextStyle(color: subtleTextColor, fontSize: 13.5),
              prefixIcon: Icon(Icons.search, color: subtleTextColor, size: 20.0),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 16.0),
                      color: subtleTextColor,
                      onPressed: () {
                        _searchController.clear();
                        _handleSearch('');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 10.0),
            ),
            onSubmitted: _handleSearch,
          ),
        ),
      ),
      body: Column(
        children: <Widget>[
          // Source filter chips
          SizedBox(
            height: 44.0,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4, vertical: 4.0),
              itemCount: _sources.length,
              separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.s2),
              itemBuilder: (context, index) {
                final source = _sources[index];
                final isSelected = state.selectedSource == source['id'];
                return ChoiceChip(
                  label: Text(
                    source['label']!,
                    style: TextStyle(
                      color: isSelected
                          ? AppColors.cream50
                          : (isDark ? AppColors.sage200 : AppColors.forest700),
                      fontSize: 12.0,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.moss500,
                  backgroundColor: cardBg,
                  side: BorderSide(
                    color: isSelected
                        ? AppColors.moss500
                        : (isDark ? AppColors.forest700 : AppColors.cream200),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.pill),
                  ),
                  onSelected: (_) {
                    ref.read(discoveryProvider.notifier).setSource(source['id']!);
                  },
                );
              },
            ),
          ),

          // Trending Tag Chips
          SizedBox(
            height: 38.0,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4, vertical: 2.0),
              itemCount: _trendingTags.length,
              separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.s2),
              itemBuilder: (context, index) {
                final tag = _trendingTags[index];
                final isSelected = state.selectedTag == tag.replaceAll('#', '');
                return ActionChip(
                  label: Text(
                    tag,
                    style: TextStyle(
                      color: isSelected
                          ? AppColors.cream50
                          : (isDark ? AppColors.sage300 : AppColors.forest600),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  backgroundColor: isSelected ? AppColors.forest600 : Colors.transparent,
                  side: BorderSide(
                    color: isSelected ? AppColors.forest600 : (isDark ? AppColors.forest800 : AppColors.cream300),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.pill),
                  ),
                  onPressed: () {
                    final clean = tag.replaceAll('#', '');
                    ref.read(discoveryProvider.notifier).setTag(isSelected ? null : clean);
                  },
                );
              },
            ),
          ),

          const SizedBox(height: AppSpacing.s2),

          // Main Grid of Discovery Items
          Expanded(
            child: _buildGridContent(state, isDark, cardBg, textColor, subtleTextColor),
          ),
        ],
      ),
    );
  }

  Widget _buildGridContent(
    DiscoveryState state,
    bool isDark,
    Color cardBg,
    Color textColor,
    Color subtleTextColor,
  ) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return AppErrorView(
        failure: AppFailure.network(message: state.errorMessage!),
        onRetry: () => ref.read(discoveryProvider.notifier).loadDiscovery(refresh: true),
      );
    }

    if (state.items.isEmpty) {
      return AppEmptyState(
        title: 'No discovery reels found',
        description: 'Try adjusting your search query or source filter',
        icon: const Icon(Icons.search_off_rounded, size: 48.0, color: AppColors.sage400),
        actionLabel: 'Reset filters',
        onAction: () {
          _searchController.clear();
          ref.read(discoveryProvider.notifier).search('');
          ref.read(discoveryProvider.notifier).setSource('all');
          ref.read(discoveryProvider.notifier).setTag(null);
        },
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(discoveryProvider.notifier).loadDiscovery(refresh: true),
      child: GridView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.65,
          crossAxisSpacing: AppSpacing.s3,
          mainAxisSpacing: AppSpacing.s3,
        ),
        itemCount: state.items.length + (state.isFetchingMore ? 2 : 0),
        itemBuilder: (context, index) {
          if (index >= state.items.length) {
            return Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(AppRadii.md),
              ),
              child: const Center(
                child: SizedBox(
                  width: 24.0,
                  height: 24.0,
                  child: CircularProgressIndicator(strokeWidth: 2.0),
                ),
              ),
            );
          }

          final item = state.items[index];
          return _buildItemCard(item, isDark, cardBg, textColor);
        },
      ),
    );
  }

  Widget _buildItemCard(
    DiscoveryItemModel item,
    bool isDark,
    Color cardBg,
    Color textColor,
  ) {
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Viewing "${item.title}"'),
            duration: const Duration(seconds: 1),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(AppRadii.md),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Colors.black12,
              blurRadius: 4.0,
              offset: Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: <Widget>[
            // Thumbnail image
            if (item.thumbnailUrl != null && item.thumbnailUrl!.isNotEmpty)
              Image.network(
                item.thumbnailUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    _buildFallbackThumbnail(item),
              )
            else
              _buildFallbackThumbnail(item),

            // Dark bottom gradient overlay
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: <Color>[
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.2),
                    Colors.black.withValues(alpha: 0.85),
                  ],
                  stops: const <double>[0.4, 0.7, 1.0],
                ),
              ),
            ),

            // Top Play/View count badge
            Positioned(
              top: 8.0,
              left: 8.0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 3.0),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 14.0),
                    const SizedBox(width: 2.0),
                    Text(
                      _formatCount(item.viewsCount),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom title & author name
            Positioned(
              left: 8.0,
              right: 8.0,
              bottom: 8.0,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.0,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 3.0),
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          '@${item.authorName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: AppColors.sage200.withValues(alpha: 0.9),
                            fontSize: 10.5,
                          ),
                        ),
                      ),
                      if (item.likesCount > 0) ...<Widget>[
                        const Icon(Icons.favorite, color: Color(0xFFFF4D67), size: 11.0),
                        const SizedBox(width: 2.0),
                        Text(
                          _formatCount(item.likesCount),
                          style: const TextStyle(color: Colors.white70, fontSize: 10.0),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackThumbnail(DiscoveryItemModel item) {
    return Container(
      color: AppColors.forest900,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.movie_filter_outlined,
              size: 32.0,
              color: AppColors.sage400.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 4.0),
            Text(
              item.source.replaceAll('_', ' ').toUpperCase(),
              style: TextStyle(
                color: AppColors.sage300.withValues(alpha: 0.6),
                fontSize: 9.0,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
