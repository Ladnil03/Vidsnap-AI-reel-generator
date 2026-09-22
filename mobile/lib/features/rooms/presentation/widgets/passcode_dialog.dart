import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';

class PasscodeDialog extends StatefulWidget {
  const PasscodeDialog({super.key, this.roomTitle = 'Private Room'});

  final String roomTitle;

  @override
  State<PasscodeDialog> createState() => _PasscodeDialogState();
}

class _PasscodeDialogState extends State<PasscodeDialog> {
  final _passcodeController = TextEditingController();
  String? _errorText;

  @override
  void dispose() {
    _passcodeController.dispose();
    super.dispose();
  }

  void _submit() {
    final code = _passcodeController.text.trim();
    if (code.isEmpty) {
      setState(() => _errorText = 'Passcode is required');
      return;
    }
    if (code.length < 8) {
      setState(() => _errorText = 'Passcode must be at least 8 characters');
      return;
    }
    Navigator.of(context).pop(code);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.lg),
      ),
      backgroundColor: isDark ? AppColors.forest900 : AppColors.cream50,
      insetPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s5),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(AppSpacing.s2),
                  decoration: BoxDecoration(
                    color: AppColors.moss500.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                  child: const Icon(
                    Icons.lock_outline,
                    color: AppColors.moss500,
                    size: 24,
                  ),
                ),
                const SizedBox(width: AppSpacing.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Private Room',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        widget.roomTitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: isDark
                              ? AppColors.cream300
                              : AppColors.forest700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s4),
            Text(
              'This Watch Together room is protected. Please enter the passcode provided by the host.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark ? AppColors.cream200 : AppColors.forest800,
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            AppTextField(
              label: 'Passcode',
              controller: _passcodeController,
              hintText: 'Enter secret passcode (min 8 chars)',
              isPassword: true,
              errorText: _errorText,
              prefixIcon: const Icon(Icons.key, size: 20),
              onChanged: (_) {
                if (_errorText != null) {
                  setState(() => _errorText = null);
                }
              },
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: AppSpacing.s6),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: <Widget>[
                AppButton(
                  label: 'Cancel',
                  variant: AppButtonVariant.ghost,
                  size: AppButtonSize.sm,
                  onPressed: () => Navigator.of(context).pop(null),
                ),
                const SizedBox(width: AppSpacing.s3),
                AppButton(
                  label: 'Join Party',
                  variant: AppButtonVariant.primary,
                  size: AppButtonSize.sm,
                  onPressed: _submit,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
