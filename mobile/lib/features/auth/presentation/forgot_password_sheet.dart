import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/auth/data/auth_repository.dart';
import 'package:vidsnap_ai/features/auth/domain/auth_requests.dart';

class ForgotPasswordSheet extends ConsumerStatefulWidget {
  const ForgotPasswordSheet({super.key, this.initialEmail});

  final String? initialEmail;

  @override
  ConsumerState<ForgotPasswordSheet> createState() => _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends ConsumerState<ForgotPasswordSheet> {
  late final TextEditingController _emailController;
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();

  bool _isOtpSent = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail ?? '');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final msg = await ref.read(authRepositoryProvider).forgotPassword(email);
      setState(() {
        _isOtpSent = true;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg)),
        );
      }
    } on AppFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Failed to send OTP code. Please try again.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleResetPassword() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    final newPassword = _newPasswordController.text;

    if (otp.length != 6) {
      setState(() => _errorMessage = 'Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setState(() => _errorMessage = 'Password must be at least 8 characters long.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final msg = await ref.read(authRepositoryProvider).resetPassword(
            ResetPasswordRequest(
              email: email,
              otp: otp,
              newPassword: newPassword,
            ),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: AppColors.successLight,
          ),
        );
        Navigator.of(context).pop();
      }
    } on AppFailure catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Failed to reset password.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.s5,
        right: AppSpacing.s5,
        top: AppSpacing.s5,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.s5,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(
                _isOtpSent ? 'Reset Password' : 'Forgot Password',
                style: TextStyle(
                  fontSize: 18.0,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.cream50 : AppColors.forest900,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            _isOtpSent
                ? 'Enter the 6-digit code sent to ${_emailController.text} and your new password.'
                : 'Enter your account email to receive a password reset verification code.',
            style: TextStyle(
              fontSize: 14.0,
              color: isDark ? AppColors.sage300 : AppColors.forest700,
            ),
          ),
          const SizedBox(height: AppSpacing.s4),
          if (_errorMessage != null) ...<Widget>[
            Container(
              padding: const EdgeInsets.all(AppSpacing.s3),
              decoration: BoxDecoration(
                color: (isDark ? AppColors.dangerDark : AppColors.dangerLight)
                    .withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadii.sm),
              ),
              child: Text(
                _errorMessage!,
                style: TextStyle(
                  color: isDark ? AppColors.dangerDark : AppColors.dangerLight,
                  fontSize: 13.0,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.s3),
          ],
          if (!_isOtpSent) ...<Widget>[
            AppTextField(
              label: 'Email Address',
              controller: _emailController,
              hintText: 'name@example.com',
              keyboardType: TextInputType.emailAddress,
              prefixIcon: const Icon(Icons.email_outlined, size: 20.0),
            ),
            const SizedBox(height: AppSpacing.s5),
            AppButton(
              label: 'Send Verification Code',
              isLoading: _isLoading,
              onPressed: _handleSendOtp,
              isFullWidth: true,
            ),
          ] else ...<Widget>[
            AppTextField(
              label: '6-Digit Verification Code',
              controller: _otpController,
              hintText: '123456',
              keyboardType: TextInputType.number,
              prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20.0),
            ),
            const SizedBox(height: AppSpacing.s3),
            AppTextField(
              label: 'New Password',
              controller: _newPasswordController,
              hintText: 'At least 8 characters',
              isPassword: true,
              prefixIcon: const Icon(Icons.lock_outline, size: 20.0),
            ),
            const SizedBox(height: AppSpacing.s5),
            AppButton(
              label: 'Set New Password',
              isLoading: _isLoading,
              onPressed: _handleResetPassword,
              isFullWidth: true,
            ),
          ],
        ],
      ),
    );
  }
}
