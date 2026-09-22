import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';

/// Service responsible for parsing and routing inbound universal links and custom schemes.
class DeepLinkService {
  const DeepLinkService();

  static const String customScheme = 'vidsnap';
  static const List<String> supportedHosts = [
    'vidsnap.ai',
    'app.vidsnap.ai',
    'www.vidsnap.ai',
  ];

  /// Resolves an incoming [uri] into an internal GoRouter route path.
  /// Returns `null` if the URI does not belong to VidSnap.AI.
  String? resolveDeepLink(Uri uri) {
    TelemetryService.instance.addBreadcrumb(
      'Resolving deep link: $uri',
      category: 'deep_link',
      data: <String, dynamic>{'scheme': uri.scheme, 'host': uri.host, 'path': uri.path},
    );

    // 1. Custom Scheme: vidsnap://...
    if (uri.scheme.toLowerCase() == customScheme) {
      return _parseCustomScheme(uri);
    }

    // 2. Universal Link: https://vidsnap.ai/...
    if ((uri.scheme == 'https' || uri.scheme == 'http') &&
        supportedHosts.contains(uri.host.toLowerCase())) {
      return _parseUniversalLink(uri);
    }

    return null;
  }

  String? _parseCustomScheme(Uri uri) {
    // In vidsnap://reel/123 -> host is 'reel', pathSegments might be ['123']
    // In vidsnap:///reel/123 -> host is '', pathSegments is ['reel', '123']
    final List<String> segments = [];
    if (uri.host.isNotEmpty) {
      segments.add(uri.host.toLowerCase());
    }
    segments.addAll(uri.pathSegments.map((s) => s.toLowerCase()));

    if (segments.isEmpty) return '/feed';

    final root = segments.first;
    final query = uri.hasQuery ? '?${uri.query}' : '';

    switch (root) {
      case 'reel':
      case 'video':
        if (segments.length >= 2) {
          return '/reel/${segments[1]}$query';
        }
        return '/feed$query';

      case 'room':
      case 'rooms':
        if (segments.length >= 2) {
          return '/rooms/${segments[1]}$query';
        }
        return '/rooms$query';

      case 'creator':
        if (segments.length >= 2) {
          return '/creator/${segments[1]}$query';
        }
        return '/creator/dashboard';

      case 'campaigns':
      case 'business':
      case 'collabs':
        return '/business/campaigns$query';

      case 'create':
        return '/create$query';

      case 'explore':
        return '/explore$query';

      case 'companion':
        return '/companion$query';

      case 'gamification':
      case 'quests':
        return '/gamification$query';

      case 'profile':
        return '/profile$query';

      default:
        return '/feed';
    }
  }

  String? _parseUniversalLink(Uri uri) {
    final segments = uri.pathSegments;
    if (segments.isEmpty) return '/feed';

    final root = segments.first.toLowerCase();
    final query = uri.hasQuery ? '?${uri.query}' : '';

    switch (root) {
      case 'reel':
      case 'video':
        if (segments.length >= 2) {
          return '/reel/${segments[1]}$query';
        }
        return '/feed$query';

      case 'room':
      case 'rooms':
        if (segments.length >= 2) {
          return '/rooms/${segments[1]}$query';
        }
        return '/rooms$query';

      case 'creator':
        if (segments.length >= 2) {
          return '/creator/${segments[1]}$query';
        }
        return '/creator/dashboard';

      case 'collabs':
      case 'business':
        return '/business/campaigns$query';

      case 'companion':
        return '/companion$query';

      case 'gamification':
        return '/gamification$query';

      default:
        return uri.path.isNotEmpty ? '${uri.path}$query' : '/feed';
    }
  }
}
