import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.hintText,
    this.helperText,
    this.errorText,
    this.isPassword = false,
    this.keyboardType,
    this.textInputAction,
    this.prefixIcon,
    this.suffixIcon,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
    this.semanticLabel,
  });

  final String label;
  final TextEditingController? controller;
  final String? hintText;
  final String? helperText;
  final String? errorText;
  final bool isPassword;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Semantics(
      label: semanticLabel ?? label,
      textField: true,
      enabled: enabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            label,
            style: TextStyle(
              fontSize: 14.0,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.cream200 : AppColors.forest700,
            ),
          ),
          const SizedBox(height: AppSpacing.s1),
          TextField(
            controller: controller,
            obscureText: isPassword,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            enabled: enabled,
            onChanged: onChanged,
            onSubmitted: onSubmitted,
            style: TextStyle(
              fontSize: 15.0,
              color: isDark ? AppColors.cream50 : AppColors.forest900,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              errorText: errorText,
              prefixIcon: prefixIcon,
              suffixIcon: suffixIcon,
              helperText: helperText,
            ),
          ),
        ],
      ),
    );
  }
}
