import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/widgets/splash_screen.dart';

void main() {
  group('SplashScreen Widget Tests', () {
    testWidgets(
      'renders brand wordmark, tagline, spinner, and release version tag',
      (tester) async {
        await tester.pumpWidget(const MaterialApp(home: SplashScreen()));

        // Verify play arrow icon is rendered
        expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

        // Verify tagline
        expect(find.text('AI-Powered Vertical Reels'), findsOneWidget);

        // Verify CircularProgressIndicator
        expect(find.byType(CircularProgressIndicator), findsOneWidget);

        // Verify version tag
        expect(find.text('v1.0.0 • Release'), findsOneWidget);

        // Advance animation timer
        await tester.pump(const Duration(milliseconds: 600));
        expect(find.text('AI-Powered Vertical Reels'), findsOneWidget);
      },
    );
  });
}
