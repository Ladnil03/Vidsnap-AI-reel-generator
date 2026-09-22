import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTypography {
  const AppTypography._();

  static const List<String> fallbackFonts = <String>[
    'Noto Sans Devanagari',
    'Noto Sans Gujarati',
    'Roboto',
  ];

  static TextTheme createTextTheme(Color primaryTextColor) {
    final baseTheme = GoogleFonts.plusJakartaSansTextTheme();
    final headingFont = GoogleFonts.outfit();

    return baseTheme.copyWith(
      displayLarge: headingFont.copyWith(
        fontSize: 32.0,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
        color: primaryTextColor,
      ),
      displayMedium: headingFont.copyWith(
        fontSize: 28.0,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: primaryTextColor,
      ),
      displaySmall: headingFont.copyWith(
        fontSize: 24.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      headlineLarge: headingFont.copyWith(
        fontSize: 22.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      headlineMedium: headingFont.copyWith(
        fontSize: 20.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      headlineSmall: headingFont.copyWith(
        fontSize: 18.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      titleLarge: headingFont.copyWith(
        fontSize: 16.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      titleMedium: GoogleFonts.plusJakartaSans(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      titleSmall: GoogleFonts.plusJakartaSans(
        fontSize: 12.0,
        fontWeight: FontWeight.w600,
        color: primaryTextColor,
      ),
      bodyLarge: GoogleFonts.plusJakartaSans(
        fontSize: 16.0,
        fontWeight: FontWeight.w400,
        color: primaryTextColor,
      ),
      bodyMedium: GoogleFonts.plusJakartaSans(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        color: primaryTextColor,
      ),
      bodySmall: GoogleFonts.plusJakartaSans(
        fontSize: 12.0,
        fontWeight: FontWeight.w400,
        color: primaryTextColor,
      ),
      labelLarge: GoogleFonts.plusJakartaSans(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.1,
        color: primaryTextColor,
      ),
      labelMedium: GoogleFonts.plusJakartaSans(
        fontSize: 12.0,
        fontWeight: FontWeight.w500,
        color: primaryTextColor,
      ),
      labelSmall: GoogleFonts.plusJakartaSans(
        fontSize: 10.0,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.2,
        color: primaryTextColor,
      ),
    );
  }
}
