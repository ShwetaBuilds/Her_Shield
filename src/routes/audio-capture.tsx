import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { AudioLines, Download, Circle, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/audio-capture")({
  component: AudioCapture,
});

type AudioRecording = {
  id: string;
  url: string;
  duration: number;
  createdAt: Date;
  fileName: string;
};

function AudioCapture() {
  const [recording, setRecording] = useState(false);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [deleteRecordingId, setDeleteRecordingId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const recordingsRef = useRef<AudioRecording[]>([]);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recordingsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [recording]);

  const start = async () => {
    if (startingRef.current || recording) return;
    setError(null);
    setDuration(0);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!mountedRef.current) return;

        const recordingDuration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        setDuration(recordingDuration);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) {
          setError("No audio was captured. Check the microphone and try again.");
          setRecording(false);
          return;
        }

        const createdAt = new Date();
        const extension = blob.type.includes("ogg")
          ? "ogg"
          : blob.type.includes("mp4")
            ? "m4a"
            : "webm";
        const item: AudioRecording = {
          id: crypto.randomUUID(),
          url: URL.createObjectURL(blob),
          duration: recordingDuration,
          createdAt,
          fileName: `her-shield-recording-${createdAt.toISOString().replace(/[:.]/g, "-")}.${extension}`,
        };
        setRecordings((current) => {
          const next = [...current, item];
          recordingsRef.current = next;
          return next;
        });
        setRecording(false);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (mountedRef.current) {
          setError("Audio recording failed. Check microphone access and try again.");
          setRecording(false);
        }
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch (caughtError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(
        caughtError instanceof DOMException && caughtError.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access in browser settings and try again."
          : "Microphone access was denied or recording could not start.",
      );
    } finally {
      startingRef.current = false;
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const confirmDelete = () => {
    if (!deleteRecordingId) return;
    const target = recordingsRef.current.find((item) => item.id === deleteRecordingId);
    if (!target) {
      setDeleteRecordingId(null);
      return;
    }

    URL.revokeObjectURL(target.url);
    setRecordings((current) => {
      const next = current.filter((item) => item.id !== deleteRecordingId);
      recordingsRef.current = next;
      return next;
    });
    setDeleteRecordingId(null);
  };

  const recordingPendingDelete = recordings.find((item) => item.id === deleteRecordingId);

  return (
    <AppLayout>
      <PageHeader
        title="Audio Capture"
        subtitle="Start a manual browser recording only when you choose. No audio is uploaded to the server."
        icon={AudioLines}
      />

      <div className="glass-strong mb-6 flex items-center gap-4 rounded-3xl p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Circle
            className={`h-5 w-5 ${recording ? "animate-pulse fill-rose-500 text-rose-500" : "text-muted-foreground"}`}
          />
        </div>
        <div className="flex-1">
          <div className="font-bold">
            Manual recording:{" "}
            <span className={recording ? "text-rose-600" : "text-muted-foreground"}>
              {recording ? "ACTIVE" : "OFF"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {recording ? `Recording · ${duration}s` : "Recordings stay in this browser session."}
          </div>
        </div>
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={startingRef.current}
          className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {recording ? <Square className="h-4 w-4" /> : <AudioLines className="h-4 w-4" />}
          {recording ? "Stop" : "Start recording"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <section className="space-y-4" aria-labelledby="recordings-heading">
        <h2 id="recordings-heading" className="font-bold">
          Recordings
        </h2>
        {recordings.length === 0 ? (
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">
              No recordings in this page session. Grant microphone permission only if you want to
              record.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {recordings.map((item) => (
              <li key={item.id} className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Recorded in this browser · {item.duration}s ·{" "}
                      {item.createdAt.toLocaleString()} · not uploaded or stored in your account.
                    </div>
                    <audio
                      controls
                      src={item.url}
                      className="w-full"
                      aria-label={`Playback for recording from ${item.createdAt.toLocaleString()}`}
                    />
                    <a
                      href={item.url}
                      download={item.fileName}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm font-semibold"
                    >
                      <Download className="h-4 w-4" /> Download recording
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteRecordingId(item.id)}
                    aria-label={`Delete recording from ${item.createdAt.toLocaleString()}`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-destructive/30 bg-white/70 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Download recordings you want to keep before closing the page.
      </p>

      {recordingPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-recording-title"
            className="glass-strong w-full max-w-sm rounded-2xl p-6"
          >
            <h2 id="delete-recording-title" className="text-lg font-bold">
              Are you sure you want to delete this recording?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This removes only the selected recording from this page session.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteRecordingId(null)}
                className="flex-1 rounded-xl border border-border bg-white/70 py-2.5 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-destructive py-2.5 font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
