import 'package:flutter/foundation.dart';

enum CampaignStatus {
  draft('draft', 'Draft'),
  active('active', 'Active 🚀'),
  inReview('in_review', 'In Review ⏳'),
  paused('paused', 'Paused ⏸️'),
  completed('completed', 'Completed ✅');

  const CampaignStatus(this.value, this.label);
  final String value;
  final String label;

  static CampaignStatus fromString(String? value) {
    if (value == null) return CampaignStatus.active;
    return CampaignStatus.values.firstWhere(
      (s) => s.value.toLowerCase() == value.toLowerCase(),
      orElse: () => CampaignStatus.active,
    );
  }
}

/// Verified business profile representing an advertiser or brand.
@immutable
class BusinessProfileModel {
  const BusinessProfileModel({
    required this.businessId,
    required this.userId,
    required this.companyName,
    required this.website,
    required this.industry,
    this.description = '',
    this.verificationStatus = 'none',
    this.createdAt,
  });

  final String businessId;
  final String userId;
  final String companyName;
  final String website;
  final String industry;
  final String description;
  final String verificationStatus;
  final DateTime? createdAt;

  bool get isVerified => verificationStatus == 'verified';

  factory BusinessProfileModel.fromJson(Map<String, dynamic> json) {
    return BusinessProfileModel(
      businessId:
          (json['business_id'] ?? json['businessId'] ?? '').toString(),
      userId: (json['user_id'] ?? json['userId'] ?? '').toString(),
      companyName:
          (json['company_name'] ?? json['companyName'] ?? '').toString(),
      website: (json['website'] ?? '').toString(),
      industry: (json['industry'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      verificationStatus:
          (json['verification_status'] ?? json['verificationStatus'] ?? 'none')
              .toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'business_id': businessId,
      'user_id': userId,
      'company_name': companyName,
      'website': website,
      'industry': industry,
      'description': description,
      'verification_status': verificationStatus,
      'created_at': ?createdAt?.toIso8601String(),
    };
  }
}

/// Sponsored brand campaign brief open for creator collaboration pitches.
@immutable
class CampaignModel {
  const CampaignModel({
    required this.campaignId,
    required this.businessId,
    required this.companyName,
    required this.title,
    required this.description,
    this.category = 'lifestyle',
    required this.budgetPerk,
    this.targetCreatorsCount = 5,
    this.requirements = const <String>[],
    this.deadline,
    this.status = CampaignStatus.active,
    this.applicationsCount = 0,
    this.createdAt,
  });

  final String campaignId;
  final String businessId;
  final String companyName;
  final String title;
  final String description;
  final String category;
  final String budgetPerk;
  final int targetCreatorsCount;
  final List<String> requirements;
  final DateTime? deadline;
  final CampaignStatus status;
  final int applicationsCount;
  final DateTime? createdAt;

  factory CampaignModel.fromJson(Map<String, dynamic> json) {
    return CampaignModel(
      campaignId:
          (json['campaign_id'] ?? json['campaignId'] ?? '').toString(),
      businessId:
          (json['business_id'] ?? json['businessId'] ?? '').toString(),
      companyName:
          (json['company_name'] ?? json['companyName'] ?? 'Brand Sponsor')
              .toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      category: (json['category'] ?? 'lifestyle').toString(),
      budgetPerk:
          (json['budget_perk'] ?? json['budgetPerk'] ?? '').toString(),
      targetCreatorsCount: (json['target_creators_count'] ??
          json['targetCreatorsCount'] ??
          5) as int,
      requirements: (json['requirements'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const <String>[],
      deadline: json['deadline'] != null
          ? DateTime.tryParse(json['deadline'].toString())
          : null,
      status: CampaignStatus.fromString(json['status']?.toString()),
      applicationsCount: (json['applications_count'] ??
          json['applicationsCount'] ??
          0) as int,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'campaign_id': campaignId,
      'business_id': businessId,
      'company_name': companyName,
      'title': title,
      'description': description,
      'category': category,
      'budget_perk': budgetPerk,
      'target_creators_count': targetCreatorsCount,
      'requirements': requirements,
      'deadline': ?deadline?.toIso8601String(),
      'status': status.value,
      'applications_count': applicationsCount,
      'created_at': ?createdAt?.toIso8601String(),
    };
  }
}

/// Creator pitch and collaboration application for a brand campaign.
@immutable
class CollabApplicationModel {
  const CollabApplicationModel({
    required this.applicationId,
    required this.campaignId,
    required this.creatorName,
    required this.creatorHandle,
    required this.pitch,
    this.portfolioReelId,
    this.brandSafetyScore = 100,
    this.isBrandSafe = true,
    this.status = 'applied',
    this.createdAt,
  });

  final String applicationId;
  final String campaignId;
  final String creatorName;
  final String creatorHandle;
  final String pitch;
  final String? portfolioReelId;
  final int brandSafetyScore;
  final bool isBrandSafe;
  final String status;
  final DateTime? createdAt;

  factory CollabApplicationModel.fromJson(Map<String, dynamic> json) {
    final safety = json['brand_safety'] is Map<String, dynamic>
        ? json['brand_safety'] as Map<String, dynamic>
        : <String, dynamic>{};

    return CollabApplicationModel(
      applicationId:
          (json['application_id'] ?? json['applicationId'] ?? '').toString(),
      campaignId:
          (json['campaign_id'] ?? json['campaignId'] ?? '').toString(),
      creatorName:
          (json['creator_name'] ?? json['creatorName'] ?? 'Creator')
              .toString(),
      creatorHandle:
          (json['creator_handle'] ?? json['creatorHandle'] ?? '').toString(),
      pitch: (json['pitch'] ?? '').toString(),
      portfolioReelId: json['portfolio_reel_id']?.toString(),
      brandSafetyScore:
          (safety['score'] ?? json['brand_safety_score'] ?? 100) as int,
      isBrandSafe:
          (safety['is_brand_safe'] ?? json['is_brand_safe'] ?? true) as bool,
      status: (json['status'] ?? 'applied').toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

/// Payload to publish a new sponsored campaign brief.
@immutable
class CreateCampaignInput {
  const CreateCampaignInput({
    required this.title,
    required this.description,
    this.category = 'lifestyle',
    required this.budgetPerk,
    this.targetCreatorsCount = 5,
    this.requirements = const <String>[],
    this.deadline,
  });

  final String title;
  final String description;
  final String category;
  final String budgetPerk;
  final int targetCreatorsCount;
  final List<String> requirements;
  final DateTime? deadline;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'title': title,
      'description': description,
      'category': category,
      'budget_perk': budgetPerk,
      'target_creators_count': targetCreatorsCount,
      'requirements': requirements,
      'deadline': (deadline ?? DateTime.now().add(const Duration(days: 30)))
          .toIso8601String(),
    };
  }
}

/// Payload to register or update a business profile.
@immutable
class CreateBusinessProfileInput {
  const CreateBusinessProfileInput({
    required this.companyName,
    required this.website,
    required this.industry,
    this.description = '',
  });

  final String companyName;
  final String website;
  final String industry;
  final String description;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'company_name': companyName,
      'website': website,
      'industry': industry,
      'description': description,
    };
  }
}
