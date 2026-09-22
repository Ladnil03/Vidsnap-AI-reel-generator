import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';

class AppErrorView extends StatelessWidget {
  const AppErrorView({super.key, required this.failure, this.onRetry});

  final AppFailure failure;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    IconData icon;
    Color iconColor;

    switch (failure.type) {
      case FailureType.network:
        icon = Icons.wifi_off_rounded;
        iconColor = isDark ? AppColors.warningDark : AppColors.warningLight;
        break;
      case FailureType.auth:
        icon = Icons.lock_outline_rounded;
        iconColor = isDark ? AppColors.dangerDark : AppColors.dangerLight;
        break;
      case FailureType.validation:
        icon = Icons.error_outline_rounded;
        iconColor = isDark ? AppColors.warningDark : AppColors.warningLight;
        break;
      case FailureType.server:
        icon = Icons.cloud_off_rounded;
        iconColor = isDark ? AppColors.dangerDark : AppColors.dangerLight;
        break;
      case FailureType.unknown:
        icon = Icons.warning_amber_rounded;
        iconColor = isDark ? AppColors.sage300 : AppColors.forest500;
        break;
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 72.0,
              height: 72.0,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Center(child: Icon(icon, size: 36.0, color: iconColor)),
            ),
            const SizedBox(height: AppSpacing.s4),
            Text(
              _titleForFailure(failure.type),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18.0,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.cream50 : AppColors.forest900,
              ),
            ),
            const SizedBox(height: AppSpacing.s2),
            Text(
              failure.message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14.0,
                color: isDark ? AppColors.sage300 : AppColors.forest700,
              ),
            ),
            if (onRetry != null &&
                (failure.isRetryable ||
                    failure.type == FailureType.network)) ...<Widget>[
              const SizedBox(height: AppSpacing.s5),
              AppButton(
                label: 'Retry',
                onPressed: onRetry,
                variant: AppButtonVariant.primary,
                leftIcon: const Icon(Icons.refresh_rounded, size: 18.0),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _titleForFailure(FailureType type) {
    switch (type) {
      case FailureType.network:
        return 'Connection Problem';
      case FailureType.auth:
        return 'Session Expired';
      case FailureType.validation:
        return 'Invalid Request';
      case FailureType.server:
        return 'Server Error';
      case FailureType.unknown:
        return 'Something Went Wrong';
    }
  }
}
