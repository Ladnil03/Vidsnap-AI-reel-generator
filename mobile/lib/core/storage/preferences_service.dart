import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PreferencesService {
  PreferencesService(this._prefs);

  final SharedPreferences _prefs;

  static const String _keyThemeMode = 'vidsnap_theme_mode';
  static const String _keyLocale = 'vidsnap_locale';

  ThemeMode getThemeMode() {
    final val = _prefs.getString(_keyThemeMode);
    switch (val) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    switch (mode) {
      case ThemeMode.light:
        await _prefs.setString(_keyThemeMode, 'light');
        break;
      case ThemeMode.dark:
        await _prefs.setString(_keyThemeMode, 'dark');
        break;
      case ThemeMode.system:
        await _prefs.setString(_keyThemeMode, 'system');
        break;
    }
  }

  String getLocaleCode() {
    return _prefs.getString(_keyLocale) ?? 'en';
  }

  Future<void> setLocaleCode(String code) async {
    await _prefs.setString(_keyLocale, code);
  }
}
