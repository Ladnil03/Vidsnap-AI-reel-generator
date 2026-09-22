import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/theme/app_theme.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';

void main() {
  Widget createTestWidget(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: Padding(padding: const EdgeInsets.all(16.0), child: child)),
    );
  }

  group('AppTextField Widget Tests', () {
    testWidgets('renders label and receives text input', (tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        createTestWidget(
          AppTextField(
            label: 'Email Address',
            controller: controller,
            hintText: 'Enter your email',
          ),
        ),
      );

      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('Enter your email'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'test@example.com');
      expect(controller.text, equals('test@example.com'));
    });

    testWidgets('renders error text when errorText is provided', (tester) async {
      await tester.pumpWidget(
        createTestWidget(
          const AppTextField(
            label: 'Password',
            errorText: 'Password too short',
          ),
        ),
      );

      expect(find.text('Password too short'), findsOneWidget);
    });
  });
}
