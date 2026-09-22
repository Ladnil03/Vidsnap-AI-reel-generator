import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vidsnap_ai/features/companion/data/companion_repository.dart';
import 'package:vidsnap_ai/features/companion/domain/companion_models.dart';

@immutable
class CompanionState {
  const CompanionState({
    this.messages = const <CompanionMessageModel>[],
    this.isLoading = false,
    this.isSending = false,
    this.activeMood,
    this.suggestedActions = const <String>[
      'Show trending reels',
      'Give me something relaxing',
      'Boost my mood',
    ],
    this.errorMessage,
  });

  final List<CompanionMessageModel> messages;
  final bool isLoading;
  final bool isSending;
  final MoodType? activeMood;
  final List<String> suggestedActions;
  final String? errorMessage;

  CompanionState copyWith({
    List<CompanionMessageModel>? messages,
    bool? isLoading,
    bool? isSending,
    MoodType? activeMood,
    List<String>? suggestedActions,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CompanionState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
      activeMood: activeMood ?? this.activeMood,
      suggestedActions: suggestedActions ?? this.suggestedActions,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

final companionNotifierProvider =
    NotifierProvider<CompanionNotifier, CompanionState>(CompanionNotifier.new);

class CompanionNotifier extends Notifier<CompanionState> {
  CompanionRepository get _repo => ref.read(companionRepositoryProvider);

  @override
  CompanionState build() {
    // Initial fetch of history and mood in background
    Future.microtask(_init);
    return const CompanionState(isLoading: true);
  }

  Future<void> _init() async {
    try {
      final moodFuture = _repo.getActiveMood();
      final historyFuture = _repo.getHistory();

      final results = await Future.wait([moodFuture, historyFuture]);
      final activeMood = (results[0] as MoodStateModel?)?.mood;
      final history = results[1] as List<CompanionMessageModel>;

      state = state.copyWith(
        messages: history,
        activeMood: activeMood ?? MoodType.chill,
        isLoading: false,
      );
    } catch (_) {
      // In case of initial offline/error, finish loading state gracefully
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> selectMood(MoodType mood) async {
    final previousMood = state.activeMood;
    state = state.copyWith(activeMood: mood);
    try {
      await _repo.setMood(mood: mood);
    } catch (e) {
      state = state.copyWith(activeMood: previousMood, errorMessage: 'Failed to update mood');
    }
  }

  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.isSending) return;

    final userMessage = CompanionMessageModel(
      messageId: 'usr_${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: trimmed,
      timestamp: DateTime.now(),
    );

    state = state.copyWith(
      messages: <CompanionMessageModel>[...state.messages, userMessage],
      isSending: true,
      clearError: true,
    );

    try {
      final response = await _repo.chat(
        message: trimmed,
        mood: state.activeMood,
      );

      final updatedActions = response.suggestedActions.isNotEmpty
          ? response.suggestedActions
          : state.suggestedActions;

      state = state.copyWith(
        messages: <CompanionMessageModel>[...state.messages, response.message],
        suggestedActions: updatedActions,
        activeMood: response.activeMood ?? state.activeMood,
        isSending: false,
      );
    } catch (e) {
      state = state.copyWith(
        isSending: false,
        errorMessage: 'Failed to get response. Please check connection.',
      );
    }
  }

  Future<void> clearHistory() async {
    try {
      await _repo.clearHistory();
      state = state.copyWith(
        messages: const <CompanionMessageModel>[],
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Failed to clear chat history');
    }
  }
}
