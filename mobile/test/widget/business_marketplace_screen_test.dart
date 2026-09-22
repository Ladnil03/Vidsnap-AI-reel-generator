import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/business/data/business_repository.dart';
import 'package:vidsnap_ai/features/business/domain/business_models.dart';
import 'package:vidsnap_ai/features/business/presentation/business_marketplace_screen.dart';

class _FakeBusinessRepository implements BusinessRepository {
  final List<CampaignModel> _campaigns = [
    CampaignModel(
      campaignId: 'camp-1',
      businessId: 'biz-1',
      companyName: 'TechCorp',
      title: 'Tech Gadget Launch',
      description:
          'Create an engaging 30s unboxing reel of our latest smart device.',
      budgetPerk: '\$500 + Free Product',
      category: 'tech',
      status: CampaignStatus.active,
      applicationsCount: 3,
      createdAt: DateTime.now(),
    ),
    CampaignModel(
      campaignId: 'camp-2',
      businessId: 'biz-2',
      companyName: 'GlowCosmetics',
      title: 'Summer Glow Up',
      description: 'Show your morning skin prep routine using our serum.',
      budgetPerk: '\$350 + Makeup Kit',
      category: 'lifestyle',
      status: CampaignStatus.active,
      applicationsCount: 7,
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<BusinessProfileModel> getProfile() async {
    return const BusinessProfileModel(
      businessId: 'biz-1',
      userId: 'user-b1',
      companyName: 'TechCorp',
      website: 'https://techcorp.io',
      industry: 'Technology',
      verificationStatus: 'verified',
    );
  }

  @override
  Future<BusinessProfileModel> updateProfile(
    CreateBusinessProfileInput input,
  ) async {
    return BusinessProfileModel(
      businessId: 'biz-1',
      userId: 'user-b1',
      companyName: input.companyName,
      website: input.website,
      industry: input.industry,
    );
  }

  @override
  Future<List<CampaignModel>> listCampaigns({
    String? category,
    String status = 'active',
  }) async {
    if (category != null && category.isNotEmpty) {
      return _campaigns
          .where((c) => c.category.toLowerCase() == category.toLowerCase())
          .toList();
    }
    return List<CampaignModel>.from(_campaigns);
  }

  @override
  Future<CampaignModel> getCampaign(String campaignId) async {
    return _campaigns.firstWhere((c) => c.campaignId == campaignId);
  }

  @override
  Future<CampaignModel> createCampaign(CreateCampaignInput input) async {
    final newCampaign = CampaignModel(
      campaignId: 'camp-${_campaigns.length + 1}',
      businessId: 'biz-1',
      companyName: 'TechCorp',
      title: input.title,
      description: input.description,
      budgetPerk: input.budgetPerk,
      category: input.category,
      status: CampaignStatus.active,
      applicationsCount: 0,
      createdAt: DateTime.now(),
    );
    _campaigns.add(newCampaign);
    return newCampaign;
  }

  @override
  Future<CollabApplicationModel> applyToCampaign({
    required String campaignId,
    required String pitch,
    String? portfolioReelId,
  }) async {
    return CollabApplicationModel(
      applicationId: 'app-999',
      campaignId: campaignId,
      creatorName: 'Top Creator',
      creatorHandle: 'top_creator',
      pitch: pitch,
      portfolioReelId: portfolioReelId,
      status: 'pending',
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<List<CollabApplicationModel>> getCampaignApplications(
    String campaignId,
  ) async {
    return const <CollabApplicationModel>[];
  }
}

void main() {
  group('BusinessMarketplaceScreen Widget Tests', () {
    late _FakeBusinessRepository fakeRepo;

    setUp(() {
      fakeRepo = _FakeBusinessRepository();
    });

    testWidgets(
      'renders campaign list with title, brand name, and budget perk badge',
      (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [businessRepositoryProvider.overrideWithValue(fakeRepo)],
            child: const MaterialApp(home: BusinessMarketplaceScreen()),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Collab Marketplace'), findsOneWidget);
        expect(find.text('Tech Gadget Launch'), findsOneWidget);
        expect(find.text('by TechCorp • TECH'), findsOneWidget);
        expect(find.text('\$500 + Free Product'), findsOneWidget);
        expect(find.text('Summer Glow Up'), findsOneWidget);
        expect(find.text('by GlowCosmetics • LIFESTYLE'), findsOneWidget);
      },
    );

    testWidgets('filters campaigns when category chip is tapped', (
      tester,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [businessRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: BusinessMarketplaceScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Tech Gadget Launch'), findsOneWidget);
      expect(find.text('Summer Glow Up'), findsOneWidget);

      // Tap 'LIFESTYLE' category chip
      await tester.tap(find.text('LIFESTYLE'));
      await tester.pumpAndSettle();

      // Only Lifestyle campaign should be visible now
      expect(find.text('Tech Gadget Launch'), findsNothing);
      expect(find.text('Summer Glow Up'), findsOneWidget);

      // Tap 'All' to restore
      await tester.tap(find.text('All'));
      await tester.pumpAndSettle();

      expect(find.text('Tech Gadget Launch'), findsOneWidget);
      expect(find.text('Summer Glow Up'), findsOneWidget);
    });

    testWidgets('opens pitch proposal modal and submits a pitch', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2200);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [businessRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: BusinessMarketplaceScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // Tap the first 'Pitch / Apply' button
      final pitchButtons = find.widgetWithText(ElevatedButton, 'Pitch / Apply');
      expect(pitchButtons, findsWidgets);
      await tester.tap(pitchButtons.first);
      await tester.pumpAndSettle();

      // Verify pitch bottom sheet opened
      expect(find.text('Pitch for "Tech Gadget Launch"'), findsOneWidget);
      expect(find.text('Offered Perk: \$500 + Free Product'), findsOneWidget);

      // Fill in proposal
      final proposalField = find.widgetWithText(
        TextField,
        'Describe your creative video concept for this brand...',
      );
      await tester.enterText(
        proposalField,
        'I will craft a cinematic macro-lens unboxing with ASMR audio.',
      );

      // Fill in portfolio reel ID
      final reelField = find.widgetWithText(TextField, 'e.g. reel_123');
      await tester.enterText(reelField, 'reel_asmr_456');
      await tester.pumpAndSettle();

      // Submit pitch
      final submitButton = find.text('Submit Collaboration Pitch');
      await tester.tap(submitButton);
      await tester.pumpAndSettle();

      // Verify modal is dismissed and success snackbar shows
      expect(find.text('Pitch for "Tech Gadget Launch"'), findsNothing);
      expect(find.textContaining('Pitch submitted!'), findsOneWidget);
    });

    testWidgets('opens post sponsorship brief dialog and creates campaign', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2200);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [businessRepositoryProvider.overrideWithValue(fakeRepo)],
          child: const MaterialApp(home: BusinessMarketplaceScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // Tap create campaign action icon
      final addIcon = find.byIcon(Icons.add_box_outlined);
      expect(addIcon, findsOneWidget);
      await tester.tap(addIcon);
      await tester.pumpAndSettle();

      expect(find.text('Post Sponsorship Brief'), findsOneWidget);

      // Enter form values
      final titleField = find.widgetWithText(
        TextField,
        'e.g. Summer Tech Showcase',
      );
      await tester.enterText(titleField, 'Winter Gaming Marathon');

      final descField = find.widgetWithText(
        TextField,
        'Requirements for creators...',
      );
      await tester.enterText(
        descField,
        'Livestream 2 hours highlighting gameplay performance.',
      );

      final budgetField = find.widgetWithText(
        TextField,
        'e.g. \$750 + Free Headphones',
      );
      await tester.enterText(budgetField, '\$1,200 + Pro Controller');

      await tester.pumpAndSettle();

      // Tap 'Post Campaign'
      final postBtn = find.widgetWithText(ElevatedButton, 'Post Campaign');
      await tester.tap(postBtn);
      await tester.pumpAndSettle();

      // Dialog dismissed and success snackbar shown
      expect(find.text('Post Sponsorship Brief'), findsNothing);
      expect(find.textContaining('Winter Gaming Marathon'), findsWidgets);
    });
  });
}
