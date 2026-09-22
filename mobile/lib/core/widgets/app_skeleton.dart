import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

class AppSkeleton extends StatefulWidget {
  const AppSkeleton({super.key, this.width, this.height, this.borderRadius});

  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  @override
  State<AppSkeleton> createState() => _AppSkeletonState();
}

class _AppSkeletonState extends State<AppSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? AppColors.forest800 : AppColors.cream200;
    final highlightColor = isDark ? AppColors.forest700 : AppColors.cream50;

    // Respect reduced motion
    final disableAnimations = MediaQuery.of(context).disableAnimations;

    return Semantics(
      excludeSemantics: true,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final effectiveColor = disableAnimations
              ? baseColor
              : Color.lerp(baseColor, highlightColor, _controller.value)!;

          return Container(
            width: widget.width,
            height: widget.height,
            decoration: BoxDecoration(
              color: effectiveColor,
              borderRadius:
                  widget.borderRadius ?? BorderRadius.circular(AppRadii.sm),
            ),
          );
        },
      ),
    );
  }
}
