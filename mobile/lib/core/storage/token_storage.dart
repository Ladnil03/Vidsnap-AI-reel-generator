import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(resetOnError: true),
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock,
            ),
          );

  final FlutterSecureStorage _storage;

  static const String _keyAccessToken = 'vidsnap_access_token';
  static const String _keyRefreshToken = 'vidsnap_refresh_token';

  String? _inMemoryAccessToken;
  String? _inMemoryRefreshToken;

  Future<void> initialize() async {
    _inMemoryAccessToken = await _storage.read(key: _keyAccessToken);
    _inMemoryRefreshToken = await _storage.read(key: _keyRefreshToken);
  }

  Future<String?> getAccessToken() async {
    if (_inMemoryAccessToken != null) return _inMemoryAccessToken;
    _inMemoryAccessToken = await _storage.read(key: _keyAccessToken);
    return _inMemoryAccessToken;
  }

  Future<String?> getRefreshToken() async {
    if (_inMemoryRefreshToken != null) return _inMemoryRefreshToken;
    _inMemoryRefreshToken = await _storage.read(key: _keyRefreshToken);
    return _inMemoryRefreshToken;
  }

  Future<void> setTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _inMemoryAccessToken = accessToken;
    _inMemoryRefreshToken = refreshToken;
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  Future<void> setAccessToken(String accessToken) async {
    _inMemoryAccessToken = accessToken;
    await _storage.write(key: _keyAccessToken, value: accessToken);
  }

  Future<void> clearTokens() async {
    _inMemoryAccessToken = null;
    _inMemoryRefreshToken = null;
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
  }

  Future<bool> hasValidToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage();
});
