import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_empty_state.dart';
import 'package:vidsnap_ai/core/widgets/app_error_view.dart';
import 'package:vidsnap_ai/features/feed/data/watch_metrics_buffer.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/feed/presentation/providers/feed_provider.dart';
import 'package:vidsnap_ai/features/feed/presentation/widgets/comments_sheet.dart';
import 'package:vidsnap_ai/features/feed/presentation/widgets/feed_player_item.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    ref.read(feedProvider.notifier).setCurrentIndex(index);
    // Flush telemetry on video change
    ref.read(watchMetricsBufferProvider).flush();
  }

  @override
  Widget build(BuildContext context) {
    final feedState = ref.watch(feedProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: <Widget>[
          // Main Content View
          _buildBody(feedState),

          // Floating Top Tab Switcher
          SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s2),
                child: _buildTopTabBar(feedState.activeTab),
              ),
            ),
          ),

          // Floating AI Companion launcher
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(
                  top: AppSpacing.s1,
                  right: AppSpacing.s2,
                ),
                child: IconButton(
                  icon: const Text('✨', style: TextStyle(fontSize: 22)),
                  tooltip: 'AI Companion',
                  onPressed: () => context.push('/companion'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(FeedState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.moss500),
      );
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return AppErrorView(
        failure: AppFailure.network(message: state.errorMessage!),
        onRetry: () => ref.read(feedProvider.notifier).loadFeed(refresh: true),
      );
    }

    if (state.items.isEmpty) {
      return Center(
        child: AppEmptyState(
          title: 'No reels yet',
          description:
              'Be the first creator to post in ${state.activeTab.label}!',
          icon: const Icon(
            Icons.video_collection_outlined,
            size: 48.0,
            color: AppColors.sage400,
          ),
          actionLabel: 'Refresh',
          onAction: () =>
              ref.read(feedProvider.notifier).loadFeed(refresh: true),
        ),
      );
    }

    return PageView.builder(
      controller: _pageController,
      scrollDirection: Axis.vertical,
      physics: const ClampingScrollPhysics(),
      onPageChanged: _onPageChanged,
      itemCount: state.items.length,
      itemBuilder: (context, index) {
        final item = state.items[index];
        final isActive = index == state.currentIndex;

        return FeedPlayerItem(
          key: ValueKey<String>(item.videoId),
          item: item,
          isActive: isActive,
          isMuted: state.isMuted,
          onToggleMute: () => ref.read(feedProvider.notifier).toggleMute(),
          onToggleLike: () =>
              ref.read(feedProvider.notifier).toggleLike(item.videoId),
          onToggleSave: () =>
              ref.read(feedProvider.notifier).toggleSave(item.videoId),
          onOpenComments: () => CommentsSheet.show(
            context,
            videoId: item.videoId,
            initialCount: item.commentsCount,
          ),
          onShare: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Reel link copied to clipboard!'),
                duration: Duration(seconds: 2),
              ),
            );
          },
          onProgressUpdate: (watchedSeconds, totalSeconds) {
            if (isActive) {
              ref
                  .read(watchMetricsBufferProvider)
                  .recordProgress(
                    videoId: item.videoId,
                    watchedSeconds: watchedSeconds,
                    totalSeconds: totalSeconds,
                    completed: watchedSeconds >= (totalSeconds - 0.5),
                  );
            }
          },
        );
      },
    );
  }

  Widget _buildTopTabBar(FeedTab activeTab) {
    const tabs = <FeedTab>[
      FeedTab.trending,
      FeedTab.following,
      FeedTab.saved,
      FeedTab.forYou,
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 4.0),
      decoration: BoxDecoration(
        color: Colors.black45,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: Colors.white12, width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: tabs.map((tab) {
          final isSelected = tab == activeTab;
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => ref.read(feedProvider.notifier).switchTab(tab),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s3,
                vertical: 6.0,
              ),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.forest500 : Colors.transparent,
                borderRadius: BorderRadius.circular(AppRadii.pill),
              ),
              child: Text(
                tab.label,
                style: TextStyle(
                  color: isSelected
                      ? AppColors.cream50
                      : AppColors.cream200.withValues(alpha: 0.7),
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 13.0,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
