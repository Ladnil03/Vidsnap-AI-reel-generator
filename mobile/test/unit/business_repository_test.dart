import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vidsnap_ai/features/business/data/business_repository.dart';
import 'package:vidsnap_ai/features/business/domain/business_models.dart';

void main() {
  group('BusinessRepository Unit Tests', () {
    late Dio dio;
    late BusinessRepository repository;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://localhost:8000'));
      repository = BusinessRepository(dio);
    });

    test('getProfile returns parsed BusinessProfileModel', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/business/profile');

        final data = {
          'business_id': 'biz-1',
          'user_id': 'u-brand',
          'company_name': 'Acme Audio',
          'website': 'https://acme.example.com',
          'industry': 'tech',
          'description': 'Premium audio gear',
          'verification_status': 'verified',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final profile = await repository.getProfile();
      expect(profile.businessId, 'biz-1');
      expect(profile.companyName, 'Acme Audio');
      expect(profile.isVerified, isTrue);
    });

    test('updateProfile registers brand advertiser', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/business/profile');
        expect(options.method, 'POST');

        final data = {
          'business_id': 'biz-1',
          'user_id': 'u-brand',
          'company_name': 'Acme Audio',
          'website': 'https://acme.example.com',
          'industry': 'tech',
          'verification_status': 'pending',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final profile = await repository.updateProfile(
        const CreateBusinessProfileInput(
          companyName: 'Acme Audio',
          website: 'https://acme.example.com',
          industry: 'tech',
        ),
      );
      expect(profile.companyName, 'Acme Audio');
    });

    test('listCampaigns returns open sponsorship briefs', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/business/campaigns');
        expect(options.queryParameters['category'], 'tech');

        final data = [
          {
            'campaign_id': 'camp-1',
            'business_id': 'biz-1',
            'company_name': 'Acme Audio',
            'title': 'Wireless Earbuds Review',
            'description': 'Showcase noise-cancellation in noisy environments',
            'category': 'tech',
            'budget_perk': '\$500 + Sample',
            'target_creators_count': 5,
            'applications_count': 3,
            'status': 'active',
          }
        ];

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final list = await repository.listCampaigns(category: 'tech');
      expect(list.length, 1);
      expect(list.first.title, 'Wireless Earbuds Review');
      expect(list.first.budgetPerk, contains('\$500'));
    });

    test('createCampaign publishes campaign brief', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/business/campaigns');
        expect(options.method, 'POST');

        final data = {
          'campaign_id': 'camp-new',
          'business_id': 'biz-1',
          'company_name': 'Acme Audio',
          'title': 'Summer Beats',
          'description': 'Create outdoor music videos',
          'category': 'music',
          'budget_perk': '\$1000',
          'target_creators_count': 10,
          'status': 'active',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final campaign = await repository.createCampaign(
        const CreateCampaignInput(
          title: 'Summer Beats',
          description: 'Create outdoor music videos',
          budgetPerk: '\$1000',
          category: 'music',
        ),
      );
      expect(campaign.campaignId, 'camp-new');
      expect(campaign.title, 'Summer Beats');
    });

    test('applyToCampaign submits creator pitch with brand safety report', () async {
      dio.httpClientAdapter = _MockAdapter((options) {
        expect(options.path, '/api/v1/business/campaigns/camp-1/apply');
        expect(options.method, 'POST');

        final data = {
          'application_id': 'app-101',
          'campaign_id': 'camp-1',
          'creator_name': 'Dev Creator',
          'creator_handle': 'dev_creator',
          'pitch': 'High-retention reel unboxing and battery test',
          'brand_safety': {
            'score': 95,
            'is_brand_safe': true,
            'recommendation': 'Safe to accept',
          },
          'status': 'applied',
        };

        return ResponseBody.fromString(
          jsonEncode(data),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

      final application = await repository.applyToCampaign(
        campaignId: 'camp-1',
        pitch: 'High-retention reel unboxing and battery test',
      );
      expect(application.applicationId, 'app-101');
      expect(application.brandSafetyScore, 95);
      expect(application.isBrandSafe, isTrue);
    });
  });
}

class _MockAdapter implements HttpClientAdapter {
  final ResponseBody Function(RequestOptions options) handler;
  _MockAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}
