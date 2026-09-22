import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/create/presentation/providers/create_provider.dart';

class CreateScreen extends ConsumerStatefulWidget {
  const CreateScreen({super.key});

  @override
  ConsumerState<CreateScreen> createState() => _CreateScreenState();
}

class _CreateScreenState extends ConsumerState<CreateScreen> {
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _tagInputController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final state = ref.read(createProvider);
    _titleController.text = state.title;
    _descController.text = state.description;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _tagInputController.dispose();
    super.dispose();
  }

  Future<void> _pickVideo(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickVideo(
        source: source,
        maxDuration: const Duration(seconds: 300),
      );

      if (file != null) {
        ref.read(createProvider.notifier).setVideo(file.path, duration: 15.0);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access media: $e')),
        );
      }
    }
  }

  Future<void> _handlePublish() async {
    ref.read(createProvider.notifier).setTitle(_titleController.text);
    ref.read(createProvider.notifier).setDescription(_descController.text);

    final success = await ref.read(createProvider.notifier).uploadVideo();
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Reel uploaded! Transcoding enqueued in background.'),
          backgroundColor: AppColors.moss500,
        ),
      );
      ref.read(createProvider.notifier).clear();
      context.go('/feed');
    }
  }

  Future<void> _handleSaveDraft() async {
    ref.read(createProvider.notifier).setTitle(_titleController.text);
    ref.read(createProvider.notifier).setDescription(_descController.text);
    await ref.read(createProvider.notifier).saveDraft();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Draft saved locally!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.forest950 : AppColors.cream50;
    final textColor = isDark ? AppColors.cream50 : AppColors.forest900;
    final subtleTextColor = isDark ? AppColors.sage300 : AppColors.forest700;

    return Scaffold(
      backgroundColor: surfaceColor,
      appBar: AppBar(
        title: const Text('Create Reel'),
        centerTitle: true,
        backgroundColor: surfaceColor,
        elevation: 0,
        actions: <Widget>[
          if (state.pickedVideoPath != null)
            TextButton(
              onPressed: () {
                ref.read(createProvider.notifier).clear();
                _titleController.clear();
                _descController.clear();
              },
              child: const Text('Cancel'),
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.s4),
          child: state.pickedVideoPath == null
              ? _buildPickerView(state, isDark, textColor, subtleTextColor)
              : _buildEditFormView(state, isDark, textColor, subtleTextColor),
        ),
      ),
    );
  }

  Widget _buildPickerView(
    CreateState state,
    bool isDark,
    Color textColor,
    Color subtleTextColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        // Camera Viewport Card
        Container(
          height: 380.0,
          decoration: BoxDecoration(
            color: isDark ? AppColors.forest900 : AppColors.cream100,
            borderRadius: BorderRadius.circular(AppRadii.xl),
            border: Border.all(
              color: isDark ? AppColors.forest700 : AppColors.cream200,
              width: 1.5,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Container(
                width: 72.0,
                height: 72.0,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.forest800 : AppColors.sage200,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.videocam_rounded,
                  size: 38.0,
                  color: AppColors.moss500,
                ),
              ),
              const SizedBox(height: AppSpacing.s4),
              Text(
                'Record or Upload 9:16 Reel',
                style: TextStyle(
                  color: textColor,
                  fontSize: 18.0,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.s1),
              Text(
                'High-definition vertical videos up to 5 minutes',
                style: TextStyle(color: subtleTextColor, fontSize: 13.0),
              ),
              const SizedBox(height: AppSpacing.s6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s6),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: AppButton(
                        label: 'Camera',
                        variant: AppButtonVariant.primary,
                        onPressed: () => _pickVideo(ImageSource.camera),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.s3),
                    Expanded(
                      child: AppButton(
                        label: 'Gallery',
                        variant: AppButtonVariant.secondary,
                        onPressed: () => _pickVideo(ImageSource.gallery),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.s8),

        // Saved Drafts Section
        if (state.drafts.isNotEmpty) ...<Widget>[
          Text(
            'Saved Drafts (${state.drafts.length})',
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w700,
              fontSize: 16.0,
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.drafts.length,
            separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.s2),
            itemBuilder: (context, index) {
              final draft = state.drafts[index];
              return AppCard(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 44.0,
                    height: 44.0,
                    decoration: BoxDecoration(
                      color: AppColors.forest800,
                      borderRadius: BorderRadius.circular(AppRadii.sm),
                    ),
                    child: const Icon(Icons.movie_outlined, color: AppColors.sage300),
                  ),
                  title: Text(
                    draft.title,
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 14.0,
                    ),
                  ),
                  subtitle: Text(
                    '${draft.visibility.toUpperCase()} • ${draft.hashtags.length} tags',
                    style: TextStyle(color: subtleTextColor, fontSize: 12.0),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      IconButton(
                        icon: const Icon(Icons.edit, size: 20.0),
                        color: AppColors.moss500,
                        onPressed: () {
                          ref.read(createProvider.notifier).loadDraft(draft);
                          _titleController.text = draft.title;
                          _descController.text = draft.description;
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 20.0),
                        color: AppColors.dangerLight,
                        onPressed: () {
                          ref.read(createProvider.notifier).deleteDraft(draft.draftId);
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ],
    );
  }

  Widget _buildEditFormView(
    CreateState state,
    bool isDark,
    Color textColor,
    Color subtleTextColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        // Preview Header
        Container(
          height: 140.0,
          decoration: BoxDecoration(
            color: isDark ? AppColors.forest900 : AppColors.cream100,
            borderRadius: BorderRadius.circular(AppRadii.lg),
            border: Border.all(
              color: isDark ? AppColors.forest700 : AppColors.cream200,
            ),
          ),
          child: Row(
            children: <Widget>[
              Container(
                width: 90.0,
                decoration: const BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.horizontal(
                    left: Radius.circular(AppRadii.lg),
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.play_circle_fill_rounded,
                    color: AppColors.cream50,
                    size: 38.0,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.s4),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text(
                      'Ready to publish',
                      style: TextStyle(
                        color: AppColors.moss500,
                        fontWeight: FontWeight.bold,
                        fontSize: 13.0,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Text(
                      state.pickedVideoPath!.split(RegExp(r'[/\\]')).last,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: textColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14.0,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s2),
                    InkWell(
                      onTap: () => _pickVideo(ImageSource.gallery),
                      child: const Text(
                        'Change video',
                        style: TextStyle(
                          color: AppColors.moss500,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.s6),

        // Title Input
        AppTextField(
          label: 'Headline Title *',
          controller: _titleController,
          hintText: 'Catchy headline (min 3 chars)',
          prefixIcon: const Icon(Icons.title, size: 20.0),
        ),

        const SizedBox(height: AppSpacing.s4),

        // Description Input
        AppTextField(
          label: 'Caption & Description',
          controller: _descController,
          hintText: 'What is this reel about?',
          prefixIcon: const Icon(Icons.description_outlined, size: 20.0),
        ),

        const SizedBox(height: AppSpacing.s4),

        // AI Assistant Card for Hashtags & Hooks
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: <Widget>[
                  Expanded(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        const Icon(Icons.auto_awesome, color: AppColors.moss500, size: 18.0),
                        const SizedBox(width: AppSpacing.s2),
                        Flexible(
                          child: Text(
                            'AI Assistant',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: state.isGeneratingTags
                        ? null
                        : () {
                            ref.read(createProvider.notifier).setTitle(_titleController.text);
                            ref.read(createProvider.notifier).setDescription(_descController.text);
                            ref.read(createProvider.notifier).generateAiTags();
                          },
                    icon: state.isGeneratingTags
                        ? const SizedBox(
                            width: 14.0,
                            height: 14.0,
                            child: CircularProgressIndicator(strokeWidth: 2.0),
                          )
                        : const Icon(Icons.bolt, size: 16.0),
                    label: const Text('Generate', style: TextStyle(fontSize: 12.0)),
                  ),
                ],
              ),
              if (state.suggestedHook != null && state.suggestedHook!.isNotEmpty) ...<Widget>[
                const SizedBox(height: AppSpacing.s2),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.s2),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.forest800 : AppColors.sage100,
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                  ),
                  child: Text(
                    '💡 Hook: "${state.suggestedHook}"',
                    style: TextStyle(
                      color: isDark ? AppColors.cream100 : AppColors.forest900,
                      fontSize: 12.0,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.s3),

              // Hashtag chips
              Wrap(
                spacing: 6.0,
                runSpacing: 4.0,
                children: state.hashtags.map((tag) {
                  return Chip(
                    label: Text('#$tag', style: const TextStyle(fontSize: 11.5)),
                    deleteIcon: const Icon(Icons.close, size: 14.0),
                    onDeleted: () => ref.read(createProvider.notifier).removeHashtag(tag),
                    backgroundColor: isDark ? AppColors.forest700 : AppColors.cream200,
                    labelStyle: TextStyle(color: textColor),
                    side: BorderSide.none,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadii.pill),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: AppSpacing.s2),
              // Add Tag input
              Row(
                children: <Widget>[
                  Expanded(
                    child: TextField(
                      controller: _tagInputController,
                      style: TextStyle(color: textColor, fontSize: 13.0),
                      decoration: InputDecoration(
                        hintText: 'Add custom #tag',
                        hintStyle: TextStyle(color: subtleTextColor, fontSize: 13.0),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.s3,
                          vertical: AppSpacing.s2,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadii.pill),
                        ),
                      ),
                      onSubmitted: (val) {
                        ref.read(createProvider.notifier).addHashtag(val);
                        _tagInputController.clear();
                      },
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s2),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: AppColors.moss500),
                    onPressed: () {
                      ref.read(createProvider.notifier).addHashtag(_tagInputController.text);
                      _tagInputController.clear();
                    },
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.s4),

        // Visibility Dropdown
        DropdownButtonFormField<String>(
          initialValue: state.visibility,
          dropdownColor: isDark ? AppColors.forest900 : AppColors.cream50,
          decoration: InputDecoration(
            labelText: 'Visibility',
            prefixIcon: const Icon(Icons.visibility_outlined, size: 20.0),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
          ),
          items: const <DropdownMenuItem<String>>[
            DropdownMenuItem(value: 'public', child: Text('Public (Everyone)')),
            DropdownMenuItem(value: 'followers_only', child: Text('Followers Only')),
            DropdownMenuItem(value: 'unlisted', child: Text('Unlisted (Link only)')),
            DropdownMenuItem(value: 'private', child: Text('Private (Only me)')),
          ],
          onChanged: (val) {
            if (val != null) {
              ref.read(createProvider.notifier).setVisibility(val);
            }
          },
        ),

        const SizedBox(height: AppSpacing.s4),

        // Error message if any
        if (state.errorMessage != null) ...<Widget>[
          Container(
            padding: const EdgeInsets.all(AppSpacing.s3),
            decoration: BoxDecoration(
              color: isDark ? AppColors.forest800 : AppColors.cream200,
              borderRadius: BorderRadius.circular(AppRadii.sm),
              border: Border.all(color: AppColors.dangerLight),
            ),
            child: Text(
              state.errorMessage!,
              style: const TextStyle(color: AppColors.dangerLight, fontSize: 13.0),
            ),
          ),
          const SizedBox(height: AppSpacing.s4),
        ],

        // Upload progress indicator
        if (state.isUploading) ...<Widget>[
          LinearProgressIndicator(
            value: state.uploadProgress.percentage / 100.0,
            backgroundColor: isDark ? AppColors.forest700 : AppColors.cream200,
            color: AppColors.moss500,
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            'Uploading: ${state.uploadProgress.percentage.toStringAsFixed(0)}%',
            textAlign: TextAlign.center,
            style: TextStyle(color: subtleTextColor, fontSize: 12.0),
          ),
          const SizedBox(height: AppSpacing.s4),
        ],

        // Action Buttons: Save Draft & Publish
        Row(
          children: <Widget>[
            Expanded(
              flex: 2,
              child: AppButton(
                label: 'Save Draft',
                variant: AppButtonVariant.secondary,
                onPressed: state.isUploading ? null : _handleSaveDraft,
              ),
            ),
            const SizedBox(width: AppSpacing.s3),
            Expanded(
              flex: 3,
              child: AppButton(
                label: 'Publish Reel',
                variant: AppButtonVariant.primary,
                isLoading: state.isUploading,
                onPressed: state.isUploading ? null : _handlePublish,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
