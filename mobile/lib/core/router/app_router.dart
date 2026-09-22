import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';

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
          location == '/forgot-password' ||
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
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Login Screen (M2 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Register Screen (M2 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Forgot Password Screen (M2 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Verify Email Screen (M2 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/feed',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('VidSnap Feed (M3 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/explore',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Explore (M3 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/create',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Create Reel (M4 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/rooms',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Watch Together Rooms (M5 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/companion',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('AI Companion (M6 Slice)'),
          ),
        ),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const Scaffold(
          body: Center(
            child: Text('Profile (M7 Slice)'),
          ),
        ),
      ),
    ],
  );
});
