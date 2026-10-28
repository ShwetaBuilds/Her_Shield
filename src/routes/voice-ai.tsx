import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Circle, Mic, Play, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { contactApi, type EmergencyContact } from "@/lib/api";
import { orderTrustedContacts } from "@/lib/sos";

export const Route = createFileRoute("/voice-ai")({
  head: () => ({
    meta: [
      { title: "Voice SOS Activation · Her_Shield" },
      {
        name: "description",
        content: "Record and preview a voice SOS message in your browser.",
      },
    ],
  }),
  component: VoiceAI,
});

type RecordingState = "idle" | "requesting" | "recording" | "stopping" | "ready" | "error";

const recordingScript =
  "Help! I need emergency assistance. Please check my location and contact the appropriate emergency services.";

const supportedAudioTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getRecordingExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

function VoiceAI() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [submittedContactName, setSubmittedContactName] = useState("");
  const [submittedRecordingName, setSubmittedRecordingName] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startingRef = useRef(false);
  const submittingRef = useRef(false);
  const failedRef = useRef(false);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trustedContacts = orderTrustedContacts(contacts);
  const selectedContact = trustedContacts.find((contact) => contact._id === selectedContactId);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;
    contactApi
      .get()
      .then(({ data }) => {
        if (cancelled) return;
        const ordered = orderTrustedContacts(data);
        setContacts(ordered);
        if (ordered[0]) setSelectedContactId(ordered[0]._id);
      })
      .catch(() => {
        if (!cancelled) {
          setContactsError(
            "Could not load trusted contacts. Try again or add a contact in Trust Circle.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recordingUrl) return;
    return () => URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  useEffect(() => {
    if (recordingState !== "recording") return;
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [recordingState]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (startingRef.current || recordingState === "recording" || recordingState === "stopping") {
      return;
    }

    setRecordingError(null);
    setRecordingFile(null);
    setRecordingUrl(null);
    setRecordingSeconds(0);
    setShowPopup(false);
    failedRef.current = false;

    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordingState("error");
      setRecordingError(
        "Audio recording requires a supported browser, microphone access, and a secure connection.",
      );
      return;
    }

    startingRef.current = true;
    setRecordingState("requesting");
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = supportedAudioTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        failedRef.current = true;
        recorderRef.current = null;
        stopStream();
        if (mountedRef.current) {
          setRecordingState("error");
          setRecordingError(
            "The browser could not record audio. Check microphone access and try again.",
          );
        }
      };
      recorder.onstop = () => {
        recorderRef.current = null;
        stopStream();
        if (!mountedRef.current || failedRef.current) return;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) {
          setRecordingState("error");
          setRecordingError("No audio was captured. Check the microphone and record again.");
          return;
        }

        const extension = getRecordingExtension(blob.type);
        const file = new File([blob], `her-shield-voice-sos.${extension}`, {
          type: blob.type,
          lastModified: Date.now(),
        });
        setRecordingFile(file);
        setRecordingUrl(URL.createObjectURL(file));
        setRecordingSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        setRecordingState("ready");
      };

      stream.getAudioTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (recorderRef.current !== recorder || recorder.state !== "recording") return;
          failedRef.current = true;
          setRecordingState("error");
          setRecordingError(
            "Microphone input stopped unexpectedly. Check the microphone and record again.",
          );
          recorder.stop();
        });
      });

      recorder.start();
      setRecordingState("recording");
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      const errorName = error instanceof DOMException ? error.name : "";
      setRecordingState("error");
      setRecordingError(
        errorName === "NotAllowedError" || errorName === "SecurityError"
          ? "Microphone permission was denied. Allow microphone access in browser settings, then try again."
          : errorName === "NotFoundError" || errorName === "DevicesNotFoundError"
            ? "No microphone was found. Connect a microphone and try again."
            : errorName === "NotReadableError" || errorName === "TrackStartError"
              ? "The microphone is unavailable or being used by another app."
              : "Could not start audio recording. Check microphone access and try again.",
      );
    } finally {
      startingRef.current = false;
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    setRecordingState("stopping");
    try {
      recorder.stop();
    } catch {
      failedRef.current = true;
      recorderRef.current = null;
      stopStream();
      setRecordingState("error");
      setRecordingError("Could not finish the recording. Try again.");
    }
  };

  const submitRecording = () => {
    if (submittingRef.current || !recordingFile || recordingFile.size === 0) return;
    if (!selectedContact) {
      setRecordingError("Add or select a trusted contact before submitting this recording.");
      return;
    }

    submittingRef.current = true;
    setSubmittedContactName(selectedContact.name);
    setSubmittedRecordingName(recordingFile.name);
    setShowPopup(true);
    submittingRef.current = false;
  };

  const recordingStatus =
    recordingState === "requesting"
      ? "Requesting microphone permission"
      : recordingState === "recording"
        ? "Recording"
        : recordingState === "stopping"
          ? "Preparing recording"
          : recordingState === "ready"
            ? "Recording ready"
            : recordingState === "error"
              ? "Error"
              : "Idle";

  return (
    <AppLayout>
      <PageHeader
        title="Voice SOS Activation"
        subtitle="Record a voice message, review it, and view the submission status."
        icon={Mic}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-strong relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-3xl p-8 text-center sm:p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
          <div className="relative">
            <div
              className={`absolute -inset-12 rounded-full bg-primary/20 blur-3xl ${
                recordingState === "recording" ? "animate-pulse" : ""
              }`}
            />
            <div className="relative mb-5 flex items-center justify-center gap-2 text-sm font-semibold">
              <Circle
                className={`h-3 w-3 ${
                  recordingState === "recording"
                    ? "animate-pulse fill-rose-500 text-rose-500"
                    : recordingState === "error"
                      ? "fill-destructive text-destructive"
                      : "fill-muted-foreground text-muted-foreground"
                }`}
              />
              {recordingStatus}
              {recordingState === "recording" && (
                <span className="tabular-nums">{recordingSeconds}s</span>
              )}
            </div>
            <button
              type="button"
              onClick={recordingState === "recording" ? stopRecording : startRecording}
              disabled={recordingState === "requesting" || recordingState === "stopping"}
              aria-label={recordingState === "recording" ? "Stop voice recording" : "Record voice"}
              className={`relative flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-full bg-gradient-to-br text-white shadow-2xl transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 sm:h-52 sm:w-52 ${
                recordingState === "recording"
                  ? "from-rose-500 to-pink-600"
                  : "from-purple-500 to-fuchsia-600"
              }`}
            >
              {recordingState === "recording" ? (
                <Square className="h-14 w-14" />
              ) : (
                <Mic className="h-14 w-14" />
              )}
              <span className="text-sm font-semibold">
                {recordingState === "recording" ? "Stop recording" : "Record Voice"}
              </span>
            </button>
          </div>
          <p className="relative mt-7 max-w-md text-sm text-muted-foreground">
            {recordingState === "recording"
              ? "Read the script aloud. Press Stop recording when you are finished."
              : "Microphone permission is requested when you start recording."}
          </p>
        </section>

        <div className="space-y-5">
          <section className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold">Recording script</h2>
            <p className="mt-3 rounded-2xl border border-border bg-white/70 p-4 text-sm leading-6 text-foreground">
              {recordingScript}
            </p>
          </section>

          <section className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold">Playback preview</h2>
            {recordingUrl && recordingFile ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {recordingFile.name} · {recordingSeconds}s ·{" "}
                  {(recordingFile.size / 1024).toFixed(1)} KB
                </p>
                <audio
                  ref={audioRef}
                  controls
                  src={recordingUrl}
                  className="w-full"
                  aria-label="Recorded voice preview"
                />
                <button
                  type="button"
                  onClick={() => {
                    void audioRef.current
                      ?.play()
                      .catch(() =>
                        setRecordingError("Could not play the recording in this browser."),
                      );
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm font-semibold"
                >
                  <Play className="h-4 w-4" /> Play recording
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Your recording preview will appear here after you stop recording.
              </p>
            )}
          </section>

          <section className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold">Trusted contact</h2>
            {contactsLoading ? (
              <p role="status" className="mt-3 text-sm text-muted-foreground">
                Loading trusted contacts…
              </p>
            ) : contactsError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {contactsError}
              </p>
            ) : trustedContacts.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">
                <p>No trusted contact added.</p>
                <Link
                  to="/trust-circle"
                  className="mt-2 inline-block font-semibold text-primary hover:underline"
                >
                  Add a trusted contact
                </Link>
              </div>
            ) : (
              <label className="mt-3 block text-sm">
                <span className="sr-only">Select trusted contact</span>
                <select
                  value={selectedContactId}
                  onChange={(event) => setSelectedContactId(event.target.value)}
                  disabled={recordingState === "recording"}
                  className="w-full rounded-xl border border-border bg-white/80 px-3 py-3"
                >
                  {trustedContacts.map((contact) => (
                    <option key={contact._id} value={contact._id}>
                      {contact.name} · {contact.relation}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={submitRecording}
              disabled={
                recordingState !== "ready" || !recordingFile || !selectedContact || contactsLoading
              }
              className="mt-4 w-full rounded-xl bg-gradient-primary py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Recording
            </button>
            {recordingError && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {recordingError}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              The recording stays in this page session. Submission is simulated; audio is not
              uploaded or sent.
            </p>
          </section>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-sos-dialog-title"
            className="glass-strong max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-6 sm:p-8"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <h2 id="voice-sos-dialog-title" className="pt-2 text-xl font-bold">
                Voice SOS Activated
              </h2>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="ml-auto rounded-lg p-2 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close voice SOS status"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p
              role="status"
              className="mt-5 rounded-xl border border-border bg-white/70 p-4 text-sm"
            >
              Recording submission simulated for {submittedContactName}. Nearby police station alert
              simulated.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {submittedRecordingName} remains on this device for preview. It was not uploaded or
              sent.
            </p>
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="mt-6 w-full rounded-xl bg-gradient-primary py-3 font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
