import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/feed/presentation/widgets/double_tap_heart_animation.dart';

class FeedPlayerItem extends StatefulWidget {
  const FeedPlayerItem({
    super.key,
    required this.item,
    required this.isActive,
    required this.isMuted,
    required this.onToggleMute,
    required this.onToggleLike,
    required this.onToggleSave,
    required this.onOpenComments,
    required this.onShare,
    this.onProgressUpdate,
  });

  final FeedItemModel item;
  final bool isActive;
  final bool isMuted;
  final VoidCallback onToggleMute;
  final VoidCallback onToggleLike;
  final VoidCallback onToggleSave;
  final VoidCallback onOpenComments;
  final VoidCallback onShare;
  final void Function(double watchedSeconds, double totalSeconds)?
  onProgressUpdate;

  @override
  State<FeedPlayerItem> createState() => _FeedPlayerItemState();
}

class _FeedPlayerItemState extends State<FeedPlayerItem>
    with SingleTickerProviderStateMixin {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _isPlaying = true;
  bool _hasError = false;
  bool _showHeartAnimation = false;
  bool _isDescriptionExpanded = false;
  double _progressPercentage = 0.0;

  late final AnimationController _discAnimController;

  @override
  void initState() {
    super.initState();
    _discAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );

    if (widget.isActive) {
      _initVideoPlayer();
    }
  }

  @override
  void didUpdateWidget(covariant FeedPlayerItem oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        if (_controller == null) {
          _initVideoPlayer();
        } else {
          unawaited(_controller?.play());
          setState(() => _isPlaying = true);
          _discAnimController.repeat();
        }
      } else {
        unawaited(_controller?.pause());
        setState(() => _isPlaying = false);
        _discAnimController.stop();
      }
    }

    if (widget.isMuted != oldWidget.isMuted && _controller != null) {
      unawaited(_controller?.setVolume(widget.isMuted ? 0.0 : 1.0));
    }
  }

  Future<void> _initVideoPlayer() async {
    final url = widget.item.videoUrl;
    if (url.isEmpty || !url.startsWith('http')) {
      setState(() => _hasError = true);
      return;
    }

    try {
      final controller = VideoPlayerController.networkUrl(Uri.parse(url));
      _controller = controller;

      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }

      await controller.setLooping(true);
      await controller.setVolume(widget.isMuted ? 0.0 : 1.0);

      controller.addListener(_videoListener);

      if (widget.isActive) {
        await controller.play();
        _discAnimController.repeat();
      }

      setState(() {
        _isInitialized = true;
        _isPlaying = widget.isActive;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _hasError = true);
      }
    }
  }

  void _videoListener() {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;

    final duration = c.value.duration.inMilliseconds;
    final position = c.value.position.inMilliseconds;

    if (duration > 0) {
      final pct = (position / duration).clamp(0.0, 1.0);
      if (mounted && (pct - _progressPercentage).abs() > 0.01) {
        setState(() => _progressPercentage = pct);
      }
      widget.onProgressUpdate?.call(
        c.value.position.inSeconds.toDouble(),
        c.value.duration.inSeconds.toDouble(),
      );
    }
  }

  void _togglePlayPause() {
    if (_controller == null || !_isInitialized) return;

    if (_controller!.value.isPlaying) {
      unawaited(_controller!.pause());
      setState(() => _isPlaying = false);
      _discAnimController.stop();
    } else {
      unawaited(_controller!.play());
      setState(() => _isPlaying = true);
      _discAnimController.repeat();
    }
  }

  void _handleDoubleTap() {
    widget.onToggleLike();
    setState(() => _showHeartAnimation = true);
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
  void dispose() {
    _discAnimController.dispose();
    _controller?.removeListener(_videoListener);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;

    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        // Background Video / Poster
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _togglePlayPause,
          onDoubleTap: _handleDoubleTap,
          child: Container(
            color: Colors.black,
            child: Center(
              child: _isInitialized && _controller != null
                  ? AspectRatio(
                      aspectRatio: _controller!.value.aspectRatio > 0
                          ? _controller!.value.aspectRatio
                          : 9 / 16,
                      child: VideoPlayer(_controller!),
                    )
                  : item.thumbnailUrl != null && item.thumbnailUrl!.isNotEmpty
                  ? Image.network(
                      item.thumbnailUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      errorBuilder: (context, error, stackTrace) =>
                          _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
        ),

        // Central Pause Icon Indicator
        if (!_isPlaying && _isInitialized)
          IgnorePointer(
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.s3),
                decoration: const BoxDecoration(
                  color: Colors.black45,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow_rounded,
                  color: Colors.white,
                  size: 48.0,
                ),
              ),
            ),
          ),

        // Double-Tap Heart Animation
        DoubleTapHeartAnimation(
          isShowing: _showHeartAnimation,
          onAnimationComplete: () {
            if (mounted) setState(() => _showHeartAnimation = false);
          },
        ),

        // Top & Bottom Gradient Scrim
        IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: <Color>[
                  Colors.black.withValues(alpha: 0.55),
                  Colors.transparent,
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.85),
                ],
                stops: const <double>[0.0, 0.18, 0.65, 1.0],
              ),
            ),
          ),
        ),

        // Top Overlay: Mute toggle & explainability badge
        Positioned(
          top: 54.0,
          left: AppSpacing.s4,
          right: AppSpacing.s4,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              if (item.explainabilityTag != null &&
                  item.explainabilityTag!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.s3,
                    vertical: AppSpacing.s1,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(AppRadii.pill),
                    border: Border.all(
                      color: AppColors.sage400.withValues(alpha: 0.4),
                      width: 1.0,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      const Icon(
                        Icons.auto_awesome,
                        size: 12.0,
                        color: AppColors.sage300,
                      ),
                      const SizedBox(width: 4.0),
                      Text(
                        item.explainabilityTag!,
                        style: const TextStyle(
                          color: AppColors.cream50,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                )
              else
                const SizedBox.shrink(),
              IconButton(
                style: IconButton.styleFrom(
                  backgroundColor: Colors.black45,
                  padding: const EdgeInsets.all(8.0),
                ),
                icon: Icon(
                  widget.isMuted
                      ? Icons.volume_off_rounded
                      : Icons.volume_up_rounded,
                  color: AppColors.cream50,
                  size: 20.0,
                ),
                onPressed: widget.onToggleMute,
              ),
            ],
          ),
        ),

        // Right Rail: Actions (Like, Comment, Save, Share, Audio Disc)
        Positioned(
          right: AppSpacing.s3,
          bottom: 40.0,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              // Author Avatar with '+' follow badge
              _buildAvatar(),
              const SizedBox(height: AppSpacing.s4),

              // Like Button
              _buildActionButton(
                icon: item.hasLiked
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                iconColor: item.hasLiked
                    ? const Color(0xFFFF4D67)
                    : AppColors.cream50,
                label: _formatCount(item.likesCount),
                onTap: widget.onToggleLike,
              ),
              const SizedBox(height: AppSpacing.s4),

              // Comment Button
              _buildActionButton(
                icon: Icons.chat_bubble_outline_rounded,
                iconColor: AppColors.cream50,
                label: _formatCount(item.commentsCount),
                onTap: widget.onOpenComments,
              ),
              const SizedBox(height: AppSpacing.s4),

              // Save / Bookmark Button
              _buildActionButton(
                icon: item.hasSaved
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
                iconColor: item.hasSaved
                    ? AppColors.sage300
                    : AppColors.cream50,
                label: _formatCount(item.savesCount),
                onTap: widget.onToggleSave,
              ),
              const SizedBox(height: AppSpacing.s4),

              // Share Button
              _buildActionButton(
                icon: Icons.share_rounded,
                iconColor: AppColors.cream50,
                label: 'Share',
                onTap: widget.onShare,
              ),
              const SizedBox(height: AppSpacing.s4),

              // Spinning Vinyl Music Disc
              _buildSpinningDisc(),
            ],
          ),
        ),

        // Bottom Left Metadata (Author, Title, Caption, Tags, Attribution)
        Positioned(
          left: AppSpacing.s4,
          right: 80.0,
          bottom: 24.0,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              // Creator Name
              Row(
                children: <Widget>[
                  Text(
                    '@${item.authorName.isNotEmpty ? item.authorName : 'Creator'}',
                    style: const TextStyle(
                      color: AppColors.cream50,
                      fontWeight: FontWeight.w700,
                      fontSize: 15.0,
                      shadows: <Shadow>[
                        Shadow(color: Colors.black54, blurRadius: 4.0),
                      ],
                    ),
                  ),
                  const SizedBox(width: 4.0),
                  const Icon(
                    Icons.check_circle,
                    size: 14.0,
                    color: AppColors.moss500,
                  ),
                ],
              ),
              const SizedBox(height: 4.0),

              // Title / Description with expand toggle
              GestureDetector(
                onTap: () {
                  setState(
                    () => _isDescriptionExpanded = !_isDescriptionExpanded,
                  );
                },
                child: Text(
                  item.title.isNotEmpty ? item.title : item.description,
                  maxLines: _isDescriptionExpanded ? 8 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.cream100,
                    fontSize: 13.5,
                    height: 1.3,
                    shadows: <Shadow>[
                      Shadow(color: Colors.black54, blurRadius: 4.0),
                    ],
                  ),
                ),
              ),

              // Hashtags
              if (item.hashtags.isNotEmpty) ...<Widget>[
                const SizedBox(height: 4.0),
                Wrap(
                  spacing: 4.0,
                  runSpacing: 2.0,
                  children: item.hashtags.take(4).map((tag) {
                    final cleanTag = tag.startsWith('#') ? tag : '#$tag';
                    return Text(
                      cleanTag,
                      style: const TextStyle(
                        color: AppColors.sage300,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w600,
                      ),
                    );
                  }).toList(),
                ),
              ],

              // External Source Attribution
              if (item.attributionText != null &&
                  item.attributionText!.isNotEmpty) ...<Widget>[
                const SizedBox(height: 6.0),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6.0,
                    vertical: 2.0,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black45,
                    borderRadius: BorderRadius.circular(AppRadii.xs),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      const Icon(
                        Icons.link,
                        size: 12.0,
                        color: AppColors.sage300,
                      ),
                      const SizedBox(width: 4.0),
                      Text(
                        item.attributionText!,
                        style: const TextStyle(
                          color: AppColors.sage200,
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),

        // Bottom Progress Bar Line
        Positioned(
          left: 0.0,
          right: 0.0,
          bottom: 0.0,
          child: Container(
            height: 2.5,
            color: Colors.white24,
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: _progressPercentage,
              child: Container(color: AppColors.cream50),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: const Color(0xFF0E2012),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.movie_outlined,
              size: 56.0,
              color: AppColors.forest600.withValues(alpha: 0.5),
            ),
            const SizedBox(height: AppSpacing.s2),
            if (_hasError)
              const Text(
                'Video unavailable',
                style: TextStyle(color: AppColors.sage400, fontSize: 13.0),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        Container(
          width: 46.0,
          height: 46.0,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.cream50, width: 2.0),
            color: AppColors.forest800,
          ),
          child: Center(
            child: Text(
              widget.item.authorName.isNotEmpty
                  ? widget.item.authorName[0].toUpperCase()
                  : 'V',
              style: const TextStyle(
                color: AppColors.cream50,
                fontSize: 18.0,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -4.0,
          left: 13.0,
          child: Container(
            width: 20.0,
            height: 20.0,
            decoration: const BoxDecoration(
              color: AppColors.moss500,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.add, color: Colors.white, size: 14.0),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(
            icon,
            color: iconColor,
            size: 32.0,
            shadows: const <Shadow>[
              Shadow(color: Colors.black54, blurRadius: 8.0),
            ],
          ),
          const SizedBox(height: 3.0),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.cream50,
              fontSize: 12.0,
              fontWeight: FontWeight.w600,
              shadows: <Shadow>[Shadow(color: Colors.black54, blurRadius: 4.0)],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpinningDisc() {
    return AnimatedBuilder(
      animation: _discAnimController,
      builder: (context, child) {
        return Transform.rotate(
          angle: _discAnimController.value * 2 * math.pi,
          child: child,
        );
      },
      child: Container(
        width: 38.0,
        height: 38.0,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const RadialGradient(
            colors: <Color>[
              Color(0xFF285430),
              Color(0xFF0E2012),
              Color(0xFF08140B),
            ],
          ),
          border: Border.all(
            color: AppColors.cream300.withValues(alpha: 0.4),
            width: 1.5,
          ),
        ),
        child: const Center(
          child: Icon(Icons.music_note, color: AppColors.cream50, size: 18.0),
        ),
      ),
    );
  }
}
