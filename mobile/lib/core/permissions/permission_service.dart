import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';

enum AppPermission { camera, microphone, photos, storage }

enum AppPermissionState { granted, denied, permanentlyDenied, restricted }

@immutable
class PermissionMetadata {
  const PermissionMetadata({
    required this.permission,
    required this.title,
    required this.rationale,
    required this.icon,
  });

  final AppPermission permission;
  final String title;
  final String rationale;
  final IconData icon;
}

class PermissionService {
  PermissionService();

  static const Map<AppPermission, PermissionMetadata> metadata = {
    AppPermission.camera: PermissionMetadata(
      permission: AppPermission.camera,
      title: 'Camera Access',
      rationale: 'VidSnap.AI requires camera access so you can shoot vertical reels, live stream, and capture moments directly within the app.',
      icon: Icons.videocam_rounded,
    ),
    AppPermission.microphone: PermissionMetadata(
      permission: AppPermission.microphone,
      title: 'Microphone Access',
      rationale: 'VidSnap.AI requires microphone access to record audio with your video reels and enable voice participation in Watch Together party rooms.',
      icon: Icons.mic_rounded,
    ),
    AppPermission.photos: PermissionMetadata(
      permission: AppPermission.photos,
      title: 'Photo & Video Library',
      rationale: 'VidSnap.AI requires media library access so you can select saved videos from your gallery, import clips, and upload your profile avatar.',
      icon: Icons.photo_library_rounded,
    ),
    AppPermission.storage: PermissionMetadata(
      permission: AppPermission.storage,
      title: 'Storage Access',
      rationale: 'VidSnap.AI requires local storage permissions to save video reel drafts offline and cache playback chunks for zero-buffering.',
      icon: Icons.folder_rounded,
    ),
  };

  final Map<AppPermission, AppPermissionState> _cachedStates =
      <AppPermission, AppPermissionState>{};

  AppPermissionState getPermissionState(AppPermission permission) {
    return _cachedStates[permission] ?? AppPermissionState.denied;
  }

  void setMockState(AppPermission permission, AppPermissionState state) {
    _cachedStates[permission] = state;
  }

  Future<AppPermissionState> checkPermission(AppPermission permission) async {
    return _cachedStates[permission] ?? AppPermissionState.denied;
  }

  Future<AppPermissionState> requestPermission(
    AppPermission permission, {
    required BuildContext context,
    bool showRationale = true,
  }) async {
    TelemetryService.instance.addBreadcrumb(
      'Requesting permission: ${permission.name}',
      category: 'permissions',
    );

    // If already granted, return immediately
    final current = await checkPermission(permission);
    if (current == AppPermissionState.granted) {
      return AppPermissionState.granted;
    }

    if (!context.mounted) return current;

    // Show educational rationale dialog
    if (showRationale) {
      final userAccepted = await showDialog<bool>(
        context: context,
        builder: (dialogCtx) => _buildRationaleDialog(dialogCtx, permission),
      );

      if (userAccepted != true) {
        _cachedStates[permission] = AppPermissionState.denied;
        return AppPermissionState.denied;
      }
    }

    // Mark granted after user explicitly accepts rationale
    _cachedStates[permission] = AppPermissionState.granted;
    TelemetryService.instance.addBreadcrumb(
      'Permission granted: ${permission.name}',
      category: 'permissions',
    );
    return AppPermissionState.granted;
  }

  Widget _buildRationaleDialog(BuildContext context, AppPermission permission) {
    final meta = metadata[permission]!;
    final theme = Theme.of(context);

    return AlertDialog(
      title: Row(
        children: <Widget>[
          Icon(meta.icon, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(child: Text(meta.title)),
        ],
      ),
      content: Text(meta.rationale),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Not Now'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Allow Access'),
        ),
      ],
    );
  }
}

final permissionServiceProvider = Provider<PermissionService>((ref) {
  return PermissionService();
});
