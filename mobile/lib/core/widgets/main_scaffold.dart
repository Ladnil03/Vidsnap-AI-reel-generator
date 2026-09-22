import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';

class MainScaffold extends StatelessWidget {
  const MainScaffold({
    super.key,
    required this.child,
    required this.currentIndex,
  });

  final Widget child;
  final int currentIndex;

  static const List<String> _routes = <String>[
    '/feed',
    '/explore',
    '/create',
    '/rooms',
    '/profile',
  ];

  void _onItemTapped(BuildContext context, int index) {
    if (index == currentIndex) return;
    context.go(_routes[index]);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.forest950 : AppColors.cream50;
    final borderColor = isDark ? AppColors.forest800 : AppColors.cream200;
    final selectedColor = isDark ? AppColors.cream50 : AppColors.forest900;
    final unselectedColor = isDark ? AppColors.sage400 : AppColors.forest600;

    return Scaffold(
      backgroundColor: surfaceColor,
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: surfaceColor,
          border: Border(top: BorderSide(color: borderColor, width: 0.8)),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Colors.black12,
              blurRadius: 8.0,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 60.0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: <Widget>[
                _buildNavItem(
                  context: context,
                  index: 0,
                  label: 'Feed',
                  icon: currentIndex == 0
                      ? Icons.play_circle_fill_rounded
                      : Icons.play_circle_outline_rounded,
                  selectedColor: selectedColor,
                  unselectedColor: unselectedColor,
                ),
                _buildNavItem(
                  context: context,
                  index: 1,
                  label: 'Explore',
                  icon: currentIndex == 1
                      ? Icons.explore_rounded
                      : Icons.explore_outlined,
                  selectedColor: selectedColor,
                  unselectedColor: unselectedColor,
                ),
                _buildCreateButton(context),
                _buildNavItem(
                  context: context,
                  index: 3,
                  label: 'Rooms',
                  icon: currentIndex == 3
                      ? Icons.people_alt_rounded
                      : Icons.people_alt_outlined,
                  selectedColor: selectedColor,
                  unselectedColor: unselectedColor,
                ),
                _buildNavItem(
                  context: context,
                  index: 4,
                  label: 'Profile',
                  icon: currentIndex == 4
                      ? Icons.person_rounded
                      : Icons.person_outline_rounded,
                  selectedColor: selectedColor,
                  unselectedColor: unselectedColor,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required BuildContext context,
    required int index,
    required String label,
    required IconData icon,
    required Color selectedColor,
    required Color unselectedColor,
  }) {
    final isSelected = currentIndex == index;
    final color = isSelected ? selectedColor : unselectedColor;

    return InkWell(
      onTap: () => _onItemTapped(context, index),
      borderRadius: BorderRadius.circular(12.0),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 54.0, minHeight: 48.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(icon, color: color, size: 24.0),
            const SizedBox(height: 2.0),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _onItemTapped(context, 2),
      child: Container(
        width: 44.0,
        height: 38.0,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10.0),
          gradient: const LinearGradient(
            colors: <Color>[AppColors.forest500, AppColors.moss500],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Colors.black26,
              blurRadius: 4.0,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: const Center(
          child: Icon(
            Icons.add,
            color: AppColors.cream50,
            size: 24.0,
          ),
        ),
      ),
    );
  }
}
