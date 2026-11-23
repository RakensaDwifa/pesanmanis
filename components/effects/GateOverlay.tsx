"use client";

import { useState } from "react";
import { Lock, Sparkles, KeyRound, HelpCircle } from "lucide-react";

interface GateOverlayProps {
  toName: string;
  fromName: string;
  gateType: string;
  gateData?: Record<string, unknown> | null;
  onUnlock: () => void;
  /** "embedded" → kartu di dalam frame preview, tanpa backdrop penuh. */
  variant?: "fullscreen" | "embedded";
  /** Jika diberikan, verifikasi PIN/jawaban via server (mode publik). */
  ucapanId?: string;
}

export default function GateOverlay({
  toName,
  fromName,
  gateType,
  gateData,
  onUnlock,
  variant = "fullscreen",
  ucapanId,
}: GateOverlayProps) {
  const [inputVal, setInputVal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPin = gateType === "pin";
  // Di mode server (ucapanId diberikan), gateData hanya berisi question (untuk trivia)
  // PIN/answer tidak dikirim ke client.
  const expectedPin = String(gateData?.pin ?? "").trim();
  const triviaQuestion =
    String(gateData?.question ?? "").trim() ||
    `Ada pertanyaan rahasia dari ${fromName} untuk ${toName}:`;
  const expectedAnswer = String(gateData?.answer ?? "").trim().toLowerCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMsg("Harap diisi terlebih dahulu ya!");
      return;
    }

    // Fail-closed: jika data gerbang tidak lengkap, jangan pernah buka.
    if (isPin && !expectedPin && !ucapanId) {
      setErrorMsg("PIN belum diatur oleh pengirim. Hubungi dia ya!");
      return;
    }
    if (!isPin && (!triviaQuestion || !expectedAnswer) && !ucapanId) {
      setErrorMsg("Kuis belum diatur oleh pengirim. Hubungi dia ya!");
      return;
    }

    setLoading(true);
    let isCorrect = false;

    if (ucapanId) {
      // Mode publik: verifikasi via server
      try {
        const res = await fetch(`/api/ucapan/${ucapanId}/verify-gate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmed }),
        });
        const json = await res.json();
        if (json.ok) {
          isCorrect = true;
        } else {
          setErrorMsg(
            isPin
              ? "Ups, PIN salah! Coba tanggal atau angka rahasia kalian."
              : "Jawaban belum tepat! Coba ingat-ingat lagi momen kenangan kalian ❤️"
          );
        }
      } catch {
        setErrorMsg("Terjadi kesalahan jaringan. Coba lagi ya.");
      }
    } else {
      // Mode preview (Builder): verifikasi lokal
      if (isPin) {
        isCorrect = trimmed === expectedPin;
      } else {
        isCorrect = trimmed.toLowerCase() === expectedAnswer;
      }
      if (!isCorrect) {
        setErrorMsg(
          isPin
            ? "Ups, PIN salah! Coba tanggal atau angka rahasia kalian."
            : "Jawaban belum tepat! Coba ingat-ingat lagi momen kenangan kalian ❤️"
        );
      }
    }

    setLoading(false);

    if (isCorrect) {
      onUnlock();
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  }

  return (
    <div
      className={
        variant === "fullscreen"
          ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          : "absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      }
    >
      <div
        data-light-card
        style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
        className={`w-full max-w-sm rounded-3xl p-6 md:p-8 shadow-2xl border border-rose-100 text-center transition-transform ${
          shaking ? "animate-bounce" : ""
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          {isPin ? <KeyRound className="h-7 w-7" /> : <HelpCircle className="h-7 w-7" />}
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-1">
          {isPin ? "Pesan Cinta Terkunci 🔒" : "Kuis Nostalgia Cinta 💌"}
        </h3>

        <p className="text-sm text-gray-600 mb-6">
          {isPin
            ? `Hai ${toName}, ${fromName} mengunci pesan ini dengan kode rahasia berdua.`
            : triviaQuestion}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type={isPin ? "password" : "text"}
            inputMode={isPin ? "numeric" : "text"}
            placeholder={isPin ? "Masukkan PIN / Tanggal Spesial" : "Ketik jawabanmu..."}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-center text-base focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all font-medium"
            autoFocus
          />

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium leading-relaxed">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            {loading
              ? "Memverifikasi..."
              : variant === "embedded"
              ? "Coba Buka (Pratinjau)"
              : "Buka Pesan Rahasia"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Sparkles className="h-3.5 w-3.5 text-rose-400" />
          <span>Kejutan personal dari {fromName}</span>
        </div>
      </div>
    </div>
  );
}
