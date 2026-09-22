import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/features/companion/domain/companion_models.dart';
import 'package:vidsnap_ai/features/companion/presentation/providers/companion_provider.dart';

class CompanionChatScreen extends ConsumerStatefulWidget {
  const CompanionChatScreen({super.key});

  @override
  ConsumerState<CompanionChatScreen> createState() =>
      _CompanionChatScreenState();
}

class _CompanionChatScreenState extends ConsumerState<CompanionChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSend([String? presetText]) {
    final text = presetText ?? _controller.text;
    if (text.trim().isEmpty) return;

    if (presetText == null) {
      _controller.clear();
    }

    ref.read(companionNotifierProvider.notifier).sendMessage(text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(companionNotifierProvider);

    ref.listen<CompanionState>(companionNotifierProvider, (previous, next) {
      if (previous?.messages.length != next.messages.length) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                color: AppColors.successLight,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            const Text('AI Companion'),
          ],
        ),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Clear History',
            onPressed: () {
              showDialog<void>(
                context: context,
                builder: (dialogCtx) => AlertDialog(
                  title: const Text('Clear Chat History?'),
                  content: const Text(
                    'This will remove all previous conversations with your companion.',
                  ),
                  actions: <Widget>[
                    TextButton(
                      onPressed: () => Navigator.of(dialogCtx).pop(),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.of(dialogCtx).pop();
                        ref
                            .read(companionNotifierProvider.notifier)
                            .clearHistory();
                      },
                      child: const Text(
                        'Clear',
                        style: TextStyle(color: AppColors.dangerLight),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            // Mood Selector Strip
            _buildMoodSelector(context, state.activeMood, isDark),

            // Error banner if any
            if (state.errorMessage != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s4,
                  vertical: AppSpacing.s2,
                ),
                color: isDark
                    ? AppColors.dangerDark.withValues(alpha: 0.2)
                    : AppColors.dangerLight.withValues(alpha: 0.1),
                child: Row(
                  children: <Widget>[
                    const Icon(
                      Icons.info_outline,
                      size: 16,
                      color: AppColors.dangerLight,
                    ),
                    const SizedBox(width: AppSpacing.s2),
                    Expanded(
                      child: Text(
                        state.errorMessage!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: isDark
                              ? AppColors.dangerDark
                              : AppColors.dangerLight,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Message stream or empty state
            Expanded(
              child: state.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : state.messages.isEmpty
                  ? _buildEmptyState(context, isDark)
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(AppSpacing.s4),
                      itemCount:
                          state.messages.length + (state.isSending ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == state.messages.length && state.isSending) {
                          return _buildThinkingIndicator(context, isDark);
                        }
                        final message = state.messages[index];
                        return _buildMessageBubble(context, message, isDark);
                      },
                    ),
            ),

            // Suggested action chips
            if (state.suggestedActions.isNotEmpty)
              _buildSuggestedActions(context, state.suggestedActions, isDark),

            // Input bar
            _buildInputBar(isDark, state.isSending),
          ],
        ),
      ),
    );
  }

  Widget _buildMoodSelector(
    BuildContext context,
    MoodType? activeMood,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.forest900 : AppColors.cream100,
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? AppColors.borderDarkSubtle
                : AppColors.borderLightSubtle,
          ),
        ),
      ),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3),
        itemCount: MoodType.values.length,
        separatorBuilder: (context, index) =>
            const SizedBox(width: AppSpacing.s2),
        itemBuilder: (context, index) {
          final mood = MoodType.values[index];
          final isSelected = mood == activeMood;

          return Semantics(
            button: true,
            label: 'Select mood ${mood.label}',
            child: FilterChip(
              showCheckmark: false,
              label: Text(
                mood.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected
                      ? (isDark ? AppColors.sage100 : AppColors.forest900)
                      : (isDark ? AppColors.forest200 : AppColors.forest700),
                ),
              ),
              selected: isSelected,
              selectedColor: isDark ? AppColors.forest700 : AppColors.sage200,
              backgroundColor: isDark ? AppColors.forest950 : AppColors.cream50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadii.pill),
                side: BorderSide(
                  color: isSelected
                      ? (isDark ? AppColors.sage400 : AppColors.forest500)
                      : Colors.transparent,
                ),
              ),
              onSelected: (_) {
                ref.read(companionNotifierProvider.notifier).selectMood(mood);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark) {
    final theme = Theme.of(context);

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: isDark ? AppColors.forest800 : AppColors.sage100,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('✨', style: TextStyle(fontSize: 32)),
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            Text(
              'Your Personal AI Companion',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.s2),
            Text(
              'Tell me your mood, ask for reel recommendations, or explore fresh creative inspiration tailored just for you.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark ? AppColors.forest200 : AppColors.forest700,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(
    BuildContext context,
    CompanionMessageModel message,
    bool isDark,
  ) {
    final theme = Theme.of(context);
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s3),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (!isUser) ...<Widget>[
            CircleAvatar(
              radius: 16,
              backgroundColor: isDark ? AppColors.forest700 : AppColors.sage200,
              child: const Text('✨', style: TextStyle(fontSize: 14)),
            ),
            const SizedBox(width: AppSpacing.s2),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.s3),
              decoration: BoxDecoration(
                color: isUser
                    ? (isDark ? AppColors.forest500 : AppColors.forest700)
                    : (isDark ? AppColors.forest900 : AppColors.cream100),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(AppRadii.md),
                  topRight: const Radius.circular(AppRadii.md),
                  bottomLeft: Radius.circular(
                    isUser ? AppRadii.md : AppRadii.xs,
                  ),
                  bottomRight: Radius.circular(
                    isUser ? AppRadii.xs : AppRadii.md,
                  ),
                ),
                border: !isUser
                    ? Border.all(
                        color: isDark
                            ? AppColors.borderDarkSubtle
                            : AppColors.borderLightSubtle,
                      )
                    : null,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  if (!isUser)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.s1),
                      child: Text(
                        'AI Companion',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: isDark ? AppColors.sage400 : AppColors.moss700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  SelectableText(
                    message.content,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isUser
                          ? Colors.white
                          : (isDark ? AppColors.cream50 : AppColors.forest900),
                    ),
                  ),
                  if (message.reels != null && message.reels!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.s3),
                      child: _buildReelsCarousel(
                        context,
                        message.reels!,
                        isDark,
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (isUser) const SizedBox(width: AppSpacing.s2),
        ],
      ),
    );
  }

  Widget _buildReelsCarousel(
    BuildContext context,
    List<Map<String, dynamic>> reels,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: reels.map((reel) {
        final title = (reel['title'] ?? 'Recommended Reel').toString();
        final reelId = (reel['reel_id'] ?? reel['id'] ?? '').toString();

        return Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.s2),
          padding: const EdgeInsets.all(AppSpacing.s2),
          decoration: BoxDecoration(
            color: isDark ? AppColors.forest800 : AppColors.cream50,
            borderRadius: BorderRadius.circular(AppRadii.sm),
            border: Border.all(
              color: isDark
                  ? AppColors.borderDarkSubtle
                  : AppColors.borderLightSubtle,
            ),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 40,
                height: 52,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest950 : AppColors.cream200,
                  borderRadius: BorderRadius.circular(AppRadii.xs),
                ),
                child: const Icon(
                  Icons.play_circle_fill,
                  color: AppColors.moss500,
                  size: 24,
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tap to watch',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.moss500,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.arrow_forward_ios, size: 14),
                tooltip: 'Play reel',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Playing reel: $reelId')),
                  );
                },
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildThinkingIndicator(BuildContext context, bool isDark) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          CircleAvatar(
            radius: 14,
            backgroundColor: isDark ? AppColors.forest700 : AppColors.sage200,
            child: const Text('✨', style: TextStyle(fontSize: 12)),
          ),
          const SizedBox(width: AppSpacing.s2),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.s3,
              vertical: AppSpacing.s2,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppColors.forest900 : AppColors.cream100,
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: AppSpacing.s2),
                Text(
                  'VidSnap AI is typing...',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestedActions(
    BuildContext context,
    List<String> actions,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    return Container(
      height: 40,
      margin: const EdgeInsets.only(bottom: AppSpacing.s2),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
        itemCount: actions.length,
        separatorBuilder: (context, index) =>
            const SizedBox(width: AppSpacing.s2),
        itemBuilder: (context, index) {
          final action = actions[index];
          return ActionChip(
            label: Text(
              action,
              style: theme.textTheme.bodySmall?.copyWith(
                color: isDark ? AppColors.sage200 : AppColors.forest800,
              ),
            ),
            backgroundColor: isDark ? AppColors.forest900 : AppColors.sage100,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadii.pill),
              side: BorderSide(
                color: isDark
                    ? AppColors.borderDarkSubtle
                    : AppColors.borderLightSubtle,
              ),
            ),
            onPressed: () => _handleSend(action),
          );
        },
      ),
    );
  }

  Widget _buildInputBar(bool isDark, bool isSending) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s3,
        vertical: AppSpacing.s2,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.forest950 : AppColors.cream50,
        border: Border(
          top: BorderSide(
            color: isDark
                ? AppColors.borderDarkSubtle
                : AppColors.borderLightSubtle,
          ),
        ),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.send,
              onSubmitted: isSending ? null : (_) => _handleSend(),
              decoration: InputDecoration(
                hintText: 'Ask your AI companion anything...',
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s4,
                  vertical: AppSpacing.s3,
                ),
                filled: true,
                fillColor: isDark ? AppColors.forest900 : AppColors.cream100,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          IconButton(
            icon: isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
            color: isDark ? AppColors.sage400 : AppColors.forest600,
            tooltip: 'Send message',
            onPressed: isSending ? null : () => _handleSend(),
          ),
        ],
      ),
    );
  }
}
