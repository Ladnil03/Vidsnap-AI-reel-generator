import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

enum AppCardVariant { standard, raised, sunken }

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.variant = AppCardVariant.standard,
    this.onTap,
    this.padding = const EdgeInsets.all(AppSpacing.s4),
    this.margin = EdgeInsets.zero,
    this.borderRadius,
  });

  final Widget child;
  final AppCardVariant variant;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color backgroundColor;
    BorderSide borderSide;
    double elevation = 0.0;

    switch (variant) {
      case AppCardVariant.standard:
        backgroundColor = isDark ? AppColors.forest900 : AppColors.cream50;
        borderSide = BorderSide(
          color: isDark
              ? AppColors.borderDarkSubtle
              : AppColors.borderLightSubtle,
          width: 1.0,
        );
        break;
      case AppCardVariant.raised:
        backgroundColor = isDark
            ? AppColors.forest800
            : const Color(0xFFFAF8F2);
        borderSide = BorderSide(
          color: isDark
              ? AppColors.borderDarkMedium
              : AppColors.borderLightMedium,
          width: 1.0,
        );
        elevation = isDark ? 2.0 : 1.0;
        break;
      case AppCardVariant.sunken:
        backgroundColor = isDark ? const Color(0xFF050D07) : AppColors.cream200;
        borderSide = BorderSide.none;
        break;
    }

    final effectiveRadius = borderRadius ?? BorderRadius.circular(AppRadii.md);

    final cardWidget = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: effectiveRadius,
        border: borderSide == BorderSide.none
            ? null
            : Border.fromBorderSide(borderSide),
        boxShadow: elevation > 0
            ? <BoxShadow>[
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 8.0,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: effectiveRadius,
        child: InkWell(
          onTap: onTap,
          borderRadius: effectiveRadius,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );

    return cardWidget;
  }
}
