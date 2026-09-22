import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:vidsnap_ai/core/telemetry/telemetry_service.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';

/// Wraps widgets to prevent red/gray screens of death and report errors.
class GlobalErrorBoundary extends StatefulWidget {
  const GlobalErrorBoundary({
    super.key,
    required this.child,
    this.onReset,
  });

  final Widget child;
  final VoidCallback? onReset;

  @override
  State<GlobalErrorBoundary> createState() => _GlobalErrorBoundaryState();
}

class _GlobalErrorBoundaryState extends State<GlobalErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;

  @override
  void initState() {
    super.initState();
  }

  void captureError(Object error, [StackTrace? stackTrace]) {
    setState(() {
      _error = error;
      _stackTrace = stackTrace;
    });
  }

  void _resetError() {
    setState(() {
      _error = null;
      _stackTrace = null;
    });
    widget.onReset?.call();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      final theme = Theme.of(context);
      final isDark = theme.brightness == Brightness.dark;
      final dangerColor = isDark ? AppColors.dangerDark : AppColors.dangerLight;

      return Scaffold(
        backgroundColor: isDark ? AppColors.forest950 : AppColors.cream50,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s6),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: dangerColor.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.warning_amber_rounded,
                      size: 40,
                      color: dangerColor,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s4),
                  Text(
                    'Something went wrong',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.s2),
                  Text(
                    'An unexpected issue occurred. Our telemetry pipeline has logged this event.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isDark ? AppColors.forest200 : AppColors.forest700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (kDebugMode && _error != null) ...<Widget>[
                    const SizedBox(height: AppSpacing.s3),
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.s3),
                      decoration: BoxDecoration(
                        color:
                            isDark ? AppColors.forest900 : AppColors.cream200,
                        borderRadius: BorderRadius.circular(AppRadii.sm),
                      ),
                      child: Text(
                        _stackTrace != null
                            ? '$_error\n$_stackTrace'
                            : _error.toString(),
                        style: const TextStyle(
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.s6),
                  AppButton(
                    label: 'Try Again',
                    onPressed: _resetError,
                    isFullWidth: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return _ErrorBoundaryScope(
      state: this,
      child: widget.child,
    );
  }
}

class _ErrorBoundaryScope extends InheritedWidget {
  const _ErrorBoundaryScope({
    required this.state,
    required super.child,
  });

  final _GlobalErrorBoundaryState state;

  @override
  bool updateShouldNotify(_ErrorBoundaryScope oldWidget) => false;
}

extension ErrorBoundaryExtension on BuildContext {
  void reportWidgetError(Object error, [StackTrace? stackTrace]) {
    final scope = dependOnInheritedWidgetOfExactType<_ErrorBoundaryScope>();
    TelemetryService.instance.recordError(
      error,
      stackTrace,
      reason: 'Caught by GlobalErrorBoundary',
    );
    if (scope != null) {
      scope.state.captureError(error, stackTrace);
    }
  }
}
