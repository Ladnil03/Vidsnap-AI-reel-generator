import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/theme/app_typography.dart';

class AppTheme {
  const AppTheme._();

  /// Paper Theme (Light)
  static ThemeData get lightTheme {
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.forest500,
      onPrimary: AppColors.cream50,
      primaryContainer: AppColors.sage200,
      onPrimaryContainer: AppColors.forest900,
      secondary: AppColors.moss500,
      onSecondary: Colors.white,
      secondaryContainer: AppColors.sage100,
      onSecondaryContainer: AppColors.forest900,
      tertiary: AppColors.forest700,
      onTertiary: AppColors.cream50,
      error: AppColors.dangerLight,
      onError: Colors.white,
      surface: AppColors.cream50,
      onSurface: AppColors.forest900,
      surfaceContainerLowest: AppColors.cream50,
      surfaceContainerLow: AppColors.cream100,
      surfaceContainer: AppColors.cream200,
      surfaceContainerHigh: Color(0xFFFAF8F2),
      surfaceContainerHighest: AppColors.cream300,
      outline: AppColors.forest500,
      outlineVariant: AppColors.borderLightSubtle,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.cream100,
      canvasColor: AppColors.cream100,
      textTheme: AppTypography.createTextTheme(AppColors.forest900),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.cream100,
        foregroundColor: AppColors.forest900,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.cream50,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          side: const BorderSide(color: AppColors.borderLightSubtle, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s4,
          vertical: AppSpacing.s3,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.borderLightMedium, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.borderLightSubtle, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.forest700, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.dangerLight, width: 1.0),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.dangerLight, width: 2.0),
        ),
        hintStyle: const TextStyle(color: AppColors.forest300, fontSize: 14.0),
        labelStyle: const TextStyle(color: AppColors.forest700, fontSize: 14.0),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.forest500,
          foregroundColor: AppColors.cream50,
          minimumSize: const Size(48.0, 48.0),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s5, vertical: AppSpacing.s3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.sm),
          ),
          elevation: 0,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderLightSubtle,
        thickness: 1.0,
        space: 1.0,
      ),
    );
  }

  /// Forest Theme (Dark)
  static ThemeData get darkTheme {
    const colorScheme = ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.forest500,
      onPrimary: AppColors.cream50,
      primaryContainer: AppColors.forest700,
      onPrimaryContainer: AppColors.cream50,
      secondary: AppColors.moss500,
      onSecondary: Colors.white,
      secondaryContainer: Color(0x2EA4BE7B),
      onSecondaryContainer: AppColors.sage300,
      tertiary: AppColors.forest300,
      onTertiary: AppColors.forest950,
      error: AppColors.dangerDark,
      onError: AppColors.forest950,
      surface: AppColors.forest900,
      onSurface: AppColors.cream50,
      surfaceContainerLowest: AppColors.forest950,
      surfaceContainerLow: Color(0xFF050D07),
      surfaceContainer: AppColors.forest900,
      surfaceContainerHigh: AppColors.forest800,
      surfaceContainerHighest: Color(0xFF1C3D22),
      outline: AppColors.sage400,
      outlineVariant: AppColors.borderDarkSubtle,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.forest950,
      canvasColor: AppColors.forest950,
      textTheme: AppTypography.createTextTheme(AppColors.cream50),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.forest950,
        foregroundColor: AppColors.cream50,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.forest800,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          side: const BorderSide(color: AppColors.borderDarkSubtle, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.forest900,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s4,
          vertical: AppSpacing.s3,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.borderDarkMedium, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.borderDarkSubtle, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.sage400, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.dangerDark, width: 1.0),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.sm),
          borderSide: const BorderSide(color: AppColors.dangerDark, width: 2.0),
        ),
        hintStyle: const TextStyle(color: AppColors.forest300, fontSize: 14.0),
        labelStyle: const TextStyle(color: AppColors.cream200, fontSize: 14.0),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.forest500,
          foregroundColor: AppColors.cream50,
          minimumSize: const Size(48.0, 48.0),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s5, vertical: AppSpacing.s3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.sm),
          ),
          elevation: 0,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderDarkSubtle,
        thickness: 1.0,
        space: 1.0,
      ),
    );
  }
}
