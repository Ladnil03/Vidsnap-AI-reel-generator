enum FailureType {
  network,
  auth,
  validation,
  server,
  unknown,
}

class AppFailure implements Exception {
  const AppFailure({
    required this.type,
    required this.message,
    this.statusCode,
    this.code,
    this.details,
    this.isRetryable = false,
  });

  final FailureType type;
  final String message;
  final int? statusCode;
  final String? code;
  final dynamic details;
  final bool isRetryable;

  factory AppFailure.network({
    String message = 'Network connection error. Please check your internet connection.',
  }) {
    return AppFailure(
      type: FailureType.network,
      message: message,
      isRetryable: true,
    );
  }

  factory AppFailure.auth({
    String message = 'Authentication required or session expired. Please log in again.',
    int? statusCode = 401,
  }) {
    return AppFailure(
      type: FailureType.auth,
      message: message,
      statusCode: statusCode,
      isRetryable: false,
    );
  }

  factory AppFailure.validation({
    required String message,
    int? statusCode = 422,
    dynamic details,
  }) {
    return AppFailure(
      type: FailureType.validation,
      message: message,
      statusCode: statusCode,
      details: details,
      isRetryable: false,
    );
  }

  factory AppFailure.server({
    String message = 'A server error occurred. Please try again shortly.',
    int? statusCode = 500,
  }) {
    return AppFailure(
      type: FailureType.server,
      message: message,
      statusCode: statusCode,
      isRetryable: true,
    );
  }

  factory AppFailure.unknown({
    String message = 'An unexpected error occurred. Please try again.',
    dynamic details,
  }) {
    return AppFailure(
      type: FailureType.unknown,
      message: message,
      details: details,
      isRetryable: true,
    );
  }

  @override
  String toString() => 'AppFailure(type: $type, message: "$message", statusCode: $statusCode)';
}
