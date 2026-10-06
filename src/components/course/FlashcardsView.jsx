import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { recordStudy, awardBadge } from "@/lib/gamification";
import { awardXP } from "@/lib/xpSystem";
import { RotateCcw, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Shuffle, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { getOfflineSnapshot, setOfflineSnapshot } from "@/lib/offlineDb";

export default function FlashcardsView({ flashcards, course }) {
  const allCards = flashcards?.cards || [];
  const [cards, setCards] = useState(allCards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [done, setDone] = useState(false);
  const [direction, setDirection] = useState(0); // -1 left, 1 right
  const [offlineReady, setOfflineReady] = useState(false);
  const progressKey = course?.id ? `flash-progress:${course.id}` : null;

  useEffect(() => {
    setOfflineReady(false);
    if (!progressKey) {
      setOfflineReady(true);
      return;
    }
    getOfflineSnapshot(progressKey).then((saved) => {
      if (!saved || saved.cardCount !== allCards.length) return;
      setIdx(Math.min(saved.idx || 0, Math.max(0, allCards.length - 1)));
      setKnown(Array.isArray(saved.known) ? saved.known : []);
      setUnknown(Array.isArray(saved.unknown) ? saved.unknown : []);
      setDone(!!saved.done);
    }).catch(() => {}).finally(() => setOfflineReady(true));
  }, [progressKey, allCards.length]);

  useEffect(() => {
    if (!offlineReady || !progressKey || !allCards.length) return;
    setOfflineSnapshot(progressKey, { idx, known, unknown, done, cardCount: allCards.length }).catch(() => {});
  }, [offlineReady, progressKey, idx, known, unknown, done, allCards.length]);

  const card = cards[idx];
  const progress = Math.round((idx / cards.length) * 100);

  const shuffle = () => {
    setCards([...allCards].sort(() => Math.random() - 0.5));
    setIdx(0); setFlipped(false); setKnown([]); setUnknown([]); setDone(false);
  };

  const go = (dir) => {
    if (idx + dir < 0 || idx + dir >= cards.length) return;
    setDirection(dir);
    setFlipped(false);
    setTimeout(() => setIdx(i => i + dir), 50);
  };

  const markKnown = async () => {
    setKnown(k => [...k, idx]);
    setDirection(1);
    setFlipped(false);
    if (idx >= cards.length - 1) {
      await finish();
    } else {
      setTimeout(() => setIdx(i => i + 1), 50);
    }
  };

  const markUnknown = () => {
    setUnknown(u => [...u, idx]);
    setDirection(-1);
    setFlipped(false);
    if (idx >= cards.length - 1) {
      finish();
    } else {
      setTimeout(() => setIdx(i => i + 1), 50);
    }
  };

  const finish = async () => {
    setDone(true);
    const score = known.length + 1; // +1 for current
    if (score === cards.length) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#00ff88', '#00cfff'] });
    }
    try {
      await awardXP('flashcard_session');
      await recordStudy({ minutes: Math.round(cards.length * 0.5), courseId: course?.id });
      // Check flashcard badge
      const user = await import('@/api').then(m => m.auth.me());
      const totalReviewed = (user?.flashcards_reviewed || 0) + cards.length;
      await import('@/api').then(m => m.auth.updateMe({ flashcards_reviewed: totalReviewed }));
      if (totalReviewed >= 100) await awardBadge('flashcard_fan');
    } catch {}
  };

  const retryUnknown = () => {
    if (!unknown.length) return;
    setCards(unknown.map(i => cards[i]));
    setIdx(0); setFlipped(false); setKnown([]); setUnknown([]); setDone(false);
  };

  // Keyboard navigation — POLITE edition (the old version "fought" the user):
  // it grabbed arrows globally, so with the view below the fold the dashboard
  // would not scroll (arrows did nothing visible = the 'مقاومة' report), and
  // it hijacked keys even while typing or with a dialog open.
  // Gates:
  //   1. view offscreen (IntersectionObserver) → do nothing, page scrolls
  //   2. typing in an input/textarea/select/contenteditable → do nothing
  //   3. a dialog is open (role=dialog / aria-modal) → do nothing
  //   4. IME composition (Arabic virtual keyboards) → do nothing
  // Arrows are consumed WITHOUT preventDefault (space still flips: it would
  // scroll the page — but only while the card is onscreen, which is exactly
  // when the user is interacting with it).
  const viewRef = useRef(null);
  const [viewOnscreen, setViewOnscreen] = useState(false);
  useEffect(() => {
    const node = viewRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setViewOnscreen(true); return; }
    const io = new IntersectionObserver(([entry]) => setViewOnscreen(entry.isIntersecting), { rootMargin: '80px' });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!viewOnscreen) return;
      if (e.isComposing) return;
      const el = e.target;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (typeof document !== 'undefined' && document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowUp' && flipped) { e.preventDefault(); markKnown(); }
      if (e.key === 'ArrowDown' && flipped) { e.preventDefault(); markUnknown(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, idx, viewOnscreen]);

  if (!allCards.length) return (
    <p className="text-muted-foreground text-center py-8">لا توجد بطاقات بعد.</p>
  );

  if (done) {
    const knownCount = known.length + 1;
    const pct = Math.round((knownCount / cards.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center">
        <div className="glass-card rounded-3xl p-8 border border-primary/20 mb-6">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">عملت كويس! 🎉</h2>
          <p className="text-4xl font-black text-primary my-4">{pct}%</p>
          <p className="text-muted-foreground text-sm">عارف: {knownCount} | محتاج مراجعة: {cards.length - knownCount}</p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {cards.length - knownCount > 0 && (
            <Button onClick={retryUnknown} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> راجع اللي مش عارفه ({cards.length - knownCount})
            </Button>
          )}
          <Button onClick={shuffle} className="gap-2">
            <Shuffle className="w-4 h-4" /> من الأول (عشوائي)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Space لقلب البطاقة • ↑ عارفه • ↓ مش عارفه</p>
      </motion.div>
    );
  }

  return (
    <div ref={viewRef} className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-muted-foreground">{idx + 1} / {cards.length}</span>
        <div className="flex gap-2">
          <span className="text-xs text-[hsl(152,100%,50%)] font-bold">{known.length} ✓</span>
          <span className="text-xs text-destructive font-bold">{unknown.length} ✗</span>
          <Button size="sm" variant="ghost" onClick={shuffle} className="h-7 px-2 gap-1">
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <Progress value={progress} className="h-1 mb-6" />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${idx}-${flipped}`}
          initial={{ opacity: 0, x: direction * 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 30 }}
          transition={{ duration: 0.2 }}
          onClick={() => setFlipped(f => !f)}
          className={`glass-card rounded-3xl border-2 cursor-pointer select-none min-h-[240px] flex flex-col items-center justify-center p-8 text-center transition-colors touch-manipulation ${
            flipped ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
          }`}
        >
          <span className={`text-xs font-bold uppercase tracking-wider mb-4 ${flipped ? "text-primary" : "text-muted-foreground"}`}>
            {flipped ? "الإجابة ✨" : "السؤال"}
          </span>
          <p className="text-lg font-bold leading-relaxed">
            {flipped ? card?.back : card?.front}
          </p>
          {!flipped && (
            <p className="text-xs text-muted-foreground mt-6">اضغط للكشف عن الإجابة</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions — pb-safe keeps the buttons above the iOS home indicator
          on notched phones (the row currently sits flush against it). */}
      <div className="mt-4 flex gap-3 justify-center pb-safe">
        <Button size="icon" variant="outline" onClick={() => go(-1)} disabled={idx === 0}
          className="rounded-2xl w-11 h-11">
          <ChevronRight className="w-4 h-4" />
        </Button>
        {flipped ? (
          <>
            <Button onClick={markUnknown} variant="outline" className="gap-2 rounded-2xl flex-1 border-destructive/40 text-destructive hover:bg-destructive/10">
              <XCircle className="w-4 h-4" /> مش عارفه
            </Button>
            <Button onClick={markKnown} className="gap-2 rounded-2xl flex-1 bg-[hsl(152,100%,40%)] hover:bg-[hsl(152,100%,35%)] text-black font-bold">
              <CheckCircle2 className="w-4 h-4" /> عارفه ✓
            </Button>
          </>
        ) : (
          <Button onClick={() => setFlipped(true)} className="gap-2 rounded-2xl flex-1">
            اكشف الإجابة
          </Button>
        )}
        <Button size="icon" variant="outline" onClick={() => go(1)} disabled={idx >= cards.length - 1}
          className="rounded-2xl w-11 h-11">
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3 opacity-60">
        Space لقلب • ↑ عارفه • ↓ مش عارفه • ← → للتنقل
      </p>
    </div>
  );
}
