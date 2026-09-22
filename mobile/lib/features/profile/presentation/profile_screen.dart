import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_empty_state.dart';
import 'package:vidsnap_ai/features/feed/domain/feed_item_model.dart';
import 'package:vidsnap_ai/features/profile/domain/profile_models.dart';
import 'package:vidsnap_ai/features/profile/presentation/providers/profile_provider.dart';
import 'package:vidsnap_ai/features/profile/presentation/widgets/edit_profile_sheet.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key, this.userId});

  final String? userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(profileNotifierProvider);
    final authUser = ref.watch(authStateProvider).currentUser;

    final profile =
        state.profile ??
        UserProfileModel(
          userId: authUser?.userId ?? '',
          name: authUser?.name ?? 'Creator',
          email: authUser?.email ?? '',
          tokensRemaining: authUser?.tokensRemaining ?? 0,
          roles: authUser?.roles ?? const <String>['user'],
        );

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log Out',
            onPressed: () => ref.read(authStateProvider).logout(),
          ),
        ],
      ),
      body: SafeArea(
        child: state.isLoading && state.profile == null
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () =>
                    ref.read(profileNotifierProvider.notifier).loadProfile(),
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.s4),
                  children: <Widget>[
                    // 1. Profile Header
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.s4,
                      ),
                      child: _buildProfileHeader(context, profile, isDark),
                    ),
                    const SizedBox(height: AppSpacing.s4),

                    // 2. Stats Strip
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.s4,
                      ),
                      child: _buildStatsStrip(profile, isDark),
                    ),
                    const SizedBox(height: AppSpacing.s4),

                    // 3. Quick Action Hub
                    _buildActionHub(context, profile, isDark),
                    const SizedBox(height: AppSpacing.s4),

                    // 4. Tab Selector (My Reels vs Saved)
                    _buildTabSelector(context, ref, state.activeTab, isDark),
                    const SizedBox(height: AppSpacing.s3),

                    // 5. Video Grid
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.s4,
                      ),
                      child: _buildVideoGrid(
                        context,
                        state.activeTab == 0 ? state.reels : state.savedReels,
                        state.activeTab == 0
                            ? 'No Reels Published'
                            : 'No Saved Reels',
                        state.activeTab == 0
                            ? 'Create and share your first reel with the world!'
                            : 'Bookmark reels from your feed to view them anytime.',
                        isDark,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s6),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildProfileHeader(
    BuildContext context,
    UserProfileModel profile,
    bool isDark,
  ) {
    final theme = Theme.of(context);
    final initial = profile.name.isNotEmpty
        ? profile.name[0].toUpperCase()
        : 'C';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CircleAvatar(
          radius: 36,
          backgroundColor: isDark ? AppColors.forest700 : AppColors.sage200,
          child: Text(
            initial,
            style: theme.textTheme.headlineMedium?.copyWith(
              color: isDark ? AppColors.cream50 : AppColors.forest900,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.s4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Flexible(
                    child: Text(
                      profile.name.isNotEmpty ? profile.name : 'Creator',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s2),
                  _buildRoleBadge(profile, isDark),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                profile.email,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isDark ? AppColors.forest200 : AppColors.forest700,
                ),
              ),
              if (profile.bio.isNotEmpty) ...<Widget>[
                const SizedBox(height: AppSpacing.s2),
                Text(profile.bio, style: theme.textTheme.bodyMedium),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRoleBadge(UserProfileModel profile, bool isDark) {
    final String label;
    final Color badgeColor;

    if (profile.isCreator) {
      label = 'Creator 🎨';
      badgeColor = AppColors.moss500;
    } else if (profile.isBusiness) {
      label = 'Brand 💼';
      badgeColor = AppColors.forest500;
    } else {
      label = 'Member ✨';
      badgeColor = isDark ? AppColors.forest700 : AppColors.sage400;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: badgeColor, width: 0.8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: badgeColor,
        ),
      ),
    );
  }

  Widget _buildStatsStrip(UserProfileModel profile, bool isDark) {
    return AppCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: <Widget>[
          _buildStatItem('Followers', '${profile.followersCount}', isDark),
          _buildStatDivider(isDark),
          _buildStatItem('Following', '${profile.followingCount}', isDark),
          _buildStatDivider(isDark),
          _buildStatItem('Reels', '${profile.reelsCount}', isDark),
          _buildStatDivider(isDark),
          _buildStatItem('Credits', '${profile.tokensRemaining}', isDark),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, bool isDark) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Text(
          value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? AppColors.forest200 : AppColors.forest700,
          ),
        ),
      ],
    );
  }

  Widget _buildStatDivider(bool isDark) {
    return Container(
      width: 1,
      height: 24,
      color: isDark ? AppColors.borderDarkSubtle : AppColors.borderLightSubtle,
    );
  }

  Widget _buildActionHub(
    BuildContext context,
    UserProfileModel profile,
    bool isDark,
  ) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
      child: Row(
        children: <Widget>[
          AppButton(
            label: 'Edit Profile',
            variant: AppButtonVariant.secondary,
            onPressed: () => EditProfileSheet.show(context, profile),
          ),
          const SizedBox(width: AppSpacing.s2),
          AppButton(
            label: 'Creator Studio 🎨',
            variant: AppButtonVariant.primary,
            onPressed: () => context.push('/creator/dashboard'),
          ),
          const SizedBox(width: AppSpacing.s2),
          AppButton(
            label: 'Business Collabs 💼',
            variant: AppButtonVariant.secondary,
            onPressed: () => context.push('/business/campaigns'),
          ),
          const SizedBox(width: AppSpacing.s2),
          AppButton(
            label: 'Quests & Badges 🔥',
            variant: AppButtonVariant.ghost,
            onPressed: () => context.push('/gamification'),
          ),
          const SizedBox(width: AppSpacing.s2),
          AppButton(
            label: 'AI Companion 🤖',
            variant: AppButtonVariant.ghost,
            onPressed: () => context.push('/companion'),
          ),
        ],
      ),
    );
  }

  Widget _buildTabSelector(
    BuildContext context,
    WidgetRef ref,
    int activeTab,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
      child: Row(
        children: <Widget>[
          Expanded(
            child: InkWell(
              onTap: () =>
                  ref.read(profileNotifierProvider.notifier).switchTab(0),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: activeTab == 0
                          ? AppColors.moss500
                          : Colors.transparent,
                      width: 2.5,
                    ),
                  ),
                ),
                child: Text(
                  'My Reels',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: activeTab == 0
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: activeTab == 0
                        ? (isDark ? AppColors.cream50 : AppColors.forest900)
                        : (isDark ? AppColors.forest200 : AppColors.forest700),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: () =>
                  ref.read(profileNotifierProvider.notifier).switchTab(1),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: activeTab == 1
                          ? AppColors.moss500
                          : Colors.transparent,
                      width: 2.5,
                    ),
                  ),
                ),
                child: Text(
                  'Saved',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: activeTab == 1
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: activeTab == 1
                        ? (isDark ? AppColors.cream50 : AppColors.forest900)
                        : (isDark ? AppColors.forest200 : AppColors.forest700),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoGrid(
    BuildContext context,
    List<FeedItemModel> items,
    String emptyTitle,
    String emptySubtitle,
    bool isDark,
  ) {
    if (items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s6),
        child: AppEmptyState(
          title: emptyTitle,
          description: emptySubtitle,
          icon: const Icon(
            Icons.video_library_outlined,
            size: 40,
            color: AppColors.moss500,
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: AppSpacing.s2,
        mainAxisSpacing: AppSpacing.s2,
        childAspectRatio: 0.65,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final video = items[index];

        return Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.forest900 : AppColors.cream200,
            borderRadius: BorderRadius.circular(AppRadii.sm),
            border: Border.all(
              color: isDark
                  ? AppColors.borderDarkSubtle
                  : AppColors.borderLightSubtle,
            ),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              const Center(
                child: Icon(
                  Icons.play_circle_fill,
                  color: AppColors.moss500,
                  size: 28,
                ),
              ),
              Align(
                alignment: Alignment.bottomLeft,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.transparent, Colors.black87],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                  child: Row(
                    children: <Widget>[
                      const Icon(
                        Icons.visibility,
                        color: Colors.white,
                        size: 10,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${video.viewsCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
