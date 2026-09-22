class User {
  const User({
    required this.userId,
    required this.name,
    required this.email,
    required this.roles,
    required this.tokensRemaining,
    required this.emailVerified,
    required this.timezone,
    required this.createdAt,
  });

  final String userId;
  final String name;
  final String email;
  final List<String> roles;
  final int tokensRemaining;
  final bool emailVerified;
  final String timezone;
  final DateTime createdAt;

  bool get isCreator => roles.contains('creator');
  bool get isBusiness => roles.contains('business');
  bool get isAdmin => roles.contains('admin');

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['user_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      roles:
          (json['roles'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          <String>['user'],
      tokensRemaining: json['tokens_remaining'] as int? ?? 0,
      emailVerified: json['email_verified'] as bool? ?? false,
      timezone: json['timezone'] as String? ?? 'UTC',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'user_id': userId,
      'name': name,
      'email': email,
      'roles': roles,
      'tokens_remaining': tokensRemaining,
      'email_verified': emailVerified,
      'timezone': timezone,
      'created_at': createdAt.toIso8601String(),
    };
  }

  User copyWith({
    String? userId,
    String? name,
    String? email,
    List<String>? roles,
    int? tokensRemaining,
    bool? emailVerified,
    String? timezone,
    DateTime? createdAt,
  }) {
    return User(
      userId: userId ?? this.userId,
      name: name ?? this.name,
      email: email ?? this.email,
      roles: roles ?? this.roles,
      tokensRemaining: tokensRemaining ?? this.tokensRemaining,
      emailVerified: emailVerified ?? this.emailVerified,
      timezone: timezone ?? this.timezone,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
