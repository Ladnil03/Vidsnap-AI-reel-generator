import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';
import 'package:vidsnap_ai/features/rooms/presentation/providers/rooms_provider.dart';

class ActiveRoomScreen extends ConsumerStatefulWidget {
  const ActiveRoomScreen({
    super.key,
    required this.roomId,
    this.passcode,
  });

  final String roomId;
  final String? passcode;

  @override
  ConsumerState<ActiveRoomScreen> createState() => _ActiveRoomScreenState();
}

class _ActiveRoomScreenState extends ConsumerState<ActiveRoomScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<String> _quickReactions = ['🔥', '❤️', '👏', '😂', '🎉'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(activeRoomProvider.notifier).joinRoom(
            widget.roomId,
            passcode: widget.passcode,
          );
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    ref.read(activeRoomProvider.notifier).sendChatMessage(text);
    _messageController.clear();
    _scrollToBottom();
  }

  Future<bool> _onWillPop() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shouldLeave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Watch Party?'),
        content: const Text('You will be disconnected from the synchronized stream and live chat.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Stay'),
          ),
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: isDark ? AppColors.dangerDark : AppColors.dangerLight,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Leave Party'),
          ),
        ],
      ),
    );

    if (shouldLeave == true) {
      await ref.read(activeRoomProvider.notifier).leaveRoom();
      return true;
    }
    return false;
  }

  void _showRtcDialog() {
    final notifier = ref.read(activeRoomProvider.notifier);
    notifier.fetchRtcToken();

    showDialog<void>(
      context: context,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final state = ref.watch(activeRoomProvider);
          final creds = state.rtcCredentials;

          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.headset_mic, color: AppColors.moss500),
                SizedBox(width: 8),
                Text('Audio Lounge'),
              ],
            ),
            content: creds == null
                ? const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppColors.moss500),
                      SizedBox(height: 16),
                      Text('Connecting to LiveKit WebRTC...'),
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'LiveKit audio credentials established:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text('Room: ${creds.roomName}'),
                      const SizedBox(height: 4),
                      Text('Server: ${creds.serverUrl}'),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.moss500.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppRadii.sm),
                        ),
                        child: const Text(
                          'Microphone is active for high-fidelity spatial voice chat.',
                          style: TextStyle(fontSize: 12, color: AppColors.moss500),
                        ),
                      ),
                    ],
                  ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAiRecapDialog() {
    final notifier = ref.read(activeRoomProvider.notifier);
    notifier.fetchAiRecap();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final state = ref.watch(activeRoomProvider);
          final isDark = Theme.of(context).brightness == Brightness.dark;
          final recap = state.summary;

          return Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.forest950 : AppColors.cream50,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadii.xl)),
            ),
            padding: const EdgeInsets.all(AppSpacing.s5),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.forest800 : AppColors.cream300,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.s4),
                const Row(
                  children: [
                    Icon(Icons.auto_awesome, color: AppColors.moss500),
                    SizedBox(width: AppSpacing.s2),
                    Text(
                      'AI Room Catch-up Recap',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.s3),
                if (state.isSummarizing)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: CircularProgressIndicator(color: AppColors.moss500),
                    ),
                  )
                else if (recap != null) ...[
                  Text(
                    recap.summary,
                    style: const TextStyle(fontSize: 14, height: 1.4),
                  ),
                  if (recap.highlights.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.s3),
                    const Text(
                      'Key Highlights:',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: AppSpacing.s2),
                    ...recap.highlights.map(
                      (h) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• ', style: TextStyle(color: AppColors.moss500, fontWeight: FontWeight.bold)),
                            Expanded(child: Text(h, style: const TextStyle(fontSize: 13))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ] else
                  const Text('No recap available at this moment.'),
                const SizedBox(height: AppSpacing.s5),
                AppButton(
                  label: 'Close',
                  variant: AppButtonVariant.primary,
                  isFullWidth: true,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatDuration(double seconds) {
    final totalSec = seconds.toInt();
    final mins = (totalSec ~/ 60).toString().padLeft(2, '0');
    final secs = (totalSec % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(activeRoomProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Trigger auto-scroll on new messages
    ref.listen(activeRoomProvider.select((s) => s.messages.length), (_, _) {
      _scrollToBottom();
    });

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final navigator = Navigator.of(context);
        final shouldLeave = await _onWillPop();
        if (shouldLeave && mounted) {
          navigator.pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                state.room?.name ?? 'Watch Party',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Row(
                children: [
                  Icon(
                    Icons.fiber_manual_record,
                    color: isDark ? AppColors.dangerDark : AppColors.dangerLight,
                    size: 8,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${state.participants.length} watching • Host: ${state.room?.hostName ?? "..."}',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.cream400 : AppColors.forest600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.headset_mic_outlined),
              tooltip: 'LiveKit Audio Lounge',
              onPressed: _showRtcDialog,
            ),
            IconButton(
              icon: const Icon(Icons.auto_awesome),
              tooltip: 'AI Room Recap',
              onPressed: _showAiRecapDialog,
            ),
          ],
        ),
        body: state.isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.moss500))
            : Stack(
                children: [
                  Column(
                    children: [
                      _buildSynchronizedVideoHeader(state, isDark, theme),
                      _buildParticipantsRail(state, isDark, theme),
                      const Divider(height: 1),
                      Expanded(
                        child: _buildChatStream(state, isDark, theme),
                      ),
                      _buildReactionAndInputBar(state, isDark),
                    ],
                  ),
                  if (state.recentReaction != null)
                    Positioned(
                      right: 24,
                      bottom: 80,
                      child: _buildReactionBurst(state.recentReaction!),
                    ),
                ],
              ),
      ),
    );
  }

  Widget _buildSynchronizedVideoHeader(ActiveRoomState state, bool isDark, ThemeData theme) {
    final watchState = state.watchState;
    final isPlaying = watchState?.isPlaying ?? false;
    final currentPos = watchState?.positionSeconds ?? 0.0;
    final title = watchState?.mediaTitle.isNotEmpty == true
        ? watchState!.mediaTitle
        : 'Watch Party Video Stream';

    return Container(
      width: double.infinity,
      color: Colors.black,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.moss500,
                  borderRadius: BorderRadius.circular(AppRadii.sm),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.sync, color: Colors.white, size: 12),
                    SizedBox(width: 4),
                    Text(
                      'HOST SYNCED',
                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s2),
          // Video Mock Canvas / Player Banner
          Container(
            height: 120,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(AppRadii.md),
              border: Border.all(color: Colors.white24),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isPlaying ? Icons.play_circle_fill : Icons.pause_circle_filled,
                        size: 42,
                        color: AppColors.moss500,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isPlaying ? 'Streaming Synchronously' : 'Stream Paused by Host',
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  bottom: 8,
                  left: 12,
                  child: Text(
                    _formatDuration(currentPos),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          // Playback sync control buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.replay_10, color: Colors.white, size: 22),
                tooltip: 'Seek back 10s',
                onPressed: () {
                  final newPos = (currentPos - 10).clamp(0.0, 999999.0);
                  ref.read(activeRoomProvider.notifier).syncPlayback(
                        action: 'seek',
                        positionSeconds: newPos,
                      );
                },
              ),
              const SizedBox(width: AppSpacing.s3),
              IconButton(
                icon: Icon(
                  isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                  color: AppColors.moss500,
                  size: 36,
                ),
                tooltip: isPlaying ? 'Pause for all' : 'Play for all',
                onPressed: () {
                  ref.read(activeRoomProvider.notifier).syncPlayback(
                        action: isPlaying ? 'pause' : 'play',
                        positionSeconds: currentPos,
                      );
                },
              ),
              const SizedBox(width: AppSpacing.s3),
              IconButton(
                icon: const Icon(Icons.forward_10, color: Colors.white, size: 22),
                tooltip: 'Seek forward 10s',
                onPressed: () {
                  final newPos = currentPos + 10;
                  ref.read(activeRoomProvider.notifier).syncPlayback(
                        action: 'seek',
                        positionSeconds: newPos,
                      );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildParticipantsRail(ActiveRoomState state, bool isDark, ThemeData theme) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: 6),
      color: isDark ? AppColors.forest900 : AppColors.cream100,
      child: Row(
        children: [
          Icon(Icons.groups, size: 16, color: isDark ? AppColors.cream400 : AppColors.forest700),
          const SizedBox(width: 6),
          Text(
            '${state.participants.length}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: state.participants.length,
              separatorBuilder: (_, _) => const SizedBox(width: 6),
              itemBuilder: (context, index) {
                final participant = state.participants[index];
                return Tooltip(
                  message: '${participant.name}${participant.isHost ? " (Host)" : ""}',
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: AppColors.moss500.withValues(alpha: 0.2),
                        child: Text(
                          participant.name.isNotEmpty ? participant.name[0].toUpperCase() : '?',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.moss500),
                        ),
                      ),
                      if (participant.isHost)
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Icon(
                            Icons.star,
                            color: isDark ? AppColors.warningDark : AppColors.warningLight,
                            size: 12,
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatStream(ActiveRoomState state, bool isDark, ThemeData theme) {
    if (state.messages.isEmpty) {
      return Center(
        child: Text(
          'No messages yet. Say hello to the room!',
          style: TextStyle(
            color: isDark ? AppColors.cream400 : AppColors.forest600,
            fontSize: 13,
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
      itemCount: state.messages.length,
      itemBuilder: (context, index) {
        final message = state.messages[index];
        return _buildChatMessageItem(message, isDark, theme);
      },
    );
  }

  Widget _buildChatMessageItem(RoomChatMessageModel message, bool isDark, ThemeData theme) {
    if (message.isSystem) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Text(
            message.text,
            style: TextStyle(
              fontSize: 11,
              fontStyle: FontStyle.italic,
              color: isDark ? AppColors.cream400 : AppColors.forest600,
            ),
          ),
        ),
      );
    }

    final isAssistant = message.isAssistant;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: isAssistant
                ? AppColors.moss500
                : (isDark ? AppColors.forest800 : AppColors.cream200),
            child: Icon(
              isAssistant ? Icons.auto_awesome : Icons.person,
              size: 14,
              color: isAssistant ? Colors.white : AppColors.moss500,
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      message.userName,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isAssistant ? AppColors.moss500 : null,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                      style: TextStyle(
                        fontSize: 10,
                        color: isDark ? AppColors.cream400 : AppColors.forest600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isAssistant
                        ? AppColors.moss500.withValues(alpha: 0.12)
                        : (isDark ? AppColors.forest900 : AppColors.cream100),
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                    border: isAssistant
                        ? Border.all(color: AppColors.moss500.withValues(alpha: 0.3))
                        : null,
                  ),
                  child: Text(
                    message.text,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.cream100 : AppColors.forest900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReactionAndInputBar(ActiveRoomState state, bool isDark) {
    return Container(
      padding: EdgeInsets.only(
        left: AppSpacing.s3,
        right: AppSpacing.s3,
        top: 6,
        bottom: MediaQuery.of(context).padding.bottom + 6,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.forest950 : AppColors.cream50,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDarkSubtle : AppColors.borderLightSubtle,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Quick reactions rail
          Row(
            children: [
              const Text('React: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ..._quickReactions.map(
                (emoji) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadii.pill),
                    onTap: () => ref.read(activeRoomProvider.notifier).sendReaction(emoji),
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: Text(emoji, style: const TextStyle(fontSize: 18)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Chat with the room...',
                    hintStyle: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.cream400 : AppColors.forest600,
                    ),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    filled: true,
                    fillColor: isDark ? AppColors.forest900 : AppColors.cream100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onSubmitted: (_) => _handleSendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send, color: AppColors.moss500),
                onPressed: _handleSendMessage,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReactionBurst(String emoji) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.5, end: 1.5),
      duration: const Duration(milliseconds: 600),
      curve: Curves.elasticOut,
      builder: (context, scale, child) {
        return Transform.scale(
          scale: scale,
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 32)),
          ),
        );
      },
    );
  }
}
