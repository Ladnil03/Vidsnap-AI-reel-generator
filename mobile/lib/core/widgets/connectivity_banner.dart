import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

@immutable
class ConnectivityStatus {
  const ConnectivityStatus({required this.isOnline, this.wasOffline = false});

  final bool isOnline;
  final bool wasOffline;

  ConnectivityStatus copyWith({bool? isOnline, bool? wasOffline}) {
    return ConnectivityStatus(
      isOnline: isOnline ?? this.isOnline,
      wasOffline: wasOffline ?? this.wasOffline,
    );
  }
}

class ConnectivityNotifier extends Notifier<ConnectivityStatus> {
  Timer? _reconnectTimer;

  @override
  ConnectivityStatus build() {
    ref.onDispose(() {
      _reconnectTimer?.cancel();
    });
    return const ConnectivityStatus(isOnline: true);
  }

  void setOnlineStatus(bool online) {
    if (state.isOnline == online) return;

    TelemetryService.instance.addBreadcrumb(
      online ? 'Network restored: online' : 'Network lost: offline',
      category: 'network',
    );

    if (online) {
      state = state.copyWith(isOnline: true, wasOffline: true);
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 3), () {
        if (state.isOnline) {
          state = state.copyWith(wasOffline: false);
        }
      });
    } else {
      _reconnectTimer?.cancel();
      state = state.copyWith(isOnline: false, wasOffline: false);
    }
  }
}

final connectivityProvider =
    NotifierProvider<ConnectivityNotifier, ConnectivityStatus>(
      ConnectivityNotifier.new,
    );

/// Wraps the screen or app shell to display non-intrusive offline & reconnect banners.
class ConnectivityBanner extends ConsumerWidget {
  const ConnectivityBanner({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(connectivityProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    Widget? bannerWidget;

    if (!status.isOnline) {
      bannerWidget = Container(
        key: const Key('offline_banner'),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s3,
          vertical: 6,
        ),
        color: isDark ? AppColors.forest900 : AppColors.sage200,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(
              Icons.wifi_off_rounded,
              size: 14,
              color: isDark ? AppColors.cream100 : AppColors.forest800,
            ),
            const SizedBox(width: AppSpacing.s2),
            Flexible(
              child: Text(
                'Working in Offline Mode • Cached reels available',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.cream100 : AppColors.forest800,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    } else if (status.wasOffline) {
      bannerWidget = Container(
        key: const Key('reconnected_banner'),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s3,
          vertical: 6,
        ),
        color: AppColors.moss500,
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(Icons.wifi_rounded, size: 14, color: Colors.white),
            SizedBox(width: AppSpacing.s2),
            Text(
              'Back Online • Feed synchronized',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: <Widget>[
        ?bannerWidget,
        Expanded(child: child),
      ],
    );
  }
}
