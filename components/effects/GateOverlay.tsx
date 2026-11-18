"use client";

import { useState } from "react";
import { Lock, Sparkles, KeyRound, HelpCircle } from "lucide-react";

interface GateOverlayProps {
  toName: string;
  fromName: string;
  gateType: string;
  gateData?: Record<string, unknown> | null;
  onUnlock: () => void;
}

export default function GateOverlay({
  toName,
  fromName,
  gateType,
  gateData,
  onUnlock,
}: GateOverlayProps) {
  const [inputVal, setInputVal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shaking, setShaking] = useState(false);

  const isPin = gateType === "pin";
  const expectedPin = String(gateData?.pin ?? "").trim();
  const triviaQuestion =
    String(gateData?.question ?? "").trim() ||
    `Ada pertanyaan rahasia dari ${fromName} untuk ${toName}:`;
  const expectedAnswer = String(gateData?.answer ?? "").trim().toLowerCase();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    // Fail-closed: jika data gerbang tidak lengkap, jangan pernah buka.
    if (isPin && !expectedPin) {
      setErrorMsg("PIN belum diatur oleh pengirim. Hubungi dia ya!");
      return;
    }
    if (!isPin && (!triviaQuestion || !expectedAnswer)) {
      setErrorMsg("Kuis belum diatur oleh pengirim. Hubungi dia ya!");
      return;
    }

    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMsg("Harap diisi terlebih dahulu ya!");
      return;
    }

    let isCorrect = false;
    if (isPin) {
      isCorrect = trimmed === expectedPin;
    } else {
      isCorrect = trimmed.toLowerCase() === expectedAnswer;
    }

    if (isCorrect) {
      onUnlock();
    } else {
      setShaking(true);
      setErrorMsg(
        isPin
          ? "Ups, PIN salah! Coba tanggal atau angka rahasia kalian."
          : "Jawaban belum tepat! Coba ingat-ingat lagi momen kenangan kalian ❤️"
      );
      setTimeout(() => setShaking(false), 600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className={`w-full max-w-sm rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-rose-100 text-center transition-transform ${
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
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="h-4 w-4" /> Buka Pesan Rahasia
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
