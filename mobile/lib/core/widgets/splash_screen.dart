import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

/// Branded splash screen displayed during initial auth state & cache restoration.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _opacityAnimation = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.forest950 : AppColors.cream50,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Spacer(flex: 2),

              // Animated brand logo mark
              AnimatedBuilder(
                animation: _animController,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _scaleAnimation.value,
                    child: Opacity(
                      opacity: _opacityAnimation.value,
                      child: child,
                    ),
                  );
                },
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.forest600,
                        AppColors.moss500,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(AppRadii.xl),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.forest900.withValues(alpha: 0.3),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.play_arrow_rounded,
                      size: 56,
                      color: AppColors.cream50,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.s5),

              // Brand Wordmark
              RichText(
                text: TextSpan(
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                  children: const [
                    TextSpan(
                      text: 'VidSnap',
                      style: TextStyle(color: AppColors.forest500),
                    ),
                    TextSpan(
                      text: '.AI',
                      style: TextStyle(color: AppColors.moss500),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.s2),

              Text(
                'AI-Powered Vertical Reels',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isDark ? AppColors.forest200 : AppColors.forest700,
                  letterSpacing: 0.2,
                ),
              ),

              const Spacer(flex: 2),

              // Loading indicator with brand accent
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.moss500),
                ),
              ),

              const SizedBox(height: AppSpacing.s4),

              // Build version tag
              Text(
                'v1.0.0 • Release',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: isDark ? AppColors.forest700 : AppColors.cream300,
                  fontSize: 10,
                ),
              ),

              const SizedBox(height: AppSpacing.s4),
            ],
          ),
        ),
      ),
    );
  }
}
