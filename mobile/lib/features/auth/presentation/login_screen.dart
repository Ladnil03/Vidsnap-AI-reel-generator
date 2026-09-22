import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/auth/presentation/forgot_password_sheet.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }

    if (password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your password.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider).login(email, password);
      if (mounted) {
        context.go('/feed');
      }
    } on AppFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Login failed. Please check your credentials.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showForgotPasswordModal() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardTheme.color,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.lg)),
      ),
      builder: (context) => ForgotPasswordSheet(
        initialEmail: _emailController.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.s5),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  // Header Branding
                  Center(
                    child: Container(
                      width: 64.0,
                      height: 64.0,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.forest800 : AppColors.sage100,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.lock_open_rounded,
                        size: 32.0,
                        color: isDark ? AppColors.sage300 : AppColors.forest500,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  Text(
                    'Welcome Back',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26.0,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.cream50 : AppColors.forest900,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    'Sign in to access your AI Reel Studio and Feed',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14.0,
                      color: isDark ? AppColors.sage300 : AppColors.forest700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s6),

                  // Login Card
                  AppCard(
                    variant: AppCardVariant.raised,
                    padding: const EdgeInsets.all(AppSpacing.s5),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        if (_errorMessage != null) ...<Widget>[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.s3),
                            decoration: BoxDecoration(
                              color: (isDark ? AppColors.dangerDark : AppColors.dangerLight)
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadii.sm),
                            ),
                            child: Row(
                              children: <Widget>[
                                Icon(
                                  Icons.error_outline_rounded,
                                  color: isDark ? AppColors.dangerDark : AppColors.dangerLight,
                                  size: 18.0,
                                ),
                                const SizedBox(width: AppSpacing.s2),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: TextStyle(
                                      color: isDark
                                          ? AppColors.dangerDark
                                          : AppColors.dangerLight,
                                      fontSize: 13.0,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.s4),
                        ],
                        AppTextField(
                          label: 'Email',
                          controller: _emailController,
                          hintText: 'creator@vidsnap.ai',
                          keyboardType: TextInputType.emailAddress,
                          prefixIcon: const Icon(Icons.email_outlined, size: 20.0),
                        ),
                        const SizedBox(height: AppSpacing.s4),
                        AppTextField(
                          label: 'Password',
                          controller: _passwordController,
                          hintText: 'Enter your password',
                          isPassword: _obscurePassword,
                          prefixIcon: const Icon(Icons.lock_outline, size: 20.0),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              size: 20.0,
                            ),
                            onPressed: () {
                              setState(() => _obscurePassword = !_obscurePassword);
                            },
                          ),
                        ),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: _showForgotPasswordModal,
                            style: TextButton.styleFrom(
                              foregroundColor:
                                  isDark ? AppColors.sage300 : AppColors.forest700,
                              textStyle: const TextStyle(
                                fontSize: 13.0,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            child: const Text('Forgot password?'),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.s2),
                        AppButton(
                          label: 'Log In',
                          isLoading: _isLoading,
                          onPressed: _handleLogin,
                          isFullWidth: true,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.s6),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: <Widget>[
                      Text(
                        "Don't have an account? ",
                        style: TextStyle(
                          color: isDark ? AppColors.sage300 : AppColors.forest700,
                          fontSize: 14.0,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.go('/register'),
                        child: Text(
                          'Create one',
                          style: TextStyle(
                            color: isDark ? AppColors.cream50 : AppColors.forest500,
                            fontWeight: FontWeight.w700,
                            fontSize: 14.0,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
