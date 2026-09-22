import 'package:flutter/material.dart';

/// VidSnap.AI "Forest & Paper" Design Tokens
/// Exact values ported from docs/design-tokens.json
class AppColors {
  const AppColors._();

  // --- Cream Palette ---
  static const Color cream50 = Color(0xFFF7F4EB);
  static const Color cream100 = Color(0xFFEFE9D5);
  static const Color cream200 = Color(0xFFE5D9B6);
  static const Color cream300 = Color(0xFFD6C79A);
  static const Color cream400 = Color(0xFFC7B57F);

  // --- Sage Palette ---
  static const Color sage100 = Color(0xFFEDF3E4);
  static const Color sage200 = Color(0xFFDBE7C9);
  static const Color sage300 = Color(0xFFBDD69D);
  static const Color sage400 = Color(0xFFA4BE7B);
  static const Color sage500 = Color(0xFF8CA862);

  // --- Moss Palette ---
  static const Color moss100 = Color(0xFFE2ECDD);
  static const Color moss200 = Color(0xFFC4DAB8);
  static const Color moss300 = Color(0xFF90B680);
  static const Color moss500 = Color(0xFF5F8D4E);
  static const Color moss700 = Color(0xFF426535);
  static const Color moss800 = Color(0xFF334E2A);
  static const Color moss900 = Color(0xFF284020);

  // --- Forest Palette ---
  static const Color forest100 = Color(0xFFD2DFD5);
  static const Color forest200 = Color(0xFFA4BFAB);
  static const Color forest300 = Color(0xFF6F9776);
  static const Color forest500 = Color(0xFF285430);
  static const Color forest600 = Color(0xFF224729);
  static const Color forest700 = Color(0xFF1C3D22);
  static const Color forest800 = Color(0xFF152E1A);
  static const Color forest900 = Color(0xFF0E2012);
  static const Color forest950 = Color(0xFF08140B);

  // --- Feedback ---
  static const Color dangerLight = Color(0xFF9E3324);
  static const Color dangerDark = Color(0xFFFF9B8A);
  static const Color warningLight = Color(0xFF8C5300);
  static const Color warningDark = Color(0xFFFFC266);
  static const Color successLight = Color(0xFF1C5E28);
  static const Color successDark = Color(0xFF8BE299);

  // --- Scrims & Glow ---
  static const Color scrimModal = Color(0xBF08140B); // 0.75 opacity
  static const Color scrimHeavy = Color(0xE00E2012); // 0.88 opacity
  static const Color scrimMedium = Color(0xA60E2012); // 0.65 opacity
  static const Color scrimLight = Color(0x660E2012); // 0.40 opacity
  static const Color scrimDarkest = Color(0xF20E2012); // 0.95 opacity
  static const Color sageGlow = Color(0x59A4BE7B); // 0.35 opacity
  static const Color borderLightSubtle = Color(0x1F285430); // 0.12 opacity
  static const Color borderLightMedium = Color(0x38285430); // 0.22 opacity
  static const Color borderDarkSubtle = Color(0x24A4BE7B); // 0.14 opacity
  static const Color borderDarkMedium = Color(0x3DA4BE7B); // 0.24 opacity
}

/// Spacing scale in logical pixels (4-point grid)
class AppSpacing {
  const AppSpacing._();

  static const double s0 = 0.0;
  static const double s1 = 4.0;
  static const double s2 = 8.0;
  static const double s3 = 12.0;
  static const double s4 = 16.0;
  static const double s5 = 20.0;
  static const double s6 = 24.0;
  static const double s8 = 32.0;
  static const double s10 = 40.0;
  static const double s12 = 48.0;
  static const double s16 = 64.0;
  static const double s20 = 80.0;
}

/// Border Radii
class AppRadii {
  const AppRadii._();

  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double pill = 9999.0;
}
