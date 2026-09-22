import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/core/storage/token_storage.dart';
import 'package:vidsnap_ai/features/auth/data/auth_repository.dart';
import 'package:vidsnap_ai/features/auth/domain/auth_requests.dart';
import 'package:vidsnap_ai/features/auth/domain/user_model.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthStateNotifier extends ChangeNotifier {
  AuthStateNotifier({
    required this.tokenStorage,
    required this.authRepository,
  }) {
    restoreSession();
  }

  final TokenStorage tokenStorage;
  final AuthRepository authRepository;

  AuthStatus _status = AuthStatus.unknown;
  User? _currentUser;
  bool _isLoading = false;

  AuthStatus get status => _status;
  User? get currentUser => _currentUser;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isUnknown => _status == AuthStatus.unknown;
  bool get isLoading => _isLoading;

  Future<void> restoreSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final hasToken = await tokenStorage.hasValidToken();
      if (!hasToken) {
        _status = AuthStatus.unauthenticated;
        _currentUser = null;
        return;
      }

      final user = await authRepository.getMe();
      _currentUser = user;
      _status = AuthStatus.authenticated;
    } catch (_) {
      await tokenStorage.clearTokens();
      _currentUser = null;
      _status = AuthStatus.unauthenticated;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await authRepository.login(
        LoginRequest(email: email, password: password),
      );
      _currentUser = response.user;
      _status = AuthStatus.authenticated;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<User> signup(String name, String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await authRepository.signup(
        SignupRequest(name: name, email: email, password: password),
      );
      _currentUser = response.user;
      _status = AuthStatus.authenticated;
      return response.user;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verifyEmail(String email, String otp) async {
    _isLoading = true;
    notifyListeners();

    try {
      await authRepository.verifyEmail(
        VerifyEmailRequest(email: email, otp: otp),
      );
      if (_status == AuthStatus.authenticated) {
        final user = await authRepository.getMe();
        _currentUser = user;
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await authRepository.logout();
    } finally {
      _currentUser = null;
      _status = AuthStatus.unauthenticated;
      _isLoading = false;
      notifyListeners();
    }
  }

  void setManualSession({required User user}) {
    _currentUser = user;
    _status = AuthStatus.authenticated;
    notifyListeners();
  }
}

final authStateProvider = Provider<AuthStateNotifier>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthStateNotifier(
    tokenStorage: tokenStorage,
    authRepository: authRepository,
  );
});
