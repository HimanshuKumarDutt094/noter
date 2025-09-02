import { useEffect, useCallback } from "react";
import { basePreferencesCollection } from "@/lib/db";
import {
  DEFAULT_PREFERENCES_ID,
  type Preferences,
  createDefaultPreferences,
} from "@/collections/preferences";
import { nowIso } from "@/lib/time";
import { useLiveQuery } from "@tanstack/react-db";
import { preferencesCollection } from "@/lib/db";

export function usePreferences() {
  // Live query for preferences (single-row collection)
  const { data = [], isLoading } = useLiveQuery(preferencesCollection);

  const prefs: Preferences | null = data[0] ?? null;

  // Ensure a default preferences row exists once data is loaded
  useEffect(() => {
    if (isLoading) return;
    if (!prefs) {
      (async () => {
        try {
          const def = createDefaultPreferences();
          await basePreferencesCollection.insert(def);
        } catch (e: unknown) {
          // Swallow insert races; another tab/render may have inserted
          console.warn(
            "Failed to insert default preferences (possibly exists)",
            e
          );
        }
      })();
    }
  }, [isLoading, prefs]);

  const updatePrefs = useCallback(
    async (updater: (draft: Preferences) => void) => {
      // If prefs is still null (e.g., initial mount), create defaults and then apply update
      const current =
        prefs ??
        (await basePreferencesCollection.get(DEFAULT_PREFERENCES_ID)) ??
        createDefaultPreferences();

      const updated: Preferences = { ...current };
      updater(updated);
      updated.updatedAt = nowIso();

      // Upsert semantics: update if exists, otherwise insert
      const exists = !!(
        prefs || (await basePreferencesCollection.get(updated.id))
      );
      if (exists) {
        await basePreferencesCollection.update(updated.id, (draft) => {
          Object.assign(draft, updated);
        });
      } else {
        await basePreferencesCollection.insert(updated);
      }
    },
    [prefs]
  );

  return { prefs, updatePrefs, isLoading } as const;
}
