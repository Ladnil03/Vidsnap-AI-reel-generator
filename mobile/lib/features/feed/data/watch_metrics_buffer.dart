import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';

class WatchMetricsBuffer {
  WatchMetricsBuffer({required this.repository});

  final FeedRepository repository;
  final Map<String, WatchProgressRequestModel> _pendingQueue = <String, WatchProgressRequestModel>{};
  Timer? _flushTimer;
  bool _isFlushing = false;

  void startPeriodicFlush({Duration interval = const Duration(seconds: 8)}) {
    _flushTimer?.cancel();
    _flushTimer = Timer.periodic(interval, (_) => flush());
  }

  void stopPeriodicFlush() {
    _flushTimer?.cancel();
    _flushTimer = null;
  }

  void recordProgress({
    required String videoId,
    required double watchedSeconds,
    required double totalSeconds,
    bool completed = false,
  }) {
    if (videoId.isEmpty || totalSeconds <= 0.0) return;

    _pendingQueue[videoId] = WatchProgressRequestModel(
      videoId: videoId,
      watchedSeconds: watchedSeconds,
      totalSeconds: totalSeconds,
      completed: completed,
    );
  }

  Future<void> flush() async {
    if (_isFlushing || _pendingQueue.isEmpty) return;
    _isFlushing = true;

    final itemsToFlush = Map<String, WatchProgressRequestModel>.from(_pendingQueue);
    _pendingQueue.clear();

    for (final entry in itemsToFlush.entries) {
      try {
        await repository.recordWatchProgress(entry.value);
      } catch (e) {
        // In case of network failure, keep latest if not overwritten
        debugPrint('[WatchMetricsBuffer] Failed to flush progress for ${entry.key}: $e');
        if (!_pendingQueue.containsKey(entry.key)) {
          _pendingQueue[entry.key] = entry.value;
        }
      }
    }

    _isFlushing = false;
  }

  void dispose() {
    _flushTimer?.cancel();
    _pendingQueue.clear();
  }
}

final watchMetricsBufferProvider = Provider<WatchMetricsBuffer>((ref) {
  final repository = ref.watch(feedRepositoryProvider);
  final buffer = WatchMetricsBuffer(repository: repository);
  buffer.startPeriodicFlush();
  ref.onDispose(buffer.dispose);
  return buffer;
});
