import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/business/domain/business_models.dart';
import 'package:vidsnap_ai/features/business/presentation/providers/business_provider.dart';

class BusinessMarketplaceScreen extends ConsumerWidget {
  const BusinessMarketplaceScreen({super.key});

  static const List<String> categories = [
    'tech',
    'lifestyle',
    'gaming',
    'fitness',
    'fashion',
    'beauty',
  ];

  void _showPitchSheet(
    BuildContext context,
    WidgetRef ref,
    CampaignModel campaign,
  ) {
    final pitchController = TextEditingController();
    final reelIdController = TextEditingController();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetCtx) {
        final theme = Theme.of(bottomSheetCtx);
        final isDark = theme.brightness == Brightness.dark;
        final bottomInset = MediaQuery.of(bottomSheetCtx).viewInsets.bottom;

        return Container(
          padding: EdgeInsets.only(
            left: AppSpacing.s4,
            right: AppSpacing.s4,
            top: AppSpacing.s4,
            bottom: AppSpacing.s6 + bottomInset,
          ),
          decoration: BoxDecoration(
            color: isDark ? AppColors.forest900 : AppColors.cream50,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AppRadii.lg),
            ),
            border: Border.all(
              color: isDark
                  ? AppColors.borderDarkSubtle
                  : AppColors.borderLightSubtle,
            ),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.forest700 : AppColors.cream300,
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.s4),
                Text(
                  'Pitch for "${campaign.title}"',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.s2),
                Text(
                  'Offered Perk: ${campaign.budgetPerk}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.moss500,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.s4),
                AppTextField(
                  label: 'Your Pitch / Proposal',
                  hintText:
                      'Describe your creative video concept for this brand...',
                  controller: pitchController,
                  maxLines: 3,
                ),
                const SizedBox(height: AppSpacing.s3),
                AppTextField(
                  label: 'Portfolio Reel ID (Optional)',
                  hintText: 'e.g. reel_123',
                  controller: reelIdController,
                ),
                const SizedBox(height: AppSpacing.s4),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.s3),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.forest950 : AppColors.cream100,
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                  ),
                  child: const Row(
                    children: <Widget>[
                      Icon(
                        Icons.verified_user_outlined,
                        size: 16,
                        color: AppColors.moss500,
                      ),
                      SizedBox(width: AppSpacing.s2),
                      Expanded(
                        child: Text(
                          'Pitches undergo automated brand-safety screening before delivery.',
                          style: TextStyle(fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.s6),
                AppButton(
                  label: 'Submit Collaboration Pitch',
                  onPressed: () async {
                    final pitch = pitchController.text.trim();
                    if (pitch.length >= 10) {
                      Navigator.of(bottomSheetCtx).pop();
                      await ref
                          .read(businessNotifierProvider.notifier)
                          .applyPitch(
                            campaignId: campaign.campaignId,
                            pitch: pitch,
                            reelId: reelIdController.text.trim().isNotEmpty
                                ? reelIdController.text.trim()
                                : null,
                          );
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCreateCampaignDialog(BuildContext context, WidgetRef ref) {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    final budgetController = TextEditingController();
    String category = 'tech';

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Post Sponsorship Brief'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                AppTextField(
                  label: 'Campaign Title',
                  hintText: 'e.g. Summer Tech Showcase',
                  controller: titleController,
                ),
                const SizedBox(height: AppSpacing.s3),
                AppTextField(
                  label: 'Description & Brief',
                  hintText: 'Requirements for creators...',
                  controller: descController,
                  maxLines: 3,
                ),
                const SizedBox(height: AppSpacing.s3),
                AppTextField(
                  label: 'Budget / Perk',
                  hintText: 'e.g. \$750 + Free Headphones',
                  controller: budgetController,
                ),
                const SizedBox(height: AppSpacing.s3),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: categories
                      .map(
                        (c) => DropdownMenuItem(
                          value: c,
                          child: Text(c.toUpperCase()),
                        ),
                      )
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => category = val);
                  },
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
                final title = titleController.text.trim();
                final desc = descController.text.trim();
                final budget = budgetController.text.trim();

                if (title.isNotEmpty && desc.isNotEmpty && budget.isNotEmpty) {
                  Navigator.of(dialogCtx).pop();
                  await ref
                      .read(businessNotifierProvider.notifier)
                      .createCampaign(
                        CreateCampaignInput(
                          title: title,
                          description: desc,
                          budgetPerk: budget,
                          category: category,
                        ),
                      );
                }
              },
              child: const Text('Post Campaign'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final state = ref.watch(businessNotifierProvider);

    ref.listen<BusinessState>(businessNotifierProvider, (previous, next) {
      if (next.feedbackMessage != null &&
          next.feedbackMessage != previous?.feedbackMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.feedbackMessage!),
            backgroundColor: AppColors.moss500,
            duration: const Duration(seconds: 4),
          ),
        );
        ref.read(businessNotifierProvider.notifier).clearFeedback();
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Collab Marketplace'),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.add_box_outlined),
            tooltip: 'Post Campaign Brief',
            onPressed: () => _showCreateCampaignDialog(context, ref),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            // Category Filter Strip
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                color: isDark ? AppColors.forest900 : AppColors.cream100,
                border: Border(
                  bottom: BorderSide(
                    color: isDark
                        ? AppColors.borderDarkSubtle
                        : AppColors.borderLightSubtle,
                  ),
                ),
              ),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3),
                itemCount: categories.length + 1,
                separatorBuilder: (context, index) =>
                    const SizedBox(width: AppSpacing.s2),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    final isAllSelected = state.selectedCategory == null;
                    return FilterChip(
                      label: const Text('All'),
                      selected: isAllSelected,
                      selectedColor: isDark
                          ? AppColors.forest700
                          : AppColors.sage200,
                      onSelected: (_) => ref
                          .read(businessNotifierProvider.notifier)
                          .selectCategory(null),
                    );
                  }

                  final cat = categories[index - 1];
                  final isSelected = state.selectedCategory == cat;

                  return FilterChip(
                    label: Text(cat.toUpperCase()),
                    selected: isSelected,
                    selectedColor: isDark
                        ? AppColors.forest700
                        : AppColors.sage200,
                    onSelected: (_) => ref
                        .read(businessNotifierProvider.notifier)
                        .selectCategory(cat),
                  );
                },
              ),
            ),

            // Campaign list or empty state
            Expanded(
              child: state.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : state.campaigns.isEmpty
                  ? Center(
                      child: Text(
                        'No active sponsorship briefs right now.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: isDark
                              ? AppColors.forest200
                              : AppColors.forest700,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.s4),
                      itemCount: state.campaigns.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: AppSpacing.s3),
                      itemBuilder: (context, index) {
                        final campaign = state.campaigns[index];
                        return _buildCampaignCard(
                          context,
                          ref,
                          campaign,
                          isDark,
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCampaignCard(
    BuildContext context,
    WidgetRef ref,
    CampaignModel campaign,
    bool isDark,
  ) {
    final theme = Theme.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Expanded(
                child: Text(
                  campaign.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest800 : AppColors.sage100,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                  border: Border.all(color: AppColors.moss500),
                ),
                child: Text(
                  campaign.budgetPerk,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.moss500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'by ${campaign.companyName} • ${campaign.category.toUpperCase()}',
            style: theme.textTheme.labelSmall?.copyWith(
              color: isDark ? AppColors.forest200 : AppColors.forest700,
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            campaign.description,
            style: theme.textTheme.bodySmall,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(
                '${campaign.applicationsCount} pitches submitted',
                style: const TextStyle(fontSize: 11),
              ),
              ElevatedButton(
                onPressed: () => _showPitchSheet(context, ref, campaign),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.moss500,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.s3,
                    vertical: 8,
                  ),
                ),
                child: const Text('Pitch / Apply'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
