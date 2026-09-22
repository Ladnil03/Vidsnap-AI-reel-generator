import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

enum AppButtonVariant { primary, secondary, ghost, danger }

enum AppButtonSize { sm, md, lg }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.md,
    this.isLoading = false,
    this.isDisabled = false,
    this.leftIcon,
    this.rightIcon,
    this.isFullWidth = false,
    this.semanticLabel,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final bool isLoading;
  final bool isDisabled;
  final Widget? leftIcon;
  final Widget? rightIcon;
  final bool isFullWidth;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Resolve Colors according to design tokens
    Color backgroundColor;
    Color foregroundColor;
    BorderSide borderSide = BorderSide.none;

    switch (variant) {
      case AppButtonVariant.primary:
        backgroundColor = AppColors.forest500;
        foregroundColor = AppColors.cream50;
        break;
      case AppButtonVariant.secondary:
        backgroundColor = isDark ? AppColors.forest700 : AppColors.sage200;
        foregroundColor = isDark ? AppColors.cream50 : AppColors.forest900;
        break;
      case AppButtonVariant.ghost:
        backgroundColor = Colors.transparent;
        foregroundColor = isDark ? AppColors.sage300 : AppColors.forest700;
        borderSide = BorderSide(
          color: isDark
              ? AppColors.borderDarkSubtle
              : AppColors.borderLightMedium,
          width: 1.0,
        );
        break;
      case AppButtonVariant.danger:
        backgroundColor = isDark ? AppColors.dangerDark : AppColors.dangerLight;
        foregroundColor = isDark ? AppColors.forest950 : Colors.white;
        break;
    }

    if (isDisabled) {
      backgroundColor = isDark ? AppColors.forest800 : AppColors.cream200;
      foregroundColor = isDark ? AppColors.forest300 : AppColors.cream400;
      borderSide = BorderSide.none;
    }

    double height;
    EdgeInsets padding;
    double fontSize;

    switch (size) {
      case AppButtonSize.sm:
        height = 40.0;
        padding = const EdgeInsets.symmetric(horizontal: AppSpacing.s3);
        fontSize = 13.0;
        break;
      case AppButtonSize.md:
        height = 48.0;
        padding = const EdgeInsets.symmetric(horizontal: AppSpacing.s5);
        fontSize = 15.0;
        break;
      case AppButtonSize.lg:
        height = 56.0;
        padding = const EdgeInsets.symmetric(horizontal: AppSpacing.s6);
        fontSize = 16.0;
        break;
    }

    final buttonContent = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        if (isLoading) ...<Widget>[
          SizedBox(
            width: 18.0,
            height: 18.0,
            child: CircularProgressIndicator(
              strokeWidth: 2.0,
              valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
        ] else if (leftIcon != null) ...<Widget>[
          leftIcon!,
          const SizedBox(width: AppSpacing.s2),
        ],
        Text(
          label,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w600,
            color: foregroundColor,
          ),
        ),
        if (!isLoading && rightIcon != null) ...<Widget>[
          const SizedBox(width: AppSpacing.s2),
          rightIcon!,
        ],
      ],
    );

    return Semantics(
      button: true,
      enabled: !isDisabled && !isLoading,
      label: semanticLabel ?? label,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: isFullWidth ? double.infinity : 48.0,
          minHeight: 48.0, // WCAG minimum 48px touch target
        ),
        child: SizedBox(
          width: isFullWidth ? double.infinity : null,
          height: height,
          child: Material(
            color: backgroundColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadii.sm),
              side: borderSide,
            ),
            child: InkWell(
              onTap: (isDisabled || isLoading) ? null : onPressed,
              borderRadius: BorderRadius.circular(AppRadii.sm),
              child: Padding(padding: padding, child: buttonContent),
            ),
          ),
        ),
      ),
    );
  }
}
