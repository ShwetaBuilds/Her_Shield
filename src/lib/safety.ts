// Shared helpers + storage keys for the new safety features.
export type SilentTrigger = "shake" | "volume" | "power";

export type SilentSettings = {
  enabled: boolean;
  trigger: SilentTrigger;
  sensitivity: number; // 1-10
};

export type VoiceSettings = {
  enabled: boolean;
  keywords: string[];
  cooldownSeconds: number;
};

const SILENT_KEY = "hs_silent_settings";
const VOICE_KEY = "hs_voice_settings";

export const DEFAULT_SILENT: SilentSettings = {
  enabled: false,
  trigger: "shake",
  sensitivity: 6,
};

export const DEFAULT_VOICE: VoiceSettings = {
  enabled: false,
  keywords: ["help me", "save me", "emergency", "call police", "i am in danger"],
  cooldownSeconds: 60,
};

export function loadSilent(): SilentSettings {
  if (typeof window === "undefined") return DEFAULT_SILENT;
  try {
    const raw = localStorage.getItem(SILENT_KEY);
    if (!raw) return DEFAULT_SILENT;
    return { ...DEFAULT_SILENT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SILENT;
  }
}

export function saveSilent(s: SilentSettings) {
  localStorage.setItem(SILENT_KEY, JSON.stringify(s));
}

export function loadVoice(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_VOICE;
  try {
    const raw = localStorage.getItem(VOICE_KEY);
    if (!raw) return DEFAULT_VOICE;
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    const cooldownSeconds = parsed.cooldownSeconds;
    return {
      ...DEFAULT_VOICE,
      ...parsed,
      cooldownSeconds:
        typeof cooldownSeconds === "number" &&
        Number.isInteger(cooldownSeconds) &&
        cooldownSeconds >= 30 &&
        cooldownSeconds <= 600
          ? cooldownSeconds
          : DEFAULT_VOICE.cooldownSeconds,
    };
  } catch {
    return DEFAULT_VOICE;
  }
}

export function saveVoice(v: VoiceSettings) {
  localStorage.setItem(VOICE_KEY, JSON.stringify(v));
}
