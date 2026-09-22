class LoginRequest {
  const LoginRequest({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email.trim().toLowerCase(),
      'password': password,
    };
  }
}

class SignupRequest {
  const SignupRequest({
    required this.name,
    required this.email,
    required this.password,
    this.captchaToken,
  });

  final String name;
  final String email;
  final String password;
  final String? captchaToken;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name.trim(),
      'email': email.trim().toLowerCase(),
      'password': password,
      if (captchaToken != null) 'captcha_token': captchaToken,
    };
  }
}

class VerifyEmailRequest {
  const VerifyEmailRequest({
    required this.email,
    required this.otp,
  });

  final String email;
  final String otp;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email.trim().toLowerCase(),
      'otp': otp.trim(),
    };
  }
}

class ResendVerificationRequest {
  const ResendVerificationRequest({required this.email});

  final String email;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email.trim().toLowerCase(),
    };
  }
}

class ForgotPasswordRequest {
  const ForgotPasswordRequest({required this.email});

  final String email;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email.trim().toLowerCase(),
    };
  }
}

class ResetPasswordRequest {
  const ResetPasswordRequest({
    required this.email,
    required this.otp,
    required this.newPassword,
  });

  final String email;
  final String otp;
  final String newPassword;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'email': email.trim().toLowerCase(),
      'otp': otp.trim(),
      'new_password': newPassword,
    };
  }
}

class TokenRefreshRequest {
  const TokenRefreshRequest({required this.refreshToken});

  final String refreshToken;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'refresh_token': refreshToken,
    };
  }
}
