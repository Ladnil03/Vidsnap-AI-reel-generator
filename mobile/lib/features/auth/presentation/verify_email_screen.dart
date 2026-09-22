import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/auth/data/auth_repository.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key, this.email});

  final String? email;

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  final TextEditingController _otpController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;
  int _cooldownSeconds = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  void _startCooldown() {
    setState(() => _cooldownSeconds = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_cooldownSeconds > 0) {
        setState(() => _cooldownSeconds--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  String get _effectiveEmail => widget.email ?? '';

  Future<void> _handleVerify() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(
        () => _errorMessage = 'Please enter the 6-digit verification code.',
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider).verifyEmail(_effectiveEmail, otp);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Email verified! 5 creation credits have been unlocked.',
            ),
            backgroundColor: AppColors.successLight,
          ),
        );
        context.go('/feed');
      }
    } on AppFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(
        () => _errorMessage = 'Verification failed. Please check the code.',
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleResendCode() async {
    if (_cooldownSeconds > 0) return;

    try {
      final msg = await ref
          .read(authRepositoryProvider)
          .resendVerification(_effectiveEmail);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(msg)));
        _startCooldown();
      }
    } on AppFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Failed to resend code.');
    }
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
                  Center(
                    child: Container(
                      width: 64.0,
                      height: 64.0,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.forest800 : AppColors.sage100,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.mark_email_read_outlined,
                        size: 32.0,
                        color: isDark ? AppColors.sage300 : AppColors.forest500,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  Text(
                    'Verify Your Email',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26.0,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.cream50 : AppColors.forest900,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    'We sent a 6-digit confirmation code to\n$_effectiveEmail',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14.0,
                      color: isDark ? AppColors.sage300 : AppColors.forest700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s6),

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
                              color:
                                  (isDark
                                          ? AppColors.dangerDark
                                          : AppColors.dangerLight)
                                      .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadii.sm),
                            ),
                            child: Row(
                              children: <Widget>[
                                Icon(
                                  Icons.error_outline_rounded,
                                  color: isDark
                                      ? AppColors.dangerDark
                                      : AppColors.dangerLight,
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
                          label: 'Verification Code',
                          controller: _otpController,
                          hintText: '123456',
                          keyboardType: TextInputType.number,
                          prefixIcon: const Icon(
                            Icons.pin_outlined,
                            size: 20.0,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.s5),
                        AppButton(
                          label: 'Verify Email',
                          isLoading: _isLoading,
                          onPressed: _handleVerify,
                          isFullWidth: true,
                        ),
                        const SizedBox(height: AppSpacing.s3),
                        Center(
                          child: TextButton(
                            onPressed: _cooldownSeconds == 0
                                ? _handleResendCode
                                : null,
                            child: Text(
                              _cooldownSeconds > 0
                                  ? 'Resend code in ${_cooldownSeconds}s'
                                  : 'Resend code',
                              style: TextStyle(
                                color: _cooldownSeconds > 0
                                    ? (isDark
                                          ? AppColors.forest300
                                          : AppColors.cream400)
                                    : (isDark
                                          ? AppColors.sage300
                                          : AppColors.forest700),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
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
