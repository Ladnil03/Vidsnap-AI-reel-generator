import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/router/deep_link_service.dart';

void main() {
  group('DeepLinkService Unit Tests', () {
    const service = DeepLinkService();

    group('Custom Scheme (vidsnap://)', () {
      test('resolves vidsnap://reel/reel_123 to /reel/reel_123', () {
        final uri = Uri.parse('vidsnap://reel/reel_123');
        final route = service.resolveDeepLink(uri);
        expect(route, '/reel/reel_123');
      });

      test('resolves vidsnap://room/room_abc?passcode=9999 to /rooms/room_abc?passcode=9999', () {
        final uri = Uri.parse('vidsnap://room/room_abc?passcode=9999');
        final route = service.resolveDeepLink(uri);
        expect(route, '/rooms/room_abc?passcode=9999');
      });

      test('resolves vidsnap://creator/alex_dev to /creator/alex_dev', () {
        final uri = Uri.parse('vidsnap://creator/alex_dev');
        final route = service.resolveDeepLink(uri);
        expect(route, '/creator/alex_dev');
      });

      test('resolves vidsnap://create to /create', () {
        final uri = Uri.parse('vidsnap://create');
        final route = service.resolveDeepLink(uri);
        expect(route, '/create');
      });

      test('resolves vidsnap://campaigns to /business/campaigns', () {
        final uri = Uri.parse('vidsnap://campaigns');
        final route = service.resolveDeepLink(uri);
        expect(route, '/business/campaigns');
      });

      test('resolves vidsnap://companion to /companion', () {
        final uri = Uri.parse('vidsnap://companion');
        final route = service.resolveDeepLink(uri);
        expect(route, '/companion');
      });

      test('resolves vidsnap://quests to /gamification', () {
        final uri = Uri.parse('vidsnap://quests');
        final route = service.resolveDeepLink(uri);
        expect(route, '/gamification');
      });
    });

    group('Universal Links (https://vidsnap.ai)', () {
      test('resolves https://vidsnap.ai/reel/reel_xyz to /reel/reel_xyz', () {
        final uri = Uri.parse('https://vidsnap.ai/reel/reel_xyz');
        final route = service.resolveDeepLink(uri);
        expect(route, '/reel/reel_xyz');
      });

      test('resolves https://app.vidsnap.ai/room/room_test to /rooms/room_test', () {
        final uri = Uri.parse('https://app.vidsnap.ai/room/room_test');
        final route = service.resolveDeepLink(uri);
        expect(route, '/rooms/room_test');
      });

      test('resolves https://vidsnap.ai/collabs to /business/campaigns', () {
        final uri = Uri.parse('https://vidsnap.ai/collabs');
        final route = service.resolveDeepLink(uri);
        expect(route, '/business/campaigns');
      });

      test('resolves unsupported external url to null', () {
        final uri = Uri.parse('https://example.com/reel/123');
        final route = service.resolveDeepLink(uri);
        expect(route, isNull);
      });
    });
  });
}
