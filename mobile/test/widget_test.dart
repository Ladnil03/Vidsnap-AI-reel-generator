import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/main.dart';

void main() {
  testWidgets('App root smoke test renders VidSnap.AI Mobile', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: VidSnapApp(),
      ),
    );

    expect(find.text('VidSnap.AI Mobile'), findsOneWidget);
  });
}
