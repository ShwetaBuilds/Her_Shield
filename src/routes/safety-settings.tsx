import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import {
  ShieldAlert,
  Mic,
  Smartphone,
  Volume2,
  Power,
  Plus,
  X,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadSilent, saveSilent, loadVoice, saveVoice, type SilentTrigger } from "@/lib/safety";
import { sosApi } from "@/lib/api";

export const Route = createFileRoute("/safety-settings")({
  head: () => ({
    meta: [
      { title: "Safety Settings · Her_Shield" },
      {
        name: "description",
        content: "Configure Silent SOS, Emergency Voice Command and trigger preferences.",
      },
    ],
  }),
  component: SafetySettings,
});

function SafetySettings() {
  const [silent, setSilent] = useState(loadSilent());
  const [voice, setVoice] = useState(loadVoice());
  const [newKeyword, setNewKeyword] = useState("");
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [shakeStatus, setShakeStatus] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [savingTest, setSavingTest] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const micTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopMicTest = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (micTimeoutRef.current) clearTimeout(micTimeoutRef.current);
    micTimeoutRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch((error: unknown) => {
        console.error("Could not close microphone test audio context:", error);
      });
    }
    setMicTesting(false);
    setMicLevel(0);
  };

  useEffect(() => saveSilent(silent), [silent]);
  useEffect(() => saveVoice(voice), [voice]);
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (micTimeoutRef.current) clearTimeout(micTimeoutRef.current);
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch((error: unknown) => {
          console.error("Could not close microphone test audio context:", error);
        });
      }
    },
    [],
  );

  // ---- Mic test ----
  const startMicTest = async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setMicError("Microphone level testing is not supported in this browser.");
      return;
    }
    setMicTesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, (avg / 128) * 100));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      micTimeoutRef.current = setTimeout(stopMicTest, 6000);
    } catch {
      stopMicTest();
      setMicError("Microphone access was denied or the test could not start.");
    }
  };

  // ---- Shake test ----
  const testShake = () => {
    if (!("DeviceMotionEvent" in window)) {
      setShakeStatus("Motion sensor testing is not supported in this browser.");
      return;
    }
    setShakeStatus("Listening for shake… move your device for 5 seconds");
    let count = 0;
    let last = { x: 0, y: 0, z: 0, t: 0 };
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const now = Date.now();
      if (now - last.t > 100) {
        const dx = (a.x || 0) - last.x;
        const dy = (a.y || 0) - last.y;
        const dz = (a.z || 0) - last.z;
        const speed = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (speed > 18 - silent.sensitivity) count++;
        last = { x: a.x || 0, y: a.y || 0, z: a.z || 0, t: now };
      }
    };
    window.addEventListener("devicemotion", handler);
    setTimeout(() => {
      window.removeEventListener("devicemotion", handler);
      setShakeStatus(
        count > 3
          ? `Shake detected ${count} times. Motion input is available; no SOS was sent.`
          : "No strong shake detected. Try increasing sensitivity.",
      );
      setTimeout(() => setShakeStatus(null), 5000);
    }, 5000);
  };

  // ---- Simulate silent trigger ----
  const simulate = async () => {
    if (savingTest) return;
    setSavingTest(true);
    setActionMessage(null);
    try {
      await sosApi.create({ notes: "User-initiated SOS test from Safety Settings" });
      setActionMessage("Test SOS record saved to your account. Notification status updated.");
    } catch {
      setActionMessage("Could not save the test SOS record. Check your connection.");
    } finally {
      setSavingTest(false);
    }
  };

  const addKeyword = () => {
    const k = newKeyword.trim().toLowerCase();
    setKeywordError(null);
    if (!k) {
      setKeywordError("Enter a keyword first.");
      return;
    }
    if (k.length > 80) {
      setKeywordError("Keywords must be 80 characters or fewer.");
      return;
    }
    if (voice.keywords.some((keyword) => keyword.toLowerCase() === k)) {
      setKeywordError("That keyword is already configured.");
      return;
    }
    if (voice.keywords.length >= 20) {
      setKeywordError("You can configure up to 20 keywords.");
      return;
    }
    setVoice({ ...voice, keywords: [...voice.keywords, k] });
    setNewKeyword("");
  };

  const removeKeyword = (k: string) => {
    setKeywordError(null);
    setVoice({ ...voice, keywords: voice.keywords.filter((x) => x !== k) });
  };

  const triggerOptions: {
    id: SilentTrigger;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    available: boolean;
  }[] = [
    {
      id: "shake",
      label: "Phone Motion Test",
      icon: Smartphone,
      desc: "Foreground motion-event test only; it does not automatically create an SOS record.",
      available: true,
    },
    {
      id: "volume",
      label: "Volume Pattern",
      icon: Volume2,
      desc: "Not supported by web browsers.",
      available: false,
    },
    {
      id: "power",
      label: "Power Pattern",
      icon: Power,
      desc: "Not supported by web browsers.",
      available: false,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Safety Settings"
        subtitle="Configure on-device preferences and test browser microphone or motion access."
        icon={ShieldAlert}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ============ Silent SOS ============ */}
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                Local test only
              </div>
              <h2 className="text-2xl font-bold mt-1">Device Motion Test</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure local motion preferences and test them while this page is open.
              </p>
            </div>
            <Toggle
              label="Enable local silent-trigger test preferences"
              on={silent.enabled}
              onChange={(v) => setSilent({ ...silent, enabled: v })}
            />
          </div>

          <div className="mt-6 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Trigger method
            </div>
            {triggerOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSilent({ ...silent, trigger: o.id })}
                disabled={!silent.enabled || !o.available}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                  silent.trigger === o.id
                    ? "bg-gradient-primary text-white border-transparent shadow-soft"
                    : "bg-white/70 border-border hover:bg-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${silent.trigger === o.id ? "bg-white/20" : "bg-gradient-primary"}`}
                >
                  <o.icon
                    className={`w-5 h-5 ${silent.trigger === o.id ? "text-white" : "text-white"}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{o.label}</div>
                  <div
                    className={`text-xs ${silent.trigger === o.id ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    {o.desc}
                  </div>
                </div>
                {silent.trigger === o.id && <CheckCircle2 className="w-5 h-5" />}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
              <span>Sensitivity</span>
              <span className="text-primary">{silent.sensitivity}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={silent.sensitivity}
              disabled={!silent.enabled}
              onChange={(e) => setSilent({ ...silent, sensitivity: Number(e.target.value) })}
              className="w-full mt-2 accent-pink-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Less sensitive</span>
              <span>More sensitive</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={testShake}
              disabled={!silent.enabled || silent.trigger !== "shake"}
              className="py-3 rounded-xl bg-white/80 border border-border font-semibold text-sm disabled:opacity-50"
            >
              Test motion detection
            </button>
            <button
              type="button"
              onClick={() => void simulate()}
              disabled={!silent.enabled || savingTest}
              className="py-3 rounded-xl bg-gradient-primary text-white font-semibold text-sm shadow-soft disabled:opacity-50"
            >
              {savingTest ? "Saving test…" : "Save Test SOS"}
            </button>
          </div>
          {actionMessage && (
            <div
              role="status"
              className="mt-3 text-xs p-3 rounded-xl bg-white/70 border border-border"
            >
              {actionMessage}
            </div>
          )}
          {shakeStatus && (
            <div className="mt-3 text-xs p-3 rounded-xl bg-white/70 border border-border">
              {shakeStatus}
            </div>
          )}
        </div>

        {/* ============ Voice Command ============ */}
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                Hands-free
              </div>
              <h2 className="text-2xl font-bold mt-1">Voice SOS Activation Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure trigger phrases here, then press Start on the Voice SOS Activation page.
              </p>
            </div>
            <Toggle
              label="Enable local voice keyword test"
              on={voice.enabled}
              onChange={(v) => setVoice({ ...voice, enabled: v })}
            />
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Trigger phrases
            </div>
            <div className="flex flex-wrap gap-2">
              {voice.keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-primary text-white text-xs font-semibold shadow-soft"
                >
                  "{k}"
                  <button
                    type="button"
                    onClick={() => removeKeyword(k)}
                    disabled={!voice.enabled}
                    className="hover:bg-white/20 rounded-full p-0.5 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                disabled={!voice.enabled}
                maxLength={80}
                placeholder="Add custom keyword e.g. 'rescue me'"
                className="flex-1 px-4 py-3 rounded-xl bg-white/80 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={!voice.enabled}
                className="px-4 rounded-xl bg-gradient-primary text-white font-semibold text-sm shadow-soft disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {keywordError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {keywordError}
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Test microphone
            </div>
            <button
              type="button"
              onClick={micTesting ? stopMicTest : () => void startMicTest()}
              className="w-full py-3 rounded-xl bg-white/80 border border-border font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Mic className="w-4 h-4" />{" "}
              {micTesting ? "Stop microphone test" : "Start microphone test"}
            </button>
            {micError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {micError}
              </p>
            )}
            {micTesting && (
              <div className="mt-3">
                <div className="h-3 rounded-full bg-white/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-primary transition-all"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3" /> Mic level — {Math.round(micLevel)}%
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            Voice detection requires an open page and microphone permission. A recognized phrase
            records an SOS alert; this setting does not record or upload audio.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      type="button"
      className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${on ? "bg-gradient-primary" : "bg-muted"}`}
      aria-pressed={on}
      aria-label={label}
    >
      <span
        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`}
      />
    </button>
  );
}
