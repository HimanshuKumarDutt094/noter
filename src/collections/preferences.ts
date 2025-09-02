export const DEFAULT_PREFERENCES_ID = "local" as const;
import { z } from "zod";
import { nowIso } from "../lib/time";

export const PreferencesSchema = z.object({
  id: z.literal(DEFAULT_PREFERENCES_ID),
  version: z.number(),
  favoriteTagIds: z.array(z.string()),
  tagOrder: z.array(z.string()),
  ui: z.object({
    expandedTags: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export const PREFERENCES_VERSION = 1 as const;

export function createDefaultPreferences(): Preferences {
  const now = nowIso();
  return {
    id: DEFAULT_PREFERENCES_ID,
    version: PREFERENCES_VERSION,
    favoriteTagIds: [],
    tagOrder: [],
    ui: { expandedTags: false },
    createdAt: now,
    updatedAt: now,
  };
}
