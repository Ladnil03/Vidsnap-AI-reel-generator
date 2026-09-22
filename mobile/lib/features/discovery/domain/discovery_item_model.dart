class DiscoveryItemModel {
  final String itemId;
  final String source;
  final String externalId;
  final String title;
  final String description;
  final String authorName;
  final String? authorUrl;
  final String sourceUrl;
  final String embedUrl;
  final String? thumbnailUrl;
  final double duration;
  final List<String> tags;
  final String attributionText;
  final int viewsCount;
  final int likesCount;
  final DateTime createdAt;

  const DiscoveryItemModel({
    required this.itemId,
    required this.source,
    required this.externalId,
    required this.title,
    required this.description,
    required this.authorName,
    this.authorUrl,
    required this.sourceUrl,
    required this.embedUrl,
    this.thumbnailUrl,
    this.duration = 0.0,
    this.tags = const <String>[],
    this.attributionText = '',
    this.viewsCount = 0,
    this.likesCount = 0,
    required this.createdAt,
  });

  factory DiscoveryItemModel.fromJson(Map<String, dynamic> json) {
    return DiscoveryItemModel(
      itemId: (json['item_id'] ?? json['id'] ?? '').toString(),
      source: (json['source'] ?? 'community').toString(),
      externalId: (json['external_id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      authorName: (json['author_name'] ?? 'Creator').toString(),
      authorUrl: json['author_url']?.toString(),
      sourceUrl: (json['source_url'] ?? '').toString(),
      embedUrl: (json['embed_url'] ?? '').toString(),
      thumbnailUrl: json['thumbnail_url']?.toString(),
      duration: ((json['duration'] ?? 0.0) as num).toDouble(),
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          const <String>[],
      attributionText: (json['attribution_text'] ?? '').toString(),
      viewsCount: (json['views_count'] as num?)?.toInt() ?? 0,
      likesCount: (json['likes_count'] as num?)?.toInt() ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'item_id': itemId,
      'source': source,
      'external_id': externalId,
      'title': title,
      'description': description,
      'author_name': authorName,
      'author_url': authorUrl,
      'source_url': sourceUrl,
      'embed_url': embedUrl,
      'thumbnail_url': thumbnailUrl,
      'duration': duration,
      'tags': tags,
      'attribution_text': attributionText,
      'views_count': viewsCount,
      'likes_count': likesCount,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class DiscoverySearchResponseModel {
  final List<DiscoveryItemModel> items;
  final int total;
  final int page;
  final int limit;
  final bool hasMore;

  const DiscoverySearchResponseModel({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory DiscoverySearchResponseModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const <dynamic>[];
    final items = rawItems
        .map((e) => DiscoveryItemModel.fromJson(e as Map<String, dynamic>))
        .toList();
    final total = (json['total'] as num?)?.toInt() ?? items.length;
    final page = (json['page'] as num?)?.toInt() ?? 1;
    final limit = (json['limit'] as num?)?.toInt() ?? 20;
    final hasMore = json['has_more'] == true || (total > page * limit);

    return DiscoverySearchResponseModel(
      items: items,
      total: total,
      page: page,
      limit: limit,
      hasMore: hasMore,
    );
  }
}
