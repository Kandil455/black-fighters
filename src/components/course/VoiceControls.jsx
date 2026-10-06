import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * زر نطق رد المساعد بالصوت (Text-to-Speech) باستخدام Web Speech API المدمج في المتصفح.
 */
export function SpeakButton({ text }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  const toggle = () => {
    if (!supported || !text) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/==(?:green|yellow|cyan|orange|red):/g, "").replace(/==/g, "").replace(/[*#`>|_-]/g, " ");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = /[\u0600-\u06FF]/.test(clean) ? "ar-EG" : "en-US";
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  if (!supported) return null;
  return (
    <button
      onClick={toggle}
      className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
      title={speaking ? "إيقاف القراءة" : "اسمع الرد"}
    >
      {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
    </button>
  );
}

/**
 * هوك للإدخال الصوتي (Speech-to-Text) — يرجّع النص أثناء التحدث عبر onResult.
 */
export function useSpeechInput(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "ar-EG";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      onResult(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [supported, onResult]);

  useEffect(() => () => { recRef.current?.abort?.(); }, []);

  return { listening, start, stop, supported: !!supported };
}