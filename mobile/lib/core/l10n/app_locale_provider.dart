import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/theme_provider.dart';

class SupportedLocale {
  const SupportedLocale({
    required this.code,
    required this.name,
    required this.nativeName,
  });

  final String code;
  final String name;
  final String nativeName;
}

class AppLocales {
  const AppLocales._();

  static const SupportedLocale en = SupportedLocale(
    code: 'en',
    name: 'English',
    nativeName: 'English',
  );

  static const SupportedLocale hi = SupportedLocale(
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
  );

  static const SupportedLocale gu = SupportedLocale(
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
  );

  static const List<SupportedLocale> all = <SupportedLocale>[en, hi, gu];

  static const List<Locale> flutterLocales = <Locale>[
    Locale('en', ''),
    Locale('hi', ''),
    Locale('gu', ''),
  ];
}

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    final code = ref.watch(preferencesServiceProvider).getLocaleCode();
    return Locale(code, '');
  }

  Future<void> setLocale(String languageCode) async {
    state = Locale(languageCode, '');
    await ref.read(preferencesServiceProvider).setLocaleCode(languageCode);
  }
}

final localeProvider =
    NotifierProvider<LocaleNotifier, Locale>(LocaleNotifier.new);

class AppStrings {
  AppStrings(this.locale);

  final Locale locale;

  static final Map<String, Map<String, String>> _localizedValues = <String, Map<String, String>>{
    'en': <String, String>{
      'appName': 'VidSnap.AI',
      'tagline': 'AI-Powered Short Video Entertainment',
      'login': 'Log In',
      'register': 'Create Account',
      'logout': 'Log Out',
      'feed': 'Feed',
      'explore': 'Explore',
      'create': 'Create',
      'rooms': 'Rooms',
      'companion': 'Companion',
      'profile': 'Profile',
      'retry': 'Retry',
      'cancel': 'Cancel',
      'save': 'Save',
      'email': 'Email',
      'password': 'Password',
      'error': 'Error',
      'noContent': 'No content available',
    },
    'hi': <String, String>{
      'appName': 'विडस्नैप.एआई',
      'tagline': 'एआई-संचालित लघु वीडियो मनोरंजन',
      'login': 'लॉग इन करें',
      'register': 'खाता बनाएं',
      'logout': 'लॉग आउट',
      'feed': 'फ़ीड',
      'explore': 'खोजें',
      'create': 'बनाएं',
      'rooms': 'रूम्स',
      'companion': 'साथी',
      'profile': 'प्रोफ़ाइल',
      'retry': 'पुनः प्रयास करें',
      'cancel': 'रद्द करें',
      'save': 'सहेजें',
      'email': 'ईमेल',
      'password': 'पासवर्ड',
      'error': 'त्रुटि',
      'noContent': 'कोई सामग्री उपलब्ध नहीं है',
    },
    'gu': <String, String>{
      'appName': 'વિડસ્નેપ.એઆઈ',
      'tagline': 'એઆઈ-સંચાલિત ટૂંકી વિડિઓ મનોરંજન',
      'login': 'લૉગ ઇન કરો',
      'register': 'ખાતું બનાવો',
      'logout': 'લૉગ આઉટ',
      'feed': 'ફીડ',
      'explore': 'શોધો',
      'create': 'બનાવો',
      'rooms': 'રૂમ્સ',
      'companion': 'સાથી',
      'profile': 'પ્રોફાઇલ',
      'retry': 'ફરી પ્રયાસ કરો',
      'cancel': 'રદ કરો',
      'save': 'સાચવો',
      'email': 'ઇમેઇલ',
      'password': 'પાસવર્ડ',
      'error': 'ભૂલ',
      'noContent': 'કોઈ સામગ્રી ઉપલબ્ધ નથી',
    },
  };

  String get(String key) {
    final lang = locale.languageCode;
    return _localizedValues[lang]?[key] ?? _localizedValues['en']?[key] ?? key;
  }
}

class AppStringsDelegate extends LocalizationsDelegate<AppStrings> {
  const AppStringsDelegate();

  @override
  bool isSupported(Locale locale) => <String>['en', 'hi', 'gu'].contains(locale.languageCode);

  @override
  Future<AppStrings> load(Locale locale) async => AppStrings(locale);

  @override
  bool shouldReload(AppStringsDelegate old) => false;
}
