import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/network/app_failure.dart';
import 'package:vidsnap_ai/core/network/dio_client.dart';
import 'package:vidsnap_ai/features/discovery/domain/discovery_item_model.dart';

class DiscoveryRepository {
  DiscoveryRepository({required this.dio});

  final Dio dio;

  Future<DiscoverySearchResponseModel> search({
    String? query,
    String? source,
    String? tag,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (query != null && query.trim().isNotEmpty) {
        queryParams['q'] = query.trim();
      }
      if (source != null && source.trim().isNotEmpty && source != 'all') {
        queryParams['source'] = source.trim();
      }
      if (tag != null && tag.trim().isNotEmpty) {
        queryParams['tag'] = tag.trim().replaceAll('#', '');
      }

      final response = await dio.get<Map<String, dynamic>>(
        '/api/v1/discovery/search',
        queryParameters: queryParams,
      );

      final data = response.data ?? <String, dynamic>{};
      return DiscoverySearchResponseModel.fromJson(data);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }

  Future<DiscoveryItemModel> getItem(String itemId) async {
    try {
      final response = await dio.get<Map<String, dynamic>>(
        '/api/v1/discovery/items/$itemId',
      );
      return DiscoveryItemModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw mapDioExceptionToAppFailure(e);
    } catch (e) {
      throw AppFailure.unknown(message: e.toString());
    }
  }
}

final discoveryRepositoryProvider = Provider<DiscoveryRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return DiscoveryRepository(dio: dio);
});
