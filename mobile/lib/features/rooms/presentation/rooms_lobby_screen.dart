import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/theme/app_colors.dart';
import 'package:vidsnap_ai/core/widgets/app_button.dart';
import 'package:vidsnap_ai/core/widgets/app_card.dart';
import 'package:vidsnap_ai/core/widgets/app_empty_state.dart';
import 'package:vidsnap_ai/core/widgets/app_error_view.dart';
import 'package:vidsnap_ai/core/widgets/app_skeleton.dart';
import 'package:vidsnap_ai/core/widgets/app_text_field.dart';
import 'package:vidsnap_ai/features/rooms/domain/room_models.dart';
import 'package:vidsnap_ai/features/rooms/presentation/providers/rooms_provider.dart';
import 'package:vidsnap_ai/features/rooms/presentation/widgets/create_room_sheet.dart';
import 'package:vidsnap_ai/features/rooms/presentation/widgets/passcode_dialog.dart';
import 'package:vidsnap_ai/features/social/presentation/providers/communities_provider.dart';

class RoomsLobbyScreen extends ConsumerStatefulWidget {
  const RoomsLobbyScreen({super.key});

  @override
  ConsumerState<RoomsLobbyScreen> createState() => _RoomsLobbyScreenState();
}

class _RoomsLobbyScreenState extends ConsumerState<RoomsLobbyScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _roomSearchController = TextEditingController();
  final _communitySearchController = TextEditingController();

  final List<String> _communityCategories = [
    'all',
    'general',
    'tech',
    'gaming',
    'art',
    'comedy',
    'music',
    'fitness',
    'lifestyle',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _roomSearchController.dispose();
    _communitySearchController.dispose();
    super.dispose();
  }

  void _openCreateRoomSheet() {
    showModalBottomSheet<RoomModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CreateRoomSheet(),
    ).then((newRoom) {
      if (newRoom != null && mounted) {
        unawaited(context.push('/rooms/${newRoom.roomId}'));
      }
    });
  }

  Future<void> _handleJoinRoom(RoomModel room) async {
    if (room.isPrivate) {
      final passcode = await showDialog<String>(
        context: context,
        builder: (_) => PasscodeDialog(roomTitle: room.name),
      );
      if (passcode != null && mounted) {
        unawaited(
          context.push(
            '/rooms/${room.roomId}?passcode=${Uri.encodeComponent(passcode)}',
          ),
        );
      }
    } else {
      unawaited(context.push('/rooms/${room.roomId}'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rooms & Social'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.moss500,
          labelColor: AppColors.moss500,
          unselectedLabelColor: isDark
              ? AppColors.cream400
              : AppColors.forest600,
          tabs: const [
            Tab(
              icon: Icon(Icons.group_outlined, size: 20),
              text: 'Watch Together',
            ),
            Tab(
              icon: Icon(Icons.diversity_3_outlined, size: 20),
              text: 'Communities',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildWatchTogetherTab(isDark, theme),
          _buildCommunitiesTab(isDark, theme),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.moss500,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Host Room'),
        onPressed: _openCreateRoomSheet,
      ),
    );
  }

  Widget _buildWatchTogetherTab(bool isDark, ThemeData theme) {
    final lobbyState = ref.watch(roomsLobbyProvider);
    final lobbyNotifier = ref.read(roomsLobbyProvider.notifier);

    return RefreshIndicator(
      onRefresh: lobbyNotifier.loadRooms,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.s4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppTextField(
                    label: 'Search Rooms',
                    controller: _roomSearchController,
                    hintText: 'Search by room title or topic...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _roomSearchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _roomSearchController.clear();
                              lobbyNotifier.setSearchQuery('');
                            },
                          )
                        : null,
                    onChanged: lobbyNotifier.setSearchQuery,
                  ),
                  const SizedBox(height: AppSpacing.s3),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip(
                          label: 'All Rooms',
                          isSelected: lobbyState.selectedFilter == 'all',
                          onTap: () => lobbyNotifier.setFilter('all'),
                          isDark: isDark,
                        ),
                        const SizedBox(width: AppSpacing.s2),
                        _buildFilterChip(
                          label: 'Public Only',
                          isSelected: lobbyState.selectedFilter == 'public',
                          onTap: () => lobbyNotifier.setFilter('public'),
                          isDark: isDark,
                        ),
                        const SizedBox(width: AppSpacing.s2),
                        _buildFilterChip(
                          label: 'Passcode Protected',
                          isSelected: lobbyState.selectedFilter == 'private',
                          onTap: () => lobbyNotifier.setFilter('private'),
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (lobbyState.isLoading && lobbyState.rooms.isEmpty)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.s3),
                    child: AppSkeleton(
                      height: 120,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                  ),
                  childCount: 4,
                ),
              ),
            )
          else if (lobbyState.errorMessage != null && lobbyState.rooms.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: AppErrorView(
                failure: AppFailure(
                  type: FailureType.server,
                  message: lobbyState.errorMessage!,
                ),
                onRetry: lobbyNotifier.loadRooms,
              ),
            )
          else if (lobbyState.rooms.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: AppEmptyState(
                icon: const Icon(
                  Icons.meeting_room_outlined,
                  size: 48,
                  color: AppColors.moss500,
                ),
                title: 'No Active Watch Parties',
                description:
                    'Be the first creator to host a Watch Together party!',
                actionLabel: 'Host Party Now',
                onAction: _openCreateRoomSheet,
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.s4,
                0,
                AppSpacing.s4,
                AppSpacing.s16, // Extra space for FAB
              ),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  final room = lobbyState.rooms[index];
                  return _buildRoomCard(room, isDark, theme);
                }, childCount: lobbyState.rooms.length),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRoomCard(RoomModel room, bool isDark, ThemeData theme) {
    final dangerColor = isDark ? AppColors.dangerDark : AppColors.dangerLight;
    final warningColor = isDark
        ? AppColors.warningDark
        : AppColors.warningLight;

    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.s3),
      padding: const EdgeInsets.all(AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s2,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: dangerColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadii.sm),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.fiber_manual_record,
                      color: dangerColor,
                      size: 10,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'LIVE',
                      style: TextStyle(
                        color: dangerColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              if (room.isPrivate)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.s2,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: warningColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.lock, color: warningColor, size: 10),
                      const SizedBox(width: 4),
                      Text(
                        'PASSCODE',
                        style: TextStyle(
                          color: warningColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              const Spacer(),
              Icon(
                Icons.people,
                size: 16,
                color: isDark ? AppColors.cream400 : AppColors.forest600,
              ),
              const SizedBox(width: 4),
              Text(
                '${room.participantCount}',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            room.name,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (room.description.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              room.description,
              style: theme.textTheme.bodySmall?.copyWith(
                color: isDark ? AppColors.cream300 : AppColors.forest700,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: AppSpacing.s3),
          Container(
            padding: const EdgeInsets.all(AppSpacing.s2),
            decoration: BoxDecoration(
              color: isDark ? AppColors.forest950 : AppColors.cream100,
              borderRadius: BorderRadius.circular(AppRadii.sm),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.movie_creation_outlined,
                  size: 16,
                  color: AppColors.moss500,
                ),
                const SizedBox(width: AppSpacing.s2),
                Expanded(
                  child: Text(
                    room.watchState.mediaTitle.isNotEmpty
                        ? room.watchState.mediaTitle
                        : 'No video selected',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            children: [
              Icon(
                Icons.person_pin,
                size: 16,
                color: isDark ? AppColors.cream400 : AppColors.forest600,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Host: ${room.hostName}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: isDark ? AppColors.cream400 : AppColors.forest600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              AppButton(
                label: 'Join Party',
                variant: AppButtonVariant.primary,
                size: AppButtonSize.sm,
                onPressed: () => unawaited(_handleJoinRoom(room)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCommunitiesTab(bool isDark, ThemeData theme) {
    final commState = ref.watch(communitiesProvider);
    final commNotifier = ref.read(communitiesProvider.notifier);

    return RefreshIndicator(
      onRefresh: commNotifier.loadCommunities,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.s4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppTextField(
                    label: 'Search Communities',
                    controller: _communitySearchController,
                    hintText: 'Search by topic, hobby, or interest...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _communitySearchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _communitySearchController.clear();
                              commNotifier.setSearch('');
                            },
                          )
                        : null,
                    onChanged: commNotifier.setSearch,
                  ),
                  const SizedBox(height: AppSpacing.s3),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _communityCategories.map((cat) {
                        final isSelected = commState.selectedCategory == cat;
                        return Padding(
                          padding: const EdgeInsets.only(right: AppSpacing.s2),
                          child: _buildFilterChip(
                            label: cat[0].toUpperCase() + cat.substring(1),
                            isSelected: isSelected,
                            onTap: () => commNotifier.setCategory(cat),
                            isDark: isDark,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (commState.isLoading && commState.communities.isEmpty)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.s3),
                    child: AppSkeleton(
                      height: 100,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                  ),
                  childCount: 4,
                ),
              ),
            )
          else if (commState.errorMessage != null &&
              commState.communities.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: AppErrorView(
                failure: AppFailure(
                  type: FailureType.server,
                  message: commState.errorMessage!,
                ),
                onRetry: commNotifier.loadCommunities,
              ),
            )
          else if (commState.communities.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: AppEmptyState(
                icon: Icon(
                  Icons.diversity_3,
                  size: 48,
                  color: AppColors.moss500,
                ),
                title: 'No Communities Found',
                description: 'Try searching with different terms or selecting another category.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.s4,
                0,
                AppSpacing.s4,
                AppSpacing.s16,
              ),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  final item = commState.communities[index];
                  return _buildCommunityCard(item, isDark, theme);
                }, childCount: commState.communities.length),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCommunityCard(
    CommunityModel community,
    bool isDark,
    ThemeData theme,
  ) {
    final commNotifier = ref.read(communitiesProvider.notifier);

    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.s3),
      padding: const EdgeInsets.all(AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.moss500.withValues(alpha: 0.15),
                child: const Icon(
                  Icons.groups,
                  color: AppColors.moss500,
                  size: 22,
                ),
              ),
              const SizedBox(width: AppSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      community.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '#${community.slug} • ${community.category.toUpperCase()}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.moss500,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              AppButton(
                label: community.isMember ? 'Joined' : 'Join',
                variant: community.isMember
                    ? AppButtonVariant.ghost
                    : AppButtonVariant.primary,
                size: AppButtonSize.sm,
                leftIcon: Icon(
                  community.isMember ? Icons.check : Icons.add,
                  size: 16,
                ),
                onPressed: () =>
                    unawaited(commNotifier.toggleJoin(community.communityId)),
              ),
            ],
          ),
          if (community.description.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.s2),
            Text(
              community.description,
              style: theme.textTheme.bodySmall?.copyWith(
                color: isDark ? AppColors.cream300 : AppColors.forest700,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: AppSpacing.s3),
          Row(
            children: [
              Icon(
                Icons.people_outline,
                size: 14,
                color: isDark ? AppColors.cream400 : AppColors.forest600,
              ),
              const SizedBox(width: 4),
              Text(
                '${community.membersCount} members',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isDark ? AppColors.cream400 : AppColors.forest600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s3,
          vertical: AppSpacing.s2,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.moss500
              : (isDark ? AppColors.forest900 : AppColors.cream100),
          borderRadius: BorderRadius.circular(AppRadii.pill),
          border: Border.all(
            color: isSelected
                ? AppColors.moss500
                : (isDark
                      ? AppColors.borderDarkSubtle
                      : AppColors.borderLightSubtle),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isDark ? AppColors.cream200 : AppColors.forest800),
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
