"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Icon, Sheet, StatusMessage } from "@/shared/ui";

interface AudioRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  cardText: string;
  onAudioSaved: (audioUrl: string) => void;
}

export function AudioRecorder({
  isOpen,
  onClose,
  cardText,
  onAudioSaved,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    setIsRecording(false);
  }, [stopTracks]);

  // Cleanup streams and timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopTracks();
    };
  }, [stopTracks]);

  async function handleStartRecording() {
    setPermissionError(null);
    setTtsNotice(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            handleStopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setPermissionError(
        "Izinkan mikrofon agar suara bisa direkam. Suara hanya dipakai untuk kartu ini. Jika tidak memiliki mikrofon, kamu bisa menggunakan tombol Buat suara otomatis."
      );
    }
  }

  function handleTogglePreview() {
    if (!recordedUrl) return;

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(recordedUrl);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current.onerror = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.src = recordedUrl;
      previewAudioRef.current.play().then(() => setIsPlayingPreview(true)).catch(() => setIsPlayingPreview(false));
    }
  }

  function handleReset() {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedUrl(null);
    setIsPlayingPreview(false);
    setRecordingSeconds(0);
  }

  function handleSave() {
    if (recordedUrl) {
      onAudioSaved(recordedUrl);
      handleClose();
    }
  }

  function handleClose() {
    if (isRecording) {
      handleStopRecording();
    }
    handleReset();
    onClose();
  }

  async function handleGenerateTts() {
    setIsGeneratingTts(true);
    setPermissionError(null);
    try {
      const res = await fetch("/api/audio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cardText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          onAudioSaved(data.url);
          handleClose();
          return;
        }
      }
    } catch {
      // Fallback
    }

    setTtsNotice("Suara kartu akan diputar secara otomatis menggunakan sintesis suara bawaan (Web Speech API).");
    setIsGeneratingTts(false);
  }

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} title="Rekam Suara Kartu">
      <div className="flex flex-col gap-5">
        <div>
          <span className="text-xs font-bold text-[var(--muted)] uppercase">Teks yang akan dibaca:</span>
          <p className="mt-1 text-lg font-bold text-[var(--ink)] bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]">
            &ldquo;{cardText}&rdquo;
          </p>
        </div>

        {permissionError && <StatusMessage type="ulang">{permissionError}</StatusMessage>}
        {ttsNotice && <StatusMessage type="info">{ttsNotice}</StatusMessage>}

        {/* Status Rekaman */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-2)]/40 gap-4">
          <div className="text-3xl font-mono font-bold tracking-widest text-[var(--ink)]">
            00:{recordingSeconds.toString().padStart(2, "0")} / 00:30
          </div>

          {!recordedUrl ? (
            !isRecording ? (
              <Button
                type="button"
                variant="primary"
                size="large"
                onClick={handleStartRecording}
                icon={<Icon name="Microphone" size={24} />}
                className="w-full sm:w-auto px-8"
              >
                Mulai Rekam
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="large"
                onClick={handleStopRecording}
                icon={<Icon name="Stop" size={24} />}
                className="w-full sm:w-auto px-8 bg-red-700 hover:bg-red-800"
              >
                Berhenti Rekam
              </Button>
            )
          ) : (
            /* Pratinjau Pemutaran */
            <div className="flex flex-col items-center gap-3 w-full">
              <span className="text-sm font-bold text-emerald-800">Rekaman berhasil disimpan di pratinjau.</span>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="normal"
                  onClick={handleTogglePreview}
                  icon={<Icon name={isPlayingPreview ? "Pause" : "Play"} size={20} />}
                >
                  {isPlayingPreview ? "Jeda" : "Dengar Hasil"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="normal"
                  onClick={handleReset}
                  icon={<Icon name="ArrowsClockwise" size={20} />}
                >
                  Rekam Ulang
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Opsi Cadangan Suara Otomatis */}
        <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
          <span className="text-xs text-[var(--muted)]">Tidak memiliki mikrofon atau suara serak?</span>
          <Button
            type="button"
            variant="secondary"
            size="normal"
            disabled={isGeneratingTts || isRecording}
            onClick={handleGenerateTts}
            icon={<Icon name="SpeakerHigh" size={18} />}
          >
            {isGeneratingTts ? "Menyiapkan suara..." : "Gunakan Suara Otomatis (TTS)"}
          </Button>
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[var(--border)]">
          <Button type="button" variant="secondary" size="normal" onClick={handleClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="normal"
            disabled={!recordedUrl}
            onClick={handleSave}
            icon={<Icon name="CheckCircle" size={18} />}
          >
            Simpan Suara Kartu
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
