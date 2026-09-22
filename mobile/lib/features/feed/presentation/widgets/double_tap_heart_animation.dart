import 'package:flutter/material.dart';

class DoubleTapHeartAnimation extends StatefulWidget {
  const DoubleTapHeartAnimation({
    super.key,
    required this.isShowing,
    required this.onAnimationComplete,
  });

  final bool isShowing;
  final VoidCallback onAnimationComplete;

  @override
  State<DoubleTapHeartAnimation> createState() =>
      _DoubleTapHeartAnimationState();
}

class _DoubleTapHeartAnimationState extends State<DoubleTapHeartAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _scaleAnimation = TweenSequence<double>(<TweenSequenceItem<double>>[
      TweenSequenceItem<double>(
        tween: Tween<double>(
          begin: 0.0,
          end: 1.25,
        ).chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 60.0,
      ),
      TweenSequenceItem<double>(
        tween: Tween<double>(
          begin: 1.25,
          end: 1.0,
        ).chain(CurveTween(curve: Curves.easeInOut)),
        weight: 40.0,
      ),
    ]).animate(_controller);

    _opacityAnimation = TweenSequence<double>(<TweenSequenceItem<double>>[
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: 0.0, end: 1.0),
        weight: 20.0,
      ),
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: 1.0, end: 1.0),
        weight: 50.0,
      ),
      TweenSequenceItem<double>(
        tween: Tween<double>(
          begin: 1.0,
          end: 0.0,
        ).chain(CurveTween(curve: Curves.easeIn)),
        weight: 30.0,
      ),
    ]).animate(_controller);

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.onAnimationComplete();
      }
    });

    if (widget.isShowing) {
      _controller.forward(from: 0.0);
    }
  }

  @override
  void didUpdateWidget(covariant DoubleTapHeartAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isShowing && !oldWidget.isShowing) {
      _controller.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isShowing) return const SizedBox.shrink();

    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Opacity(
            opacity: _opacityAnimation.value.clamp(0.0, 1.0),
            child: Transform.scale(
              scale: _scaleAnimation.value,
              child: const Icon(
                Icons.favorite,
                color: Color(0xFFFF4D67),
                size: 110.0,
                shadows: <Shadow>[
                  Shadow(color: Colors.black45, blurRadius: 20.0),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
