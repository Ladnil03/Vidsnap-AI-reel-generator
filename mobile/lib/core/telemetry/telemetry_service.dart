import 'package:flutter/foundation.dart';

/// Breadcrumb log entry for user action and app lifecycle tracking.
@immutable
class TelemetryBreadcrumb {
  const TelemetryBreadcrumb({
    required this.message,
    this.category = 'general',
    this.data,
    required this.timestamp,
  });

  final String message;
  final String category;
  final Map<String, dynamic>? data;
  final DateTime timestamp;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'message': message,
    'category': category,
    if (data != null) 'data': data,
    'timestamp': timestamp.toIso8601String(),
  };
}

/// Recorded crash or error event.
@immutable
class TelemetryErrorEvent {
  const TelemetryErrorEvent({
    required this.error,
    this.stackTrace,
    this.reason,
    this.isFatal = false,
    this.userId,
    required this.timestamp,
    this.breadcrumbs = const <TelemetryBreadcrumb>[],
  });

  final String error;
  final String? stackTrace;
  final String? reason;
  final bool isFatal;
  final String? userId;
  final DateTime timestamp;
  final List<TelemetryBreadcrumb> breadcrumbs;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'error': error,
    if (stackTrace != null) 'stack_trace': stackTrace,
    if (reason != null) 'reason': reason,
    'is_fatal': isFatal,
    if (userId != null) 'user_id': userId,
    'timestamp': timestamp.toIso8601String(),
    'breadcrumbs_count': breadcrumbs.length,
  };
}

/// Unified telemetry and crash reporting pipeline (Crashlytics/Sentry ready).
class TelemetryService {
  TelemetryService._();
  static final TelemetryService instance = TelemetryService._();

  static const int _maxBreadcrumbs = 50;
  final List<TelemetryBreadcrumb> _breadcrumbs = <TelemetryBreadcrumb>[];
  final List<TelemetryErrorEvent> _recordedErrors = <TelemetryErrorEvent>[];
  String? _currentUserId;

  List<TelemetryBreadcrumb> get breadcrumbs =>
      List<TelemetryBreadcrumb>.unmodifiable(_breadcrumbs);
  List<TelemetryErrorEvent> get recordedErrors =>
      List<TelemetryErrorEvent>.unmodifiable(_recordedErrors);
  String? get currentUserId => _currentUserId;

  void setUserId(String? userId) {
    _currentUserId = userId;
    addBreadcrumb(
      'User identity set: ${userId ?? "anonymous"}',
      category: 'auth',
    );
  }

  void addBreadcrumb(
    String message, {
    String category = 'general',
    Map<String, dynamic>? data,
  }) {
    final entry = TelemetryBreadcrumb(
      message: message,
      category: category,
      data: data,
      timestamp: DateTime.now(),
    );

    if (_breadcrumbs.length >= _maxBreadcrumbs) {
      _breadcrumbs.removeAt(0);
    }
    _breadcrumbs.add(entry);

    if (kDebugMode) {
      debugPrint('[Telemetry] [$category] $message');
    }
  }

  void recordError(
    dynamic error,
    StackTrace? stack, {
    String? reason,
    bool isFatal = false,
  }) {
    final event = TelemetryErrorEvent(
      error: error.toString(),
      stackTrace: stack?.toString(),
      reason: reason,
      isFatal: isFatal,
      userId: _currentUserId,
      timestamp: DateTime.now(),
      breadcrumbs: List<TelemetryBreadcrumb>.from(_breadcrumbs),
    );

    _recordedErrors.add(event);

    if (kDebugMode) {
      debugPrint('[Telemetry ERROR] reason: $reason | error: $error\n$stack');
    }
  }

  void recordFlutterError(FlutterErrorDetails details) {
    recordError(
      details.exception,
      details.stack,
      reason: details.context?.toString() ?? 'Flutter framework error',
      isFatal: false,
    );
  }

  void clear() {
    _breadcrumbs.clear();
    _recordedErrors.clear();
    _currentUserId = null;
  }
}
