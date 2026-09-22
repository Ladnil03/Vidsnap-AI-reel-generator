import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/core/permissions/permission_service.dart';

void main() {
  group('PermissionService Unit Tests', () {
    late PermissionService service;

    setUp(() {
      service = PermissionService();
    });

    test('metadata provides clear rationale and icons for camera, mic, photos and storage', () {
      expect(PermissionService.metadata.containsKey(AppPermission.camera), isTrue);
      expect(PermissionService.metadata[AppPermission.camera]?.title, 'Camera Access');
      expect(PermissionService.metadata[AppPermission.microphone]?.title, 'Microphone Access');
      expect(PermissionService.metadata[AppPermission.photos]?.title, 'Photo & Video Library');
      expect(PermissionService.metadata[AppPermission.storage]?.title, 'Storage Access');
    });

    test('initial permission state defaults to denied before request', () async {
      final state = await service.checkPermission(AppPermission.camera);
      expect(state, AppPermissionState.denied);
    });

    test('mock permission state can be set and verified', () async {
      service.setMockState(AppPermission.photos, AppPermissionState.granted);
      final state = await service.checkPermission(AppPermission.photos);
      expect(state, AppPermissionState.granted);
    });

    testWidgets('shows educational rationale dialog when requesting permission and grants on accept', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                await service.requestPermission(AppPermission.camera, context: context);
              },
              child: const Text('Request Camera'),
            ),
          ),
        ),
      );

      // Tap button to trigger permission request
      await tester.tap(find.text('Request Camera'));
      await tester.pumpAndSettle();

      // Rationale dialog appears
      expect(find.text('Camera Access'), findsOneWidget);
      expect(find.textContaining('VidSnap.AI requires camera access'), findsOneWidget);
      expect(find.text('Allow Access'), findsOneWidget);

      // Tap 'Allow Access'
      await tester.tap(find.text('Allow Access'));
      await tester.pumpAndSettle();

      expect(find.text('Camera Access'), findsNothing);
      expect(service.getPermissionState(AppPermission.camera), AppPermissionState.granted);
    });

    testWidgets('educational rationale dialog denies permission when user taps Not Now', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                await service.requestPermission(AppPermission.microphone, context: context);
              },
              child: const Text('Request Mic'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Request Mic'));
      await tester.pumpAndSettle();

      expect(find.text('Microphone Access'), findsOneWidget);
      expect(find.text('Not Now'), findsOneWidget);

      // Tap 'Not Now'
      await tester.tap(find.text('Not Now'));
      await tester.pumpAndSettle();

      expect(service.getPermissionState(AppPermission.microphone), AppPermissionState.denied);
    });
  });
}
