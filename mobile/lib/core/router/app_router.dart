import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/features/auth/presentation/login_screen.dart';
import 'package:vidsnap_ai/features/auth/presentation/register_screen.dart';
import 'package:vidsnap_ai/features/auth/presentation/verify_email_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: authNotifier,
    redirect: (BuildContext context, GoRouterState state) {
      final status = authNotifier.status;
      final location = state.matchedLocation;
      final isAuthRoute = location == '/login' ||
          location == '/register' ||
          location == '/verify-email';
      final isSplash = location == '/splash';

      if (status == AuthStatus.unknown) {
        return isSplash ? null : '/splash';
      }

      if (status == AuthStatus.unauthenticated) {
        return isAuthRoute ? null : '/login';
      }

      // If user is authenticated, redirect away from login/register/splash to /feed
      if (isAuthRoute || isSplash) {
        return '/feed';
      }

      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: '/splash',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) {
          final email = state.uri.queryParameters['email'];
          return VerifyEmailScreen(email: email);
        },
      ),
      GoRoute(
        path: '/feed',
        builder: (context, state) => Consumer(
          builder: (context, ref, child) {
            final user = ref.watch(authStateProvider).currentUser;
            return Scaffold(
              appBar: AppBar(
                title: const Text('VidSnap Feed'),
                actions: <Widget>[
                  IconButton(
                    icon: const Icon(Icons.logout),
                    tooltip: 'Log Out',
                    onPressed: () => ref.read(authStateProvider).logout(),
                  ),
                ],
              ),
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      'Welcome, ${user?.name.isNotEmpty == true ? user!.name : 'Creator'}!',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text('Credits: ${user?.tokensRemaining ?? 0} tokens'),
                    const SizedBox(height: 16),
                    AppButton(
                      label: 'Log Out',
                      variant: AppButtonVariant.ghost,
                      onPressed: () => ref.read(authStateProvider).logout(),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
      GoRoute(
        path: '/explore',
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Explore (M3 Slice)')),
        ),
      ),
      GoRoute(
        path: '/create',
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Create Reel (M4 Slice)')),
        ),
      ),
      GoRoute(
        path: '/rooms',
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Watch Together Rooms (M5 Slice)')),
        ),
      ),
      GoRoute(
        path: '/companion',
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('AI Companion (M6 Slice)')),
        ),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const Scaffold(
          body: Center(child: Text('Profile (M7 Slice)')),
        ),
      ),
    ],
  );
});
