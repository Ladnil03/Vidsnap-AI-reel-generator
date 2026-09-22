class EnvConfig {
  const EnvConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'local',
  );

  static bool get isProduction => environment.toLowerCase() == 'production';
  static bool get isStaging => environment.toLowerCase() == 'staging';
  static bool get isLocal => environment.toLowerCase() == 'local';
}
