import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vidsnap_ai/core/l10n/app_locale_provider.dart';
import 'package:vidsnap_ai/core/router/app_router.dart';
import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';
import 'package:vidsnap_ai/core/theme/app_theme.dart';
import 'package:vidsnap_ai/core/theme/theme_provider.dart';
import 'package:vidsnap_ai/core/widgets/connectivity_banner.dart';
import 'package:vidsnap_ai/core/widgets/global_error_boundary.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Global uncaught Flutter error handler
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    TelemetryService.instance.recordFlutterError(details);
  };

  // Global uncaught asynchronous / platform error handler
  PlatformDispatcher.instance.onError = (error, stack) {
    TelemetryService.instance.recordError(error, stack, isFatal: true);
    return true;
  };

  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const VidSnapApp(),
    ),
  );
}

class VidSnapApp extends ConsumerWidget {
  const VidSnapApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'VidSnap.AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      locale: locale,
      supportedLocales: AppLocales.flutterLocales,
      localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
        AppStringsDelegate(),
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        return GlobalErrorBoundary(
          child: ConnectivityBanner(child: child ?? const SizedBox.shrink()),
        );
      },
      routerConfig: router,
    );
  }
}
