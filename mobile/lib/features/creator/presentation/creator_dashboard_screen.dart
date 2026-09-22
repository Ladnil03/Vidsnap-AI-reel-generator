import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/router/auth_state_provider.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/creator/domain/creator_models.dart';
import 'package:vidsnap_ai/features/creator/presentation/providers/creator_provider.dart';

class CreatorDashboardScreen extends ConsumerStatefulWidget {
  const CreatorDashboardScreen({super.key});

  @override
  ConsumerState<CreatorDashboardScreen> createState() =>
      _CreatorDashboardScreenState();
}

class _CreatorDashboardScreenState
    extends ConsumerState<CreatorDashboardScreen> {
  final TextEditingController _copilotTopicController = TextEditingController();

  @override
  void dispose() {
    _copilotTopicController.dispose();
    super.dispose();
  }

  void _showVerificationDialog(BuildContext context) {
    final nicheController = TextEditingController();
    final statementController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Apply for Verified Creator'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              AppTextField(
                label: 'Niche',
                hintText: 'e.g. Comedy, Tech, Gaming',
                controller: nicheController,
              ),
              const SizedBox(height: AppSpacing.s3),
              AppTextField(
                label: 'Creator Statement',
                hintText: 'Why should your account be verified?',
                controller: statementController,
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final niche = nicheController.text.trim();
              final statement = statementController.text.trim();
              if (niche.isNotEmpty && statement.isNotEmpty) {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.of(dialogCtx).pop();
                final ok = await ref
                    .read(creatorNotifierProvider.notifier)
                    .applyVerification(niche: niche, statement: statement);
                if (mounted && ok) {
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Verification application submitted! ⏳'),
                      backgroundColor: AppColors.moss500,
                    ),
                  );
                }
              }
            },
            child: const Text('Submit Application'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(creatorNotifierProvider);
    final user = ref.watch(authStateProvider).currentUser;

    // RBAC Check: If not creator role, show Unlock Creator Studio CTA
    if (user != null && !user.isCreator) {
      return _buildUnlockCreatorScreen(context, isDark);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Creator Studio'),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Analytics',
            onPressed: () =>
                ref.read(creatorNotifierProvider.notifier).loadStudio(),
          ),
        ],
      ),
      body: SafeArea(
        child: state.isLoading && state.analytics == null
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () =>
                    ref.read(creatorNotifierProvider.notifier).loadStudio(),
                child: ListView(
                  padding: const EdgeInsets.all(AppSpacing.s4),
                  children: <Widget>[
                    // 1. Creator Verification & Handle Bar
                    _buildCreatorHeader(context, state.profile, isDark),
                    const SizedBox(height: AppSpacing.s4),

                    // 2. Period Selector Chips
                    _buildPeriodSelector(state.periodDays, isDark),
                    const SizedBox(height: AppSpacing.s4),

                    // 3. Analytics KPI Grid
                    _buildKpiGrid(state.analytics, isDark),
                    const SizedBox(height: AppSpacing.s4),

                    // 4. Creator Copilot AI Strategy Card
                    _buildCopilotCard(context, state, isDark),
                    const SizedBox(height: AppSpacing.s4),

                    // 5. Audience Affinity Breakdown
                    if (state.analytics?.audienceMoodAffinity.isNotEmpty ==
                        true)
                      _buildAudienceMoodSection(
                        state.analytics!.audienceMoodAffinity,
                        isDark,
                      ),
                    const SizedBox(height: AppSpacing.s6),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildUnlockCreatorScreen(BuildContext context, bool isDark) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Creator Studio')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.s6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.forest800 : AppColors.sage100,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text('🎨', style: TextStyle(fontSize: 40)),
                  ),
                ),
                const SizedBox(height: AppSpacing.s4),
                Text(
                  'Unlock Creator Studio',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.s2),
                Text(
                  'Access high-retention video analytics, AI viral hook recommendations with Creator Copilot, brand collaboration briefs, and verified badge perks.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: isDark ? AppColors.forest200 : AppColors.forest700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.s6),
                AppButton(
                  label: 'Activate Creator Account',
                  onPressed: () {
                    _showVerificationDialog(context);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCreatorHeader(
    BuildContext context,
    CreatorProfileModel? profile,
    bool isDark,
  ) {
    final handle = profile?.handle.isNotEmpty == true
        ? '@${profile!.handle}'
        : '@creator';
    final isVerified = profile?.isVerified ?? false;

    return AppCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Text('✨', style: TextStyle(fontSize: 24)),
              const SizedBox(width: AppSpacing.s2),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Text(
                        handle,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      if (isVerified) ...<Widget>[
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.verified,
                          color: AppColors.moss500,
                          size: 16,
                        ),
                      ],
                    ],
                  ),
                  Text(
                    profile?.verificationStatus.label ?? 'Unverified',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.forest200 : AppColors.forest700,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (!isVerified)
            TextButton.icon(
              icon: const Icon(Icons.shield_outlined, size: 16),
              label: const Text('Get Verified'),
              onPressed: () => _showVerificationDialog(context),
            ),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector(int activeDays, bool isDark) {
    const options = [7, 30, 90];

    return Row(
      children: options.map((days) {
        final isSelected = days == activeDays;
        return Padding(
          padding: const EdgeInsets.only(right: AppSpacing.s2),
          child: ChoiceChip(
            label: Text('$days Days'),
            selected: isSelected,
            selectedColor: isDark ? AppColors.forest700 : AppColors.sage300,
            onSelected: (_) {
              ref.read(creatorNotifierProvider.notifier).setPeriod(days);
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildKpiGrid(CreatorAnalyticsModel? analytics, bool isDark) {
    final views = analytics?.totalViews ?? 0;
    final watchHours = (analytics?.watchTimeHours ?? 0.0).toStringAsFixed(1);
    final impressions = analytics?.totalImpressions ?? 0;
    final completionRate = (analytics?.avgCompletionRatePct ?? 0.0)
        .toStringAsFixed(1);
    final engagementRate = (analytics?.engagementRatePct ?? 0.0)
        .toStringAsFixed(1);

    return Column(
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: _buildMetricTile('Total Views', '$views', '👁️', isDark),
            ),
            const SizedBox(width: AppSpacing.s2),
            Expanded(
              child: _buildMetricTile(
                'Watch Time',
                '$watchHours hrs',
                '⏱️',
                isDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s2),
        Row(
          children: <Widget>[
            Expanded(
              child: _buildMetricTile(
                'Impressions',
                '$impressions',
                '📈',
                isDark,
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            Expanded(
              child: _buildMetricTile(
                'Completion Rate',
                '$completionRate%',
                '🎯',
                isDark,
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            Expanded(
              child: _buildMetricTile(
                'Engagement',
                '$engagementRate%',
                '💬',
                isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricTile(
    String label,
    String value,
    String icon,
    bool isDark,
  ) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? AppColors.forest200 : AppColors.forest700,
                ),
              ),
              Text(icon, style: const TextStyle(fontSize: 14)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildCopilotCard(
    BuildContext context,
    CreatorState state,
    bool isDark,
  ) {
    final theme = Theme.of(context);
    final copilot = state.copilot;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Text('🤖', style: TextStyle(fontSize: 22)),
              const SizedBox(width: AppSpacing.s2),
              Text(
                'Creator Copilot AI',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            'Get AI-powered video hooks, viral score analysis, and optimal posting times.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: isDark ? AppColors.forest200 : AppColors.forest700,
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  controller: _copilotTopicController,
                  decoration: const InputDecoration(
                    hintText: 'Enter topic (e.g. Flutter 3.47 release)',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              ElevatedButton(
                onPressed: state.isGeneratingCopilot
                    ? null
                    : () {
                        ref
                            .read(creatorNotifierProvider.notifier)
                            .generateCopilot(_copilotTopicController.text);
                      },
                child: state.isGeneratingCopilot
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Generate'),
              ),
            ],
          ),
          if (copilot != null) ...<Widget>[
            const SizedBox(height: AppSpacing.s4),
            Container(
              padding: const EdgeInsets.all(AppSpacing.s3),
              decoration: BoxDecoration(
                color: isDark ? AppColors.forest950 : AppColors.cream100,
                borderRadius: BorderRadius.circular(AppRadii.md),
                border: Border.all(
                  color: isDark
                      ? AppColors.borderDarkSubtle
                      : AppColors.borderLightSubtle,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: <Widget>[
                      Text(
                        'Viral Potential: ${copilot.viralPotentialScore}/100',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '⏰ ${copilot.optimalPostingWindow}',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s2),
                  ...copilot.hooks.map(
                    (hook) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          const Text('💡 ', style: TextStyle(fontSize: 12)),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: DefaultTextStyle.of(context).style,
                                children: [
                                  TextSpan(
                                    text: '[${hook.hookStyle}] ',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.moss500,
                                    ),
                                  ),
                                  TextSpan(text: hook.hookText),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAudienceMoodSection(
    List<Map<String, dynamic>> moodAffinity,
    bool isDark,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          'Audience Mood Affinity',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: AppSpacing.s2),
        Wrap(
          spacing: AppSpacing.s2,
          runSpacing: AppSpacing.s2,
          children: moodAffinity.map((item) {
            final mood = (item['mood'] ?? 'chill').toString();
            final count = (item['count'] ?? 0).toString();

            return Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s3,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.forest900 : AppColors.cream100,
                borderRadius: BorderRadius.circular(AppRadii.pill),
                border: Border.all(
                  color: isDark
                      ? AppColors.borderDarkSubtle
                      : AppColors.borderLightSubtle,
                ),
              ),
              child: Text(
                '$mood ($count views)',
                style: const TextStyle(fontSize: 11),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
