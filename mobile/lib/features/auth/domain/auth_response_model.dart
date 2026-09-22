import 'package:vidsnap_ai/features/auth/domain/user_model.dart';

class AuthResponse {
  const AuthResponse({
    required this.accessToken,
    required this.tokenType,
    required this.user,
    this.refreshToken,
  });

  final String accessToken;
  final String tokenType;
  final User user;
  final String? refreshToken;

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['access_token'] as String,
      tokenType: json['token_type'] as String? ?? 'bearer',
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      refreshToken: json['refresh_token'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'access_token': accessToken,
      'token_type': tokenType,
      'user': user.toJson(),
      if (refreshToken != null) 'refresh_token': refreshToken,
    };
  }
}
