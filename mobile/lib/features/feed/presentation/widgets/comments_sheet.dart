import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/domain/comment_model.dart';

class CommentsSheet extends ConsumerStatefulWidget {
  const CommentsSheet({
    super.key,
    required this.videoId,
    this.initialCount = 0,
  });

  final String videoId;
  final int initialCount;

  static Future<void> show(
    BuildContext context, {
    required String videoId,
    int initialCount = 0,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          CommentsSheet(videoId: videoId, initialCount: initialCount),
    );
  }

  @override
  ConsumerState<CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends ConsumerState<CommentsSheet> {
  final TextEditingController _commentController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<CommentModel> _comments = <CommentModel>[];
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchComments() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repository = ref.read(feedRepositoryProvider);
      final fetched = await repository.getComments(widget.videoId);
      if (mounted) {
        setState(() {
          _comments = fetched;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Could not load comments';
        });
      }
    }
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      final repository = ref.read(feedRepositoryProvider);
      final newComment = await repository.addComment(widget.videoId, text);
      if (mounted) {
        _commentController.clear();
        setState(() {
          _comments.insert(0, newComment);
          _isSubmitting = false;
        });
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            0.0,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to post comment. Please try again.'),
          ),
        );
      }
    }
  }

  String _formatTime(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.forest900 : AppColors.cream50;
    final textColor = isDark ? AppColors.cream50 : AppColors.forest900;
    final subtleTextColor = isDark ? AppColors.sage300 : AppColors.forest700;
    final borderColor = isDark ? AppColors.forest700 : AppColors.cream200;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.65,
        decoration: BoxDecoration(
          color: surfaceColor,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(AppRadii.xl),
          ),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Colors.black26,
              blurRadius: 16.0,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          children: <Widget>[
            // Drag handle and Header
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s4,
                vertical: AppSpacing.s3,
              ),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Column(
                children: <Widget>[
                  Center(
                    child: Container(
                      width: 36.0,
                      height: 4.0,
                      margin: const EdgeInsets.only(bottom: AppSpacing.s2),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.forest600
                            : AppColors.cream300,
                        borderRadius: BorderRadius.circular(AppRadii.pill),
                      ),
                    ),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Text(
                        'Comments (${_comments.isNotEmpty ? _comments.length : widget.initialCount})',
                        style: TextStyle(
                          color: textColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 16.0,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20.0),
                        color: subtleTextColor,
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Content List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Text(
                            _errorMessage!,
                            style: TextStyle(color: subtleTextColor),
                          ),
                          const SizedBox(height: AppSpacing.s2),
                          TextButton(
                            onPressed: _fetchComments,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    )
                  : _comments.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Icon(
                            Icons.chat_bubble_outline,
                            size: 48.0,
                            color: isDark
                                ? AppColors.forest600
                                : AppColors.cream300,
                          ),
                          const SizedBox(height: AppSpacing.s2),
                          Text(
                            'No comments yet',
                            style: TextStyle(
                              color: textColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 15.0,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.s1),
                          Text(
                            'Be the first to share your thoughts!',
                            style: TextStyle(
                              color: subtleTextColor,
                              fontSize: 13.0,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(AppSpacing.s4),
                      itemCount: _comments.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: AppSpacing.s3),
                      itemBuilder: (context, index) {
                        final comment = _comments[index];
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            CircleAvatar(
                              radius: 16.0,
                              backgroundColor: isDark
                                  ? AppColors.forest700
                                  : AppColors.sage200,
                              child: Text(
                                comment.userName.isNotEmpty
                                    ? comment.userName[0].toUpperCase()
                                    : 'U',
                                style: TextStyle(
                                  color: isDark
                                      ? AppColors.cream50
                                      : AppColors.forest900,
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.s3),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Row(
                                    children: <Widget>[
                                      Text(
                                        comment.userName,
                                        style: TextStyle(
                                          color: textColor,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13.0,
                                        ),
                                      ),
                                      const SizedBox(width: AppSpacing.s2),
                                      Text(
                                        _formatTime(comment.createdAt),
                                        style: TextStyle(
                                          color: subtleTextColor,
                                          fontSize: 11.0,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2.0),
                                  Text(
                                    comment.text,
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                    ),
            ),

            // Input Bar
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s4,
                vertical: AppSpacing.s3,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.forest800 : AppColors.cream100,
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: TextField(
                        controller: _commentController,
                        style: TextStyle(color: textColor, fontSize: 14.0),
                        decoration: InputDecoration(
                          hintText: 'Add a comment...',
                          hintStyle: TextStyle(
                            color: subtleTextColor,
                            fontSize: 14.0,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.s3,
                            vertical: AppSpacing.s2,
                          ),
                        ),
                        onSubmitted: (_) => _submitComment(),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s2),
                    IconButton(
                      icon: _isSubmitting
                          ? const SizedBox(
                              width: 18.0,
                              height: 18.0,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.0,
                              ),
                            )
                          : const Icon(Icons.send_rounded, size: 20.0),
                      color: AppColors.moss500,
                      onPressed: _isSubmitting ? null : _submitComment,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
