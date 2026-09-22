import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/widgets/connectivity_banner.dart';

void main() {
  group('ConnectivityBanner Widget Tests', () {
    testWidgets('renders child content without banner when online', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ConnectivityBanner(child: Text('Main Feed Content')),
          ),
        ),
      );

      expect(find.text('Main Feed Content'), findsOneWidget);
      expect(find.byKey(const Key('offline_banner')), findsNothing);
      expect(find.byKey(const Key('reconnected_banner')), findsNothing);
    });

    testWidgets('displays offline banner when network drops to offline', (
      tester,
    ) async {
      late WidgetRef capturedRef;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Consumer(
              builder: (context, ref, _) {
                capturedRef = ref;
                return const ConnectivityBanner(
                  child: Text('Main Feed Content'),
                );
              },
            ),
          ),
        ),
      );

      expect(find.byKey(const Key('offline_banner')), findsNothing);

      // Trigger offline status
      capturedRef.read(connectivityProvider.notifier).setOnlineStatus(false);
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('offline_banner')), findsOneWidget);
      expect(find.textContaining('Working in Offline Mode'), findsOneWidget);

      // Trigger reconnect status
      capturedRef.read(connectivityProvider.notifier).setOnlineStatus(true);
      await tester.pump();

      expect(find.byKey(const Key('offline_banner')), findsNothing);
      expect(find.byKey(const Key('reconnected_banner')), findsOneWidget);
      expect(find.textContaining('Back Online'), findsOneWidget);

      // Fast forward past the 3-second auto-dismiss timer
      await tester.pump(const Duration(seconds: 4));
      expect(find.byKey(const Key('reconnected_banner')), findsNothing);
    });
  });
}
