export const WEB_WIDGET_SUGGESTION_COUNT = 3;

export type WebWidgetSuggestions = [string, string, string];

export const EMPTY_WEB_WIDGET_SUGGESTIONS: WebWidgetSuggestions = ["", "", ""];

export function normalizeWebWidgetSuggestions(
  values: readonly string[] | undefined,
): WebWidgetSuggestions {
  const suggestions = values ?? EMPTY_WEB_WIDGET_SUGGESTIONS;
  if (suggestions.length !== WEB_WIDGET_SUGGESTION_COUNT) {
    throw new Error("Widget suggestions must contain exactly three items");
  }
  return suggestions.map((value) => {
    const suggestion = value.trim();
    if (suggestion.length > 80) {
      throw new Error("Widget suggestions must be 80 characters or fewer");
    }
    return suggestion;
  }) as WebWidgetSuggestions;
}

export function getVisibleWebWidgetSuggestions(
  suggestions: readonly string[],
  enabled: boolean,
  messageCount: number,
) {
  return enabled && messageCount === 0
    ? suggestions.filter((suggestion) => suggestion.length > 0)
    : [];
}

export function resolveWebWidgetSuggestionsEnabled(
  enabled: boolean | undefined,
  suggestions: readonly string[] | undefined,
) {
  return enabled ?? normalizeWebWidgetSuggestions(suggestions).some(Boolean);
}
