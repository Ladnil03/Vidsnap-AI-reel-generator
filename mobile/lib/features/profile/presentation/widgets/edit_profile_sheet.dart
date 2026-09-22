import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/profile/domain/profile_models.dart';
import 'package:vidsnap_ai/features/profile/presentation/providers/profile_provider.dart';

class EditProfileSheet extends ConsumerStatefulWidget {
  const EditProfileSheet({super.key, required this.initialProfile});

  final UserProfileModel initialProfile;

  static Future<void> show(
    BuildContext context,
    UserProfileModel initialProfile,
  ) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EditProfileSheet(initialProfile: initialProfile),
    );
  }

  @override
  ConsumerState<EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<EditProfileSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _bioController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialProfile.name);
    _bioController = TextEditingController(text: widget.initialProfile.bio);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final name = _nameController.text.trim();
    final bio = _bioController.text.trim();

    final success = await ref
        .read(profileNotifierProvider.notifier)
        .updateProfile(UpdateProfileInput(name: name, bio: bio));

    if (mounted && success) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully! ✨'),
          backgroundColor: AppColors.moss500,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(profileNotifierProvider);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(
        left: AppSpacing.s4,
        right: AppSpacing.s4,
        top: AppSpacing.s4,
        bottom: AppSpacing.s6 + bottomInset,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.forest900 : AppColors.cream50,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppRadii.lg),
        ),
        border: Border.all(
          color: isDark
              ? AppColors.borderDarkSubtle
              : AppColors.borderLightSubtle,
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest700 : AppColors.cream300,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            Text(
              'Edit Profile',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Display Name',
              hintText: 'Your name or handle',
              controller: _nameController,
            ),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Bio',
              hintText: 'Share a few words about what you create...',
              controller: _bioController,
              maxLines: 3,
            ),
            const SizedBox(height: AppSpacing.s6),
            AppButton(
              label: 'Save Changes',
              isLoading: state.isSaving,
              onPressed: _handleSave,
            ),
          ],
        ),
      ),
    );
  }
}
