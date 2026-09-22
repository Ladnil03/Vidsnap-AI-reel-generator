import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/widgets/main_scaffold.dart';
import 'package:vidsnap_ai/core/widgets/splash_screen.dart';
import 'package:vidsnap_ai/features/auth/presentation/login_screen.dart';
import 'package:vidsnap_ai/features/auth/presentation/register_screen.dart';
import 'package:vidsnap_ai/features/auth/presentation/verify_email_screen.dart';
import 'package:vidsnap_ai/features/business/presentation/business_marketplace_screen.dart';
import 'package:vidsnap_ai/features/companion/presentation/companion_chat_screen.dart';
import 'package:vidsnap_ai/features/create/presentation/create_screen.dart';
import 'package:vidsnap_ai/features/creator/presentation/creator_dashboard_screen.dart';
import 'package:vidsnap_ai/features/discovery/presentation/explore_screen.dart';
import 'package:vidsnap_ai/features/feed/presentation/feed_screen.dart';
import 'package:vidsnap_ai/features/gamification/presentation/gamification_dashboard_screen.dart';
import 'package:vidsnap_ai/features/profile/presentation/profile_screen.dart';
import 'package:vidsnap_ai/features/rooms/presentation/active_room_screen.dart';
import 'package:vidsnap_ai/features/rooms/presentation/rooms_lobby_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: authNotifier,
    redirect: (BuildContext context, GoRouterState state) {
      final status = authNotifier.status;
      final location = state.matchedLocation;
      final isAuthRoute =
          location == '/login' ||
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
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/reel/:id',
        builder: (context, state) => const FeedScreen(),
      ),
      GoRoute(
        path: '/room/:id',
        redirect: (context, state) {
          final id = state.pathParameters['id']!;
          final q = state.uri.hasQuery ? '?${state.uri.query}' : '';
          return '/rooms/$id$q';
        },
      ),
      GoRoute(
        path: '/creator/:handle',
        builder: (context, state) => ProfileScreen(
          userId: state.pathParameters['handle'],
        ),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
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
        path: '/rooms/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          final passcode = state.uri.queryParameters['passcode'];
          return ActiveRoomScreen(roomId: id, passcode: passcode);
        },
      ),
      GoRoute(
        path: '/companion',
        builder: (context, state) => const CompanionChatScreen(),
      ),
      GoRoute(
        path: '/gamification',
        builder: (context, state) => const GamificationDashboardScreen(),
      ),
      GoRoute(
        path: '/creator/dashboard',
        builder: (context, state) => const CreatorDashboardScreen(),
      ),
      GoRoute(
        path: '/business/campaigns',
        builder: (context, state) => const BusinessMarketplaceScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          final location = state.matchedLocation;
          final int index;
          if (location.startsWith('/explore')) {
            index = 1;
          } else if (location.startsWith('/create')) {
            index = 2;
          } else if (location.startsWith('/rooms')) {
            index = 3;
          } else if (location.startsWith('/profile')) {
            index = 4;
          } else {
            index = 0;
          }
          return MainScaffold(currentIndex: index, child: child);
        },
        routes: <RouteBase>[
          GoRoute(
            path: '/feed',
            builder: (context, state) => const FeedScreen(),
          ),
          GoRoute(
            path: '/explore',
            builder: (context, state) => const ExploreScreen(),
          ),
          GoRoute(
            path: '/create',
            builder: (context, state) => const CreateScreen(),
          ),
          GoRoute(
            path: '/rooms',
            builder: (context, state) => const RoomsLobbyScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
