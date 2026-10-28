import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { PhoneCall, Phone, PhoneOff, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/fake-call")({
  component: FakeCall,
});

function FakeCall() {
  const [name, setName] = useState("Mom");
  const [delay, setDelay] = useState("5");
  const [calling, setCalling] = useState(false);
  const [connected, setConnected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const validCaller = name.trim().length > 0 && name.trim().length <= 80;
  const delaySeconds = Number(delay);
  const validDelay = Number.isInteger(delaySeconds) && delaySeconds >= 1 && delaySeconds <= 120;

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCalling(true);
      setConnected(false);
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const schedule = () => {
    if (!validCaller || !validDelay) return;
    setConnected(false);
    setCountdown(delaySeconds);
  };
  const callNow = () => {
    if (!validCaller) return;
    setCountdown(null);
    setConnected(false);
    setCalling(true);
  };

  if (calling) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-between py-16 px-6 text-white">
        <div className="text-center mt-12">
          <div className="text-sm opacity-70 uppercase tracking-widest">
            {connected ? "Simulated call" : "Incoming call"}
          </div>
          <div className="text-xs opacity-60">SIMULATION · NO PHONE CALL</div>
          <div className="w-32 h-32 mx-auto mt-8 rounded-full bg-gradient-primary flex items-center justify-center text-5xl font-bold shadow-glow">
            {name.charAt(0)}
          </div>
          <div className="text-3xl font-bold mt-6">{name}</div>
          <div className="text-sm opacity-70 mt-1">Simulated caller ID</div>
        </div>
        {connected ? (
          <button
            onClick={() => {
              setCalling(false);
              setConnected(false);
            }}
            aria-label="End simulated call"
            className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-2xl hover:scale-105 transition"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        ) : (
          <div className="flex items-center gap-16">
            <button
              onClick={() => setCalling(false)}
              aria-label="Decline simulated call"
              className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center shadow-2xl hover:scale-105 transition"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={() => setConnected(true)}
              aria-label="Answer simulated call"
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl hover:scale-105 transition"
            >
              <Phone className="w-7 h-7" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Fake Call Simulation"
        subtitle="Practice with a scheduled visual caller simulation."
        icon={PhoneCall}
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-strong rounded-3xl p-8 space-y-5">
          <div>
            <label className="text-xs font-semibold text-foreground/70">Caller Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              maxLength={80}
              required
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/70 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground/70">Delay (seconds)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/70 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["Mom", "Dad", "Boss", "Husband", "Police", "Doctor"].map((preset) => (
              <button
                key={preset}
                onClick={() => setName(preset)}
                className={`py-2 rounded-xl text-xs font-semibold ${name === preset ? "bg-gradient-primary text-white" : "bg-white/70 border border-border"}`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={schedule}
              disabled={!validCaller || !validDelay}
              className="flex-1 py-3 rounded-xl bg-white/70 border border-border font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />{" "}
              {countdown === null ? "Schedule simulation" : "Reschedule simulation"}
            </button>
            <button
              onClick={callNow}
              disabled={!validCaller}
              className="flex-1 py-3 rounded-xl bg-gradient-primary text-white font-semibold shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Phone className="w-4 h-4" /> Start simulation
            </button>
          </div>

          {countdown !== null && (
            <div
              role="status"
              className="text-center p-4 rounded-2xl bg-primary/10 text-primary font-bold"
            >
              Calling simulation in {countdown}s…
              <button type="button" onClick={() => setCountdown(null)} className="ml-3 underline">
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="glass rounded-3xl p-8">
          <h3 className="font-bold text-lg">How it helps</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              "Escape uncomfortable conversations gracefully",
              "Discreetly leave a sketchy situation",
              "Realistic incoming call screen",
              "Choose any caller name & schedule timing",
            ].map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
