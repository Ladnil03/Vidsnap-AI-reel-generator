import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/rooms/presentation/providers/rooms_provider.dart';

class CreateRoomSheet extends ConsumerStatefulWidget {
  const CreateRoomSheet({super.key});

  @override
  ConsumerState<CreateRoomSheet> createState() => _CreateRoomSheetState();
}

class _CreateRoomSheetState extends ConsumerState<CreateRoomSheet> {
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _passcodeController = TextEditingController();
  final _mediaTitleController = TextEditingController();
  final _mediaUrlController = TextEditingController();

  String _roomType = 'public';
  String? _nameError;
  String? _passcodeError;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _passcodeController.dispose();
    _mediaTitleController.dispose();
    _mediaUrlController.dispose();
    super.dispose();
  }

  Future<void> _handleCreate() async {
    final name = _nameController.text.trim();
    if (name.length < 2) {
      setState(() => _nameError = 'Room name must be at least 2 characters');
      return;
    }

    final isPrivate = _roomType == 'private';
    final passcode = _passcodeController.text.trim();
    if (isPrivate && passcode.length < 8) {
      setState(
        () => _passcodeError =
            'Private rooms require a passcode of at least 8 characters',
      );
      return;
    }

    final notifier = ref.read(roomsLobbyProvider.notifier);
    final room = await notifier.createRoom(
      name: name,
      description: _descriptionController.text.trim(),
      roomType: _roomType,
      passcode: isPrivate ? passcode : null,
      initialMediaTitle: _mediaTitleController.text.trim().isNotEmpty
          ? _mediaTitleController.text.trim()
          : null,
      initialMediaUrl: _mediaUrlController.text.trim().isNotEmpty
          ? _mediaUrlController.text.trim()
          : null,
    );

    if (mounted && room != null) {
      Navigator.of(context).pop(room);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final lobbyState = ref.watch(roomsLobbyProvider);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.forest950 : AppColors.cream50,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppRadii.xl),
        ),
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.s5,
        right: AppSpacing.s5,
        top: AppSpacing.s5,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.s6,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest800 : AppColors.cream300,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            Row(
              children: <Widget>[
                const Icon(
                  Icons.video_library_outlined,
                  color: AppColors.moss500,
                ),
                const SizedBox(width: AppSpacing.s2),
                Text(
                  'Host Watch Party',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s2),
            Text(
              'Invite friends to stream videos synchronously with live chat and audio.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark ? AppColors.cream300 : AppColors.forest700,
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Room Name',
              controller: _nameController,
              hintText: 'e.g. Saturday Night Anime Party',
              errorText: _nameError,
              prefixIcon: const Icon(Icons.meeting_room, size: 20),
              onChanged: (_) {
                if (_nameError != null) setState(() => _nameError = null);
              },
            ),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Description (Optional)',
              controller: _descriptionController,
              hintText: 'What are you watching together?',
              prefixIcon: const Icon(Icons.notes, size: 20),
            ),
            const SizedBox(height: AppSpacing.s4),
            Text(
              'Room Privacy',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.s2),
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.public, size: 18),
                    label: const Text('Public'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _roomType == 'public'
                          ? AppColors.moss500
                          : (isDark ? AppColors.cream300 : AppColors.forest700),
                      backgroundColor: _roomType == 'public'
                          ? AppColors.moss500.withValues(alpha: 0.15)
                          : Colors.transparent,
                      side: BorderSide(
                        color: _roomType == 'public'
                            ? AppColors.moss500
                            : AppColors.borderLightSubtle,
                      ),
                    ),
                    onPressed: () => setState(() => _roomType = 'public'),
                  ),
                ),
                const SizedBox(width: AppSpacing.s3),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.lock, size: 18),
                    label: const Text('Private'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _roomType == 'private'
                          ? AppColors.moss500
                          : (isDark ? AppColors.cream300 : AppColors.forest700),
                      backgroundColor: _roomType == 'private'
                          ? AppColors.moss500.withValues(alpha: 0.15)
                          : Colors.transparent,
                      side: BorderSide(
                        color: _roomType == 'private'
                            ? AppColors.moss500
                            : AppColors.borderLightSubtle,
                      ),
                    ),
                    onPressed: () => setState(() => _roomType = 'private'),
                  ),
                ),
              ],
            ),
            if (_roomType == 'private') ...[
              const SizedBox(height: AppSpacing.s4),
              AppTextField(
                label: 'Room Passcode',
                controller: _passcodeController,
                hintText: 'Min 8 characters secret',
                isPassword: true,
                errorText: _passcodeError,
                prefixIcon: const Icon(Icons.password, size: 20),
                onChanged: (_) {
                  if (_passcodeError != null) {
                    setState(() => _passcodeError = null);
                  }
                },
              ),
            ],
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Initial Video Title (Optional)',
              controller: _mediaTitleController,
              hintText: 'e.g. Cyberpunk Neon Highlights',
              prefixIcon: const Icon(Icons.subtitles, size: 20),
            ),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Initial Video URL (Optional)',
              controller: _mediaUrlController,
              hintText: 'https://...',
              prefixIcon: const Icon(Icons.link, size: 20),
            ),
            if (lobbyState.errorMessage != null) ...[
              const SizedBox(height: AppSpacing.s3),
              Text(
                lobbyState.errorMessage!,
                style: TextStyle(
                  color: isDark ? AppColors.dangerDark : AppColors.dangerLight,
                  fontSize: 13,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.s6),
            AppButton(
              label: 'Host Party Room',
              isLoading: lobbyState.isCreating,
              isFullWidth: true,
              onPressed: _handleCreate,
            ),
          ],
        ),
      ),
    );
  }
}
