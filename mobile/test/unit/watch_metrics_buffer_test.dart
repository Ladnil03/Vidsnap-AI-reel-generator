import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/feed/data/feed_repository.dart';
import 'package:vidsnap_ai/features/feed/data/watch_metrics_buffer.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';

class _FakeFeedRepository implements FeedRepository {
  final List<WatchProgressRequestModel> recordedBeacons = <WatchProgressRequestModel>[];

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #recordWatchProgress) {
      final req = invocation.positionalArguments.first as WatchProgressRequestModel;
      recordedBeacons.add(req);
      return Future<WatchProgressModel>.value(
        WatchProgressModel(
          videoId: req.videoId,
          watchedSeconds: req.watchedSeconds,
          totalSeconds: req.totalSeconds,
          percentage: (req.watchedSeconds / req.totalSeconds) * 100,
          completed: req.completed,
          updatedAt: DateTime.now(),
        ),
      );
    }
    return super.noSuchMethod(invocation);
  }
}

void main() {
  group('WatchMetricsBuffer Unit Tests', () {
    late _FakeFeedRepository fakeRepository;
    late WatchMetricsBuffer buffer;

    setUp(() {
      fakeRepository = _FakeFeedRepository();
      buffer = WatchMetricsBuffer(repository: fakeRepository);
    });

    tearDown(() {
      buffer.dispose();
    });

    test('recordProgress updates pending beacon and flushes to repository', () async {
      buffer.recordProgress(
        videoId: 'vid-10',
        watchedSeconds: 5.0,
        totalSeconds: 20.0,
      );

      // Overwrite with newer progress for same video
      buffer.recordProgress(
        videoId: 'vid-10',
        watchedSeconds: 15.0,
        totalSeconds: 20.0,
        completed: false,
      );

      // Record another video
      buffer.recordProgress(
        videoId: 'vid-20',
        watchedSeconds: 10.0,
        totalSeconds: 10.0,
        completed: true,
      );

      await buffer.flush();

      expect(fakeRepository.recordedBeacons.length, 2);
      final beacon1 = fakeRepository.recordedBeacons.firstWhere((b) => b.videoId == 'vid-10');
      expect(beacon1.watchedSeconds, 15.0);
      expect(beacon1.completed, false);

      final beacon2 = fakeRepository.recordedBeacons.firstWhere((b) => b.videoId == 'vid-20');
      expect(beacon2.watchedSeconds, 10.0);
      expect(beacon2.completed, true);
    });

    test('ignores invalid video IDs or non-positive total seconds', () async {
      buffer.recordProgress(
        videoId: '',
        watchedSeconds: 5.0,
        totalSeconds: 20.0,
      );
      buffer.recordProgress(
        videoId: 'vid-3',
        watchedSeconds: 5.0,
        totalSeconds: 0.0,
      );

      await buffer.flush();

      expect(fakeRepository.recordedBeacons.isEmpty, true);
    });
  });
}
