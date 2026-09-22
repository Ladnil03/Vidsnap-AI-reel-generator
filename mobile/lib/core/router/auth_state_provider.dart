import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';

enum AuthStatus {
  unknown,
  authenticated,
  unauthenticated,
}

class AuthStateNotifier extends ChangeNotifier {
  AuthStateNotifier(this._tokenStorage) {
    _init();
  }

  final TokenStorage _tokenStorage;
  AuthStatus _status = AuthStatus.unknown;

  AuthStatus get status => _status;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isUnknown => _status == AuthStatus.unknown;

  Future<void> _init() async {
    final hasToken = await _tokenStorage.hasValidToken();
    _status = hasToken ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<void> setAuthenticated({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _tokenStorage.setTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> setUnauthenticated() async {
    await _tokenStorage.clearTokens();
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}

final authStateProvider = Provider<AuthStateNotifier>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  return AuthStateNotifier(tokenStorage);
});
