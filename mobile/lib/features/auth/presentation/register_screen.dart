import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _agreeTerms = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool get _hasMinLength => _passwordController.text.length >= 8;
  bool get _hasNumber => RegExp(r'\d').hasMatch(_passwordController.text);
  bool get _hasLetter => RegExp(r'[a-zA-Z]').hasMatch(_passwordController.text);
  bool get _passwordsMatch =>
      _passwordController.text.isNotEmpty &&
      _passwordController.text == _confirmPasswordController.text;

  Future<void> _handleRegister() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (name.isEmpty) {
      setState(() => _errorMessage = 'Please enter your name.');
      return;
    }

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }

    if (!_hasMinLength || !_hasNumber || !_hasLetter) {
      setState(() => _errorMessage =
          'Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    if (!_passwordsMatch) {
      setState(() => _errorMessage = 'Passwords do not match.');
      return;
    }

    if (!_agreeTerms) {
      setState(() => _errorMessage = 'Please agree to the Terms of Service.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider).signup(name, email, password);
      if (mounted) {
        context.go('/verify-email?email=${Uri.encodeComponent(email)}');
      }
    } on AppFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Registration failed. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildCheckItem(String label, bool isSatisfied, bool isDark) {
    return Row(
      children: <Widget>[
        Icon(
          isSatisfied ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
          size: 16.0,
          color: isSatisfied
              ? (isDark ? AppColors.successDark : AppColors.successLight)
              : (isDark ? AppColors.sage300 : AppColors.forest300),
        ),
        const SizedBox(width: AppSpacing.s2),
        Text(
          label,
          style: TextStyle(
            fontSize: 12.0,
            color: isSatisfied
                ? (isDark ? AppColors.cream50 : AppColors.forest900)
                : (isDark ? AppColors.sage300 : AppColors.forest700),
          ),
        ),
      ],
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
                  // 5-token gift welcome banner
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s4,
                      vertical: AppSpacing.s3,
                    ),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.forest800 : AppColors.sage200,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      border: Border.all(
                        color: isDark ? AppColors.borderDarkMedium : AppColors.borderLightMedium,
                      ),
                    ),
                    child: Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: AppSpacing.s2,
                      children: <Widget>[
                        Icon(
                          Icons.stars_rounded,
                          color: isDark ? AppColors.sage300 : AppColors.forest500,
                          size: 20.0,
                        ),
                        Text(
                          'Special Welcome: 5 Free AI Video Credits',
                          style: TextStyle(
                            fontSize: 13.0,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.cream50 : AppColors.forest900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s5),

                  Text(
                    'Create Your Account',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26.0,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.cream50 : AppColors.forest900,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    'Join thousands of mobile creators on VidSnap.AI',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14.0,
                      color: isDark ? AppColors.sage300 : AppColors.forest700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s6),

                  // Registration Card
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
                          label: 'Full Name',
                          controller: _nameController,
                          hintText: 'John Doe',
                          prefixIcon: const Icon(Icons.person_outline, size: 20.0),
                        ),
                        const SizedBox(height: AppSpacing.s4),
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
                          hintText: 'Min 8 characters',
                          isPassword: _obscurePassword,
                          onChanged: (_) => setState(() {}),
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
                        const SizedBox(height: AppSpacing.s4),
                        AppTextField(
                          label: 'Confirm Password',
                          controller: _confirmPasswordController,
                          hintText: 'Re-enter password',
                          isPassword: _obscurePassword,
                          onChanged: (_) => setState(() {}),
                          prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20.0),
                        ),
                        const SizedBox(height: AppSpacing.s3),

                        // Password requirements checklist
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.s3),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.forest950 : AppColors.cream100,
                            borderRadius: BorderRadius.circular(AppRadii.sm),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              _buildCheckItem('At least 8 characters', _hasMinLength, isDark),
                              const SizedBox(height: 4.0),
                              _buildCheckItem('Contains numbers & letters', _hasNumber && _hasLetter, isDark),
                              const SizedBox(height: 4.0),
                              _buildCheckItem('Passwords match', _passwordsMatch, isDark),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.s4),

                        // Terms agreement checkbox
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: <Widget>[
                            Checkbox(
                              value: _agreeTerms,
                              activeColor: AppColors.forest500,
                              onChanged: (val) {
                                setState(() => _agreeTerms = val ?? false);
                              },
                            ),
                            Expanded(
                              child: Text(
                                'I agree to the Terms of Service and Privacy Policy.',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  color: isDark ? AppColors.sage300 : AppColors.forest700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.s4),

                        AppButton(
                          label: 'Create Account',
                          isLoading: _isLoading,
                          onPressed: _handleRegister,
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
                        'Already have an account? ',
                        style: TextStyle(
                          color: isDark ? AppColors.sage300 : AppColors.forest700,
                          fontSize: 14.0,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.go('/login'),
                        child: Text(
                          'Log in',
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
