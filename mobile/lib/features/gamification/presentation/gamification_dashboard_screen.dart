import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/features/gamification/domain/gamification_models.dart';
import 'package:vidsnap_ai/features/gamification/presentation/providers/gamification_provider.dart';

class GamificationDashboardScreen extends ConsumerWidget {
  const GamificationDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(gamificationNotifierProvider);

    ref.listen<GamificationState>(gamificationNotifierProvider, (
      previous,
      next,
    ) {
      if (next.feedbackMessage != null &&
          next.feedbackMessage != previous?.feedbackMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.feedbackMessage!),
            backgroundColor: AppColors.moss500,
            duration: const Duration(seconds: 3),
          ),
        );
        ref.read(gamificationNotifierProvider.notifier).clearFeedback();
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Achievements & Quests'),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Gamification',
            onPressed: () =>
                ref.read(gamificationNotifierProvider.notifier).loadDashboard(),
          ),
        ],
      ),
      body: SafeArea(
        child: state.isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () => ref
                    .read(gamificationNotifierProvider.notifier)
                    .loadDashboard(),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.s4),
                  children: <Widget>[
                    // 1. Level & XP Progression Card
                    _buildLevelCard(context, state.profile?.level, isDark),
                    const SizedBox(height: AppSpacing.s4),

                    // 2. Daily Streak & Check-in Card
                    _buildStreakCard(
                      context,
                      ref,
                      state.profile?.dailyStreak,
                      state.isDailyStreakActiveToday,
                      state.isCheckingIn,
                      isDark,
                    ),
                    const SizedBox(height: AppSpacing.s4),

                    // 3. Active Daily Quests
                    _buildQuestsSection(
                      context,
                      ref,
                      state.profile?.activeChallenges ??
                          const <UserChallengeModel>[],
                      state.isClaiming,
                      isDark,
                    ),
                    const SizedBox(height: AppSpacing.s4),

                    // 4. Badges Showcase
                    _buildBadgesSection(
                      context,
                      state.badges.isNotEmpty
                          ? state.badges
                          : (state.profile?.badgesUnlocked ??
                                const <UserBadgeModel>[]),
                      state.profile?.badgesUnlockedCount ?? 0,
                      state.profile?.badgesTotalCount ?? 0,
                      isDark,
                    ),
                    const SizedBox(height: AppSpacing.s4),

                    // 5. Global Leaderboard Section
                    _buildLeaderboardSection(
                      context,
                      state.leaderboard,
                      isDark,
                    ),
                    const SizedBox(height: AppSpacing.s6),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildLevelCard(
    BuildContext context,
    UserLevelModel? level,
    bool isDark,
  ) {
    final theme = Theme.of(context);
    final currentLevel = level?.level ?? 1;
    final title = level?.title ?? 'Novice Explorer 🧭';
    final currentXp = level?.currentXp ?? 0;
    final xpNext = level?.xpForNextLevel ?? 100;
    final progress = (level?.progressPct ?? 0.0) / 100.0;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? const [AppColors.moss700, AppColors.forest500]
                        : const [AppColors.sage300, AppColors.moss500],
                  ),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '$currentLevel',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Level $currentLevel Creator',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isDark ? AppColors.sage200 : AppColors.forest700,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s3,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest800 : AppColors.sage100,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
                child: Text(
                  '$currentXp XP',
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.sage300 : AppColors.forest600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadii.pill),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: isDark
                  ? AppColors.forest950
                  : AppColors.cream200,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.moss500,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(
                '${(progress * 100).toInt()}% towards Next Tier',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: isDark ? AppColors.forest200 : AppColors.forest700,
                ),
              ),
              Text(
                '$currentXp / $xpNext XP',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStreakCard(
    BuildContext context,
    WidgetRef ref,
    StreakStateModel? streak,
    bool isActiveToday,
    bool isCheckingIn,
    bool isDark,
  ) {
    final theme = Theme.of(context);
    final currentStreak = streak?.currentStreak ?? 0;
    final longestStreak = streak?.longestStreak ?? 0;
    final freezeTokens = streak?.freezeTokens ?? 0;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Text('🔥', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: AppSpacing.s2),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        '$currentStreak Day Streak',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Best Record: $longestStreak days',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: isDark
                              ? AppColors.forest200
                              : AppColors.forest700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: <Widget>[
                  const Text('🛡️', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 4),
                  Text(
                    '$freezeTokens Shields',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.sage200 : AppColors.forest800,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Row(
            children: <Widget>[
              Expanded(
                child: AppButton(
                  label: isActiveToday
                      ? 'Checked-In Today ✅'
                      : 'Claim Daily +25 XP',
                  variant: isActiveToday
                      ? AppButtonVariant.ghost
                      : AppButtonVariant.primary,
                  isLoading: isCheckingIn,
                  onPressed: isActiveToday
                      ? null
                      : () => ref
                            .read(gamificationNotifierProvider.notifier)
                            .recordDailyCheckIn(),
                ),
              ),
              if (freezeTokens > 0 && !isActiveToday) ...<Widget>[
                const SizedBox(width: AppSpacing.s2),
                IconButton(
                  icon: const Icon(Icons.shield_outlined),
                  tooltip: 'Use Streak Freeze Shield',
                  onPressed: () {
                    ref
                        .read(gamificationNotifierProvider.notifier)
                        .freezeStreak();
                  },
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuestsSection(
    BuildContext context,
    WidgetRef ref,
    List<UserChallengeModel> challenges,
    bool isClaiming,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'Active Quests',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.s2),
        if (challenges.isEmpty)
          AppCard(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.s4),
                child: Text(
                  'No quests active today. Check back tomorrow!',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: isDark ? AppColors.forest200 : AppColors.forest700,
                  ),
                ),
              ),
            ),
          )
        else
          ...challenges.map((quest) {
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.s2),
              child: AppCard(
                child: Row(
                  children: <Widget>[
                    Text(quest.icon, style: const TextStyle(fontSize: 26)),
                    const SizedBox(width: AppSpacing.s3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            quest.title,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            quest.description,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: isDark
                                  ? AppColors.forest200
                                  : AppColors.forest700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(AppRadii.pill),
                            child: LinearProgressIndicator(
                              value: quest.progressFraction,
                              minHeight: 6,
                              backgroundColor: isDark
                                  ? AppColors.forest950
                                  : AppColors.cream200,
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                AppColors.moss500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${quest.currentCount}/${quest.targetCount} completed',
                            style: theme.textTheme.labelSmall,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s2),
                    if (quest.isClaimed)
                      const Icon(
                        Icons.check_circle,
                        color: AppColors.successLight,
                      )
                    else if (quest.isCompleted)
                      ElevatedButton(
                        onPressed: isClaiming
                            ? null
                            : () => ref
                                  .read(gamificationNotifierProvider.notifier)
                                  .claimChallenge(quest.challengeId),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.moss500,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.s3,
                            vertical: 8,
                          ),
                        ),
                        child: Text('+${quest.rewardXp} XP'),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.s2,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.forest800
                              : AppColors.cream200,
                          borderRadius: BorderRadius.circular(AppRadii.sm),
                        ),
                        child: Text(
                          '+${quest.rewardXp} XP',
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildBadgesSection(
    BuildContext context,
    List<UserBadgeModel> badges,
    int unlockedCount,
    int totalCount,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Text(
              'Badge Showcase',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '$unlockedCount / ${totalCount > 0 ? totalCount : badges.length} Unlocked',
              style: theme.textTheme.labelSmall?.copyWith(
                color: isDark ? AppColors.sage200 : AppColors.forest700,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s2),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: AppSpacing.s2,
            crossAxisSpacing: AppSpacing.s2,
            childAspectRatio: 0.9,
          ),
          itemCount: badges.length,
          itemBuilder: (context, index) {
            final badge = badges[index];
            final unlocked = badge.isUnlocked;

            return InkWell(
              onTap: () {
                showDialog<void>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Row(
                      children: <Widget>[
                        Text(badge.icon, style: const TextStyle(fontSize: 24)),
                        const SizedBox(width: AppSpacing.s2),
                        Expanded(child: Text(badge.name)),
                      ],
                    ),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(badge.description),
                        const SizedBox(height: AppSpacing.s2),
                        Text(
                          unlocked
                              ? 'Status: Unlocked 🏆'
                              : 'Status: Locked 🔒',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: unlocked
                                ? AppColors.successLight
                                : AppColors.dangerLight,
                          ),
                        ),
                      ],
                    ),
                    actions: <Widget>[
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                );
              },
              child: Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest900 : AppColors.cream100,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  border: Border.all(
                    color: unlocked
                        ? (isDark ? AppColors.sage400 : AppColors.moss500)
                        : (isDark
                              ? AppColors.borderDarkSubtle
                              : AppColors.borderLightSubtle),
                    width: unlocked ? 1.5 : 1.0,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Text(
                      badge.icon,
                      style: TextStyle(
                        fontSize: 32,
                        color: unlocked
                            ? null
                            : Colors.grey.withValues(alpha: 0.4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        badge.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: unlocked
                              ? (isDark
                                    ? AppColors.cream50
                                    : AppColors.forest900)
                              : Colors.grey,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildLeaderboardSection(
    BuildContext context,
    LeaderboardResponseModel? leaderboard,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    if (leaderboard == null || leaderboard.entries.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          'Global Leaderboard',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.s2),
        AppCard(
          child: Column(
            children: leaderboard.entries.take(5).map((entry) {
              final isTop3 = entry.rank <= 3;
              final medal = entry.rank == 1
                  ? '🥇'
                  : entry.rank == 2
                  ? '🥈'
                  : entry.rank == 3
                  ? '🥉'
                  : '#${entry.rank}';

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: <Widget>[
                    SizedBox(
                      width: 32,
                      child: Text(
                        medal,
                        style: TextStyle(
                          fontSize: isTop3 ? 18 : 14,
                          fontWeight: isTop3
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s2),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            entry.displayName.isNotEmpty
                                ? entry.displayName
                                : entry.username,
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            entry.title,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: isDark
                                  ? AppColors.forest200
                                  : AppColors.forest700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${entry.score} XP',
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.sage300 : AppColors.moss500,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
