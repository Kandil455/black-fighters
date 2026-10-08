import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  // Theme state
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('bf_theme');
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState({ text: '', type: '' });
  const [pricesUpdating, setPricesUpdating] = useState(false);

  // Refs
  const progressLineRef = useRef(null);
  const cursorDotRef = useRef(null);
  const headerRef = useRef(null);
  const heroHeadlineRef = useRef(null);
  const heroGuidesRef = useRef(null);
  const manifestoRef = useRef(null);
  const footerWordmarkRef = useRef(null);

  const authTarget = user ? '/dashboard' : '/register';

  // Apply theme & force document styles
  useEffect(() => {
    const originalDir = document.documentElement.dir || 'rtl';
    const originalLang = document.documentElement.lang || 'ar';
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;

    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    document.documentElement.setAttribute('data-theme', theme);

    const isDark = theme === 'dark';
    const bg = isDark ? '#0c0c0b' : '#f3f1ec';
    const text = isDark ? '#f1efe9' : '#0d0d0c';

    document.body.style.backgroundColor = bg;
    document.body.style.color = text;

    try {
      localStorage.setItem('bf_theme', theme);
    } catch {}

    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', bg);

    return () => {
      document.documentElement.dir = originalDir;
      document.documentElement.lang = originalLang;
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleBillingToggle = (cycle) => {
    if (cycle === billingCycle) return;
    setPricesUpdating(true);
    setTimeout(() => {
      setBillingCycle(cycle);
      setPricesUpdating(false);
    }, 180);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const val = newsletterEmail.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setNewsletterStatus({ text: 'Email required.', type: 'error' });
    } else if (!regex.test(val)) {
      setNewsletterStatus({ text: 'Please enter a valid email address.', type: 'error' });
    } else {
      setNewsletterStatus({ text: 'Subscribed to quarterly updates.', type: 'success' });
      setNewsletterEmail('');
    }
  };

  // Scroll & Animation Engine
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEnd = Boolean(
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      (navigator.connection && navigator.connection.saveData)
    );
    const shouldAnimate = !prefersReduced && !isLowEnd;

    // 1. Hero Reveal
    if (heroGuidesRef.current) heroGuidesRef.current.classList.add('loaded');
    const heroTimer = setTimeout(() => {
      if (heroHeadlineRef.current) heroHeadlineRef.current.classList.add('revealed');
    }, 100);

    // 2. Manifesto Word Wrapping
    let manifestoWords = [];
    if (manifestoRef.current) {
      const originalHtml = manifestoRef.current.innerHTML;
      const words = originalHtml.trim().split(/\s+/);
      manifestoRef.current.innerHTML = words
        .map((w) => `<span class="manifesto-word">${w}</span>`)
        .join(' ');
      manifestoWords = manifestoRef.current.querySelectorAll('.manifesto-word');
    }

    // 3. Scroll Handling
    let lastScrollY = window.scrollY;
    let ticking = false;
    let headerHidden = false;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollY / docHeight : 0;

      if (progressLineRef.current) {
        progressLineRef.current.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
      }

      if (headerRef.current) {
        if (scrollY > 24) {
          headerRef.current.classList.add('scrolled');
        } else {
          headerRef.current.classList.remove('scrolled');
        }

        if (scrollY > 120 && scrollY > lastScrollY && !headerHidden) {
          headerRef.current.classList.add('header-hidden');
          headerHidden = true;
        } else if (scrollY < lastScrollY && headerHidden) {
          headerRef.current.classList.remove('header-hidden');
          headerHidden = false;
        }
      }

      if (shouldAnimate && heroHeadlineRef.current) {
        const drift = Math.min(scrollY * 0.18, 60);
        heroHeadlineRef.current.style.transform = `translateY(-${drift}px)`;
      }

      if (shouldAnimate && manifestoRef.current && manifestoWords.length > 0) {
        const rect = manifestoRef.current.getBoundingClientRect();
        const winH = window.innerHeight;
        const ratio = (winH - rect.top) / (winH + rect.height * 0.75);
        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const activeIdx = Math.floor(clampedRatio * manifestoWords.length);

        for (let i = 0; i < manifestoWords.length; i++) {
          manifestoWords[i].style.opacity = i <= activeIdx ? '1' : '0.14';
        }
      }

      if (footerWordmarkRef.current) {
        const fRect = footerWordmarkRef.current.getBoundingClientRect();
        if (fRect.top < window.innerHeight) {
          footerWordmarkRef.current.classList.add('revealed');
        }
      }

      lastScrollY = scrollY;
      ticking = false;
    };

    const scrollHandler = () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });

    // 4. Section Reveals & Stats Counters
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    const statCells = document.querySelectorAll('.stat-number');
    let revealObserver;
    let statsObserver;

    if (shouldAnimate && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      reveals.forEach((el) => revealObserver.observe(el));

      statsObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateNumber(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.25 }
      );

      statCells.forEach((el) => statsObserver.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add('revealed'));
      statCells.forEach((el) => {
        el.textContent = el.getAttribute('data-target') + (el.getAttribute('data-suffix') || '');
      });
      if (manifestoWords.length > 0) {
        manifestoWords.forEach((w) => (w.style.opacity = '1'));
      }
      if (footerWordmarkRef.current) footerWordmarkRef.current.classList.add('revealed');
    }

    function animateNumber(element) {
      const targetVal = parseFloat(element.getAttribute('data-target'));
      const suffix = element.getAttribute('data-suffix') || '';
      const isFloat = element.getAttribute('data-target').includes('.');
      const duration = 1500;
      let startTimestamp = null;

      function step(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = ease * targetVal;

        element.textContent = (isFloat ? current.toFixed(1) : Math.floor(current)) + suffix;
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.textContent = element.getAttribute('data-target') + suffix;
        }
      }
      window.requestAnimationFrame(step);
    }

    // 5. Custom Cursor & Magnetism
    let cursorRaf = null;
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (shouldAnimate && isFinePointer) {
      document.body.classList.add('has-custom-cursor');
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let curX = mouseX;
      let curY = mouseY;

      const mouseMoveHandler = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      };
      window.addEventListener('mousemove', mouseMoveHandler);

      const renderCursor = () => {
        curX += (mouseX - curX) * 0.22;
        curY += (mouseY - curY) * 0.22;
        if (cursorDotRef.current) {
          cursorDotRef.current.style.left = `${curX}px`;
          cursorDotRef.current.style.top = `${curY}px`;
        }
        cursorRaf = window.requestAnimationFrame(renderCursor);
      };
      cursorRaf = window.requestAnimationFrame(renderCursor);

      const interactives = document.querySelectorAll(
        'a, button, [role="button"], input, .capability-row'
      );
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', () => {
          if (cursorDotRef.current) cursorDotRef.current.classList.add('active');
        });
        el.addEventListener('mouseleave', () => {
          if (cursorDotRef.current) cursorDotRef.current.classList.remove('active');
        });
      });

      const magneticBtns = document.querySelectorAll('[data-magnet]');
      magneticBtns.forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
          const bRect = btn.getBoundingClientRect();
          const bCenterX = bRect.left + bRect.width / 2;
          const bCenterY = bRect.top + bRect.height / 2;
          const deltaX = (e.clientX - bCenterX) * 0.15;
          const deltaY = (e.clientY - bCenterY) * 0.15;
          const magX = Math.max(-6, Math.min(6, deltaX));
          const magY = Math.max(-6, Math.min(6, deltaY));
          btn.style.transform = `translate(${magX}px, ${magY}px)`;
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'translate(0, 0)';
        });
      });
    }

    return () => {
      clearTimeout(heroTimer);
      window.removeEventListener('scroll', scrollHandler);
      if (revealObserver) revealObserver.disconnect();
      if (statsObserver) statsObserver.disconnect();
      if (cursorRaf) window.cancelAnimationFrame(cursorRaf);
      document.body.classList.remove('has-custom-cursor');
    };
  }, []);

  // Lock scroll on mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const pricingData = {
    monthly: { starter: '0 EGP', pro: '149 EGP', supreme: '249 EGP' },
    annual: { starter: '0 EGP', pro: '119 EGP', supreme: '199 EGP' },
  };

  return (
    <div className="blackfighters-editorial-root" dir="ltr" lang="en" data-theme={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .btn-pill-sm { padding: 10px 22px !important; font-size: 0.76rem !important; min-height: 38px !important; }
        .btn-pill-lg { padding: 20px 48px !important; font-size: 0.9rem !important; }
        .btn-pill-outline { width: 100% !important; border: 1px solid var(--line) !important; background: transparent !important; color: var(--ink) !important; }
        .text-signal { color: var(--signal) !important; }
        .opacity-80 { opacity: 0.8 !important; }
        .w-full { width: 100% !important; }
        .newsletter-subtext { color: var(--mute) !important; font-size: 0.78rem !important; margin-bottom: 16px !important; line-height: 1.5 !important; }
        .footer-direct-desc { color: var(--mute) !important; line-height: 1.6 !important; font-size: 0.78rem !important; margin-bottom: 16px !important; }
        .footer-privacy-link { margin-right: 16px !important; }
        .sr-only-hidden { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; border: 0 !important; }

        /* Root Theme Tokens */
        .blackfighters-editorial-root {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: isolate;

          --paper: #f3f1ec;
          --paper-2: #e9e6de;
          --ink: #0d0d0c;
          --mute: #54524c;
          --line: rgba(13, 13, 12, 0.14);
          --signal: #ff4d1f;

          --font-serif: "Instrument Serif", Georgia, serif;
          --font-sans: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          --font-mono: "JetBrains Mono", monospace;

          --ease: cubic-bezier(0.19, 1, 0.22, 1);
          --gutter: clamp(20px, 4vw, 56px);
          --max-width: 1600px;
          --section-vpad: clamp(110px, 15vw, 220px);

          background-color: var(--paper) !important;
          color: var(--ink) !important;
          font-family: var(--font-sans) !important;
          min-height: 100svh;
          overflow-x: hidden;
          position: relative;
        }

        /* Dark Theme Tokens: Bright Crisp Off-White Text on Deep Carbon Black */
        .blackfighters-editorial-root[data-theme="dark"],
        html[data-theme="dark"] .blackfighters-editorial-root {
          --paper: #0c0c0b;
          --paper-2: #151513;
          --ink: #f1efe9;
          --mute: #9e9c94;
          --line: rgba(241, 239, 233, 0.16);
          --signal: #ff6a3d;

          background-color: #0c0c0b !important;
          color: #f1efe9 !important;
        }

        .blackfighters-editorial-root *,
        .blackfighters-editorial-root *::before,
        .blackfighters-editorial-root *::after {
          box-sizing: border-box;
          border-radius: 0;
          direction: ltr;
          text-align: left;
          -webkit-font-smoothing: antialiased;
        }

        /* Enforce Exact Text Colors */
        .blackfighters-editorial-root h1,
        .blackfighters-editorial-root h2,
        .blackfighters-editorial-root h3,
        .blackfighters-editorial-root h4,
        .blackfighters-editorial-root .hero-headline,
        .blackfighters-editorial-root .hero-line-inner,
        .blackfighters-editorial-root .section-headline,
        .blackfighters-editorial-root .cap-title,
        .blackfighters-editorial-root .card-headline,
        .blackfighters-editorial-root .stat-number,
        .blackfighters-editorial-root .editorial-quote,
        .blackfighters-editorial-root .pricing-amount,
        .blackfighters-editorial-root .pricing-tier-name,
        .blackfighters-editorial-root .faq-question,
        .blackfighters-editorial-root .cta-big-line,
        .blackfighters-editorial-root .brand-wordmark,
        .blackfighters-editorial-root .footer-giant-wordmark {
          color: var(--ink) !important;
        }

        .blackfighters-editorial-root a {
          color: inherit;
          text-decoration: none;
        }

        .blackfighters-editorial-root button {
          background: none;
          border: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
        }

        .mono {
          font-family: var(--font-mono) !important;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.78rem;
        }

        .serif {
          font-family: var(--font-serif) !important;
          font-weight: 400;
        }

        .signal-text {
          color: var(--signal) !important;
          font-style: italic;
        }

        .signal-dot {
          color: var(--signal) !important;
        }

        .container {
          width: 100%;
          max-width: var(--max-width);
          margin-left: auto;
          margin-right: auto;
          padding-left: var(--gutter);
          padding-right: var(--gutter);
        }

        .skip-link {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 9999;
          background: var(--ink);
          color: var(--paper);
          padding: 8px 16px;
          transform: translateY(-150%);
          transition: transform 0.2s var(--ease);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .skip-link:focus {
          transform: translateY(0);
        }

        #progress-line {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--signal);
          transform-origin: 0 50%;
          transform: scaleX(0);
          z-index: 1000;
          pointer-events: none;
        }

        #cursor-dot {
          display: none;
        }
        @media (hover: hover) and (pointer: fine) {
          body.has-custom-cursor,
          body.has-custom-cursor a,
          body.has-custom-cursor button {
            cursor: none;
          }
          #cursor-dot {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 10px;
            height: 10px;
            background-color: var(--signal);
            border-radius: 50% !important;
            pointer-events: none;
            z-index: 99999;
            transform: translate(-50%, -50%);
            transition: width 0.3s var(--ease), height 0.3s var(--ease), background-color 0.3s var(--ease), opacity 0.3s var(--ease);
          }
          #cursor-dot.active {
            width: 56px;
            height: 56px;
            background-color: var(--signal);
            opacity: 0.28;
          }
        }

        .btn-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 36px;
          border-radius: 9999px !important;
          background-color: var(--signal) !important;
          color: #ffffff !important;
          font-family: var(--font-mono);
          text-transform: uppercase;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          font-weight: 500;
          min-height: 48px;
          min-width: 44px;
          transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
          border: 1px solid transparent;
        }
        .btn-pill:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .editorial-section {
          position: relative;
          padding-top: var(--section-vpad);
          padding-bottom: var(--section-vpad);
          border-bottom: 1px solid var(--line);
        }

        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 1s var(--ease), transform 1s var(--ease);
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        header#site-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 900;
          transition: transform 0.5s var(--ease), background-color 0.3s var(--ease), border-color 0.3s var(--ease);
          border-bottom: 1px solid transparent;
        }
        header#site-header.scrolled {
          background-color: var(--paper) !important;
          border-bottom-color: var(--line) !important;
        }
        header#site-header.header-hidden {
          transform: translateY(-100%);
        }

        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 76px;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 36px;
        }
        .desktop-nav a {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--mute) !important;
          transition: color 0.25s var(--ease);
          padding: 8px 0;
        }
        .desktop-nav a:hover {
          color: var(--ink) !important;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .theme-toggle {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink) !important;
          padding: 10px 14px;
          border: 1px solid var(--line);
          transition: border-color 0.25s var(--ease), background-color 0.25s var(--ease);
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        .theme-toggle:hover {
          border-color: var(--ink);
        }

        .mobile-menu-btn {
          display: none;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink) !important;
          padding: 10px 14px;
          border: 1px solid var(--line);
          min-height: 44px;
          min-width: 44px;
        }

        #mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100svh;
          background-color: var(--paper) !important;
          z-index: 950;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: var(--gutter);
          transform: translateY(-100%);
          transition: transform 0.6s var(--ease);
          pointer-events: none;
        }
        #mobile-menu-overlay.open {
          transform: translateY(0);
          pointer-events: auto;
        }
        .mobile-menu-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 76px;
        }
        .mobile-nav-links {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin: auto 0;
        }
        .mobile-nav-links a {
          font-family: var(--font-serif);
          font-size: clamp(2.5rem, 8vw, 4rem);
          line-height: 1.1;
          color: var(--ink) !important;
          transition: color 0.2s var(--ease);
        }
        .mobile-nav-links a:hover {
          color: var(--signal) !important;
        }
        .mobile-menu-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--line);
          padding-top: 24px;
        }

        section#hero {
          padding-top: calc(76px + clamp(40px, 8vw, 90px));
          padding-bottom: clamp(70px, 10vw, 130px);
          position: relative;
          overflow: hidden;
          border-bottom: none;
        }

        .hero-guides {
          position: absolute;
          top: 0;
          bottom: 0;
          left: var(--gutter);
          right: var(--gutter);
          pointer-events: none;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          z-index: 1;
        }
        .hero-guide-line {
          border-left: 1px solid var(--line);
          height: 100%;
          transform-origin: top;
          transform: scaleY(0);
          transition: transform 1.4s var(--ease);
        }
        .hero-guide-line:last-child {
          border-right: 1px solid var(--line);
        }
        .hero-guides.loaded .hero-guide-line {
          transform: scaleY(1);
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          color: var(--mute) !important;
          padding-bottom: clamp(28px, 4vw, 44px);
          border-bottom: 1px solid var(--line);
          margin-bottom: clamp(32px, 5vw, 64px);
        }

        .hero-headline {
          font-family: var(--font-serif) !important;
          font-size: clamp(3.2rem, 14vw, 13.5rem);
          line-height: 0.92;
          letter-spacing: -0.025em;
          margin-bottom: clamp(40px, 6vw, 76px);
          will-change: transform;
          color: var(--ink) !important;
        }
        .hero-line-mask {
          overflow: hidden;
          display: block;
        }
        .hero-line-inner {
          display: block;
          transform: translateY(115%);
          transition: transform 1.2s var(--ease);
          color: var(--ink) !important;
        }
        .hero-line-mask:nth-child(2) .hero-line-inner {
          transition-delay: 0.15s;
        }
        .hero-headline.revealed .hero-line-inner {
          transform: translateY(0);
        }

        .hero-bottom-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 36px;
          max-width: 1100px;
        }
        @media (min-width: 900px) {
          .hero-bottom-row {
            grid-template-columns: minmax(0, 42ch) auto;
            align-items: flex-end;
            justify-content: space-between;
          }
        }

        .hero-lede {
          font-size: clamp(1.05rem, 1.8vw, 1.35rem);
          line-height: 1.45;
          color: var(--mute) !important;
          max-width: 36ch;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 28px;
          flex-wrap: wrap;
        }

        .hero-link {
          font-family: var(--font-mono);
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 6px;
          color: var(--ink) !important;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          transition: color 0.2s var(--ease);
        }
        .hero-link:hover {
          color: var(--signal) !important;
        }

        .ticker-wrap {
          width: 100%;
          overflow: hidden;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          background-color: var(--paper) !important;
          padding: 18px 0;
          position: relative;
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-wrap:hover .ticker-track {
          animation-play-state: paused;
        }
        .ticker-group {
          display: flex;
          align-items: center;
          gap: 32px;
          padding-right: 32px;
        }
        .ticker-item {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink) !important;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 32px;
        }
        .ticker-item::after {
          content: "•";
          color: var(--signal) !important;
          font-size: 0.9rem;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .manifesto-label {
          color: var(--mute) !important;
          margin-bottom: clamp(28px, 4vw, 48px);
        }
        .manifesto-text {
          font-family: var(--font-serif) !important;
          font-size: clamp(2.1rem, 5.4vw, 5.2rem);
          line-height: 1.08;
          letter-spacing: -0.015em;
          max-width: 24ch;
          color: var(--ink) !important;
        }
        .manifesto-word {
          display: inline-block;
          opacity: 0.14;
          transition: opacity 0.1s linear;
        }

        .section-header-row {
          margin-bottom: clamp(48px, 8vw, 84px);
        }
        .section-label {
          color: var(--mute) !important;
          margin-bottom: 20px;
        }
        .section-headline {
          font-family: var(--font-serif) !important;
          font-size: clamp(2.4rem, 6vw, 4.8rem);
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: var(--ink) !important;
        }

        .capabilities-list {
          border-top: 1px solid var(--line);
        }
        .capability-row {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 24px;
          align-items: baseline;
          padding: clamp(28px, 4vw, 44px) 0;
          border-bottom: 1px solid var(--line);
          cursor: pointer;
          color: var(--ink) !important;
          overflow: hidden;
          transition: color 0.4s var(--ease);
        }
        @media (min-width: 900px) {
          .capability-row {
            grid-template-columns: 80px 1.2fr 1fr 60px;
            align-items: center;
          }
        }
        .capability-row::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--ink);
          transform: scaleY(0);
          transform-origin: 50% 100%;
          transition: transform 0.6s var(--ease);
          z-index: 1;
        }
        .capability-row:hover::before {
          transform: scaleY(1);
        }
        .capability-row > * {
          position: relative;
          z-index: 2;
          transition: color 0.4s var(--ease), transform 0.4s var(--ease);
        }
        .capability-row:hover {
          color: var(--paper) !important;
        }
        .capability-row:hover .cap-title,
        .capability-row:hover .cap-desc {
          color: var(--paper) !important;
        }
        .capability-row:hover .cap-index {
          color: var(--signal) !important;
        }
        .capability-row:hover .cap-arrow {
          transform: translate(6px, -6px);
          color: var(--signal) !important;
        }

        .cap-index { color: var(--mute) !important; }
        .cap-title {
          font-family: var(--font-serif) !important;
          font-size: clamp(1.8rem, 4.4vw, 4rem);
          line-height: 1;
          letter-spacing: -0.015em;
          color: var(--ink) !important;
        }
        .cap-desc {
          color: var(--mute) !important;
          font-size: 0.95rem;
          line-height: 1.45;
          max-width: 44ch;
        }
        @media (max-width: 899px) {
          .cap-desc {
            grid-column: 2 / -1;
            margin-top: -8px;
          }
        }
        .cap-arrow {
          font-family: var(--font-serif);
          font-size: 2rem;
          line-height: 1;
          text-align: right;
          color: var(--ink);
        }

        .process-cards-stack {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 36px;
          margin-top: clamp(40px, 6vw, 72px);
        }
        .process-card {
          position: sticky;
          background-color: var(--paper-2) !important;
          border: 1px solid var(--line);
          min-height: min(68svh, 600px);
          padding: clamp(32px, 5vw, 64px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .process-card:nth-child(1) { top: clamp(90px, 12vh, 130px); }
        .process-card:nth-child(2) { top: calc(clamp(90px, 12vh, 130px) + 26px); }
        .process-card:nth-child(3) { top: calc(clamp(90px, 12vh, 130px) + 52px); }

        @media (max-width: 768px) {
          .process-card { min-height: 60svh; }
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--line);
          color: var(--mute) !important;
        }
        .card-headline {
          font-family: var(--font-serif) !important;
          font-size: clamp(2.4rem, 6.2vw, 5.2rem);
          line-height: 0.98;
          letter-spacing: -0.02em;
          margin: 40px 0;
          max-width: 18ch;
          color: var(--ink) !important;
        }
        .card-bottom-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
        }
        @media (min-width: 900px) {
          .card-bottom-row {
            grid-template-columns: 1.4fr auto;
            align-items: flex-end;
          }
        }
        .card-desc {
          color: var(--mute) !important;
          font-size: 1.05rem;
          max-width: 48ch;
          line-height: 1.45;
        }
        .card-tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .card-tag {
          padding: 6px 12px;
          border: 1px solid var(--line);
          color: var(--ink) !important;
        }

        .numbers-grid {
          display: grid;
          grid-template-columns: 1fr;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        @media (min-width: 600px) {
          .numbers-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .numbers-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .stat-cell {
          padding: clamp(36px, 5vw, 64px) clamp(20px, 3vw, 36px);
          border-bottom: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        @media (min-width: 600px) {
          .stat-cell:nth-child(odd) { border-right: 1px solid var(--line); }
        }
        @media (min-width: 1024px) {
          .stat-cell {
            border-bottom: none;
            border-right: 1px solid var(--line);
          }
          .stat-cell:last-child { border-right: none; }
        }

        .stat-number {
          font-family: var(--font-serif) !important;
          font-size: clamp(3.8rem, 8.5vw, 9.2rem);
          line-height: 0.9;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
          color: var(--ink) !important;
        }
        .stat-label {
          color: var(--mute) !important;
          font-size: 0.82rem;
          line-height: 1.4;
          max-width: 22ch;
        }

        .editorial-quote {
          font-family: var(--font-serif) !important;
          font-size: clamp(2.3rem, 5.6vw, 5.8rem);
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: clamp(36px, 5vw, 60px);
          max-width: 24ch;
          color: var(--ink) !important;
        }
        .quote-attribution { color: var(--mute) !important; }

        .pricing-header-wrap {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin-bottom: clamp(48px, 7vw, 84px);
        }
        @media (min-width: 900px) {
          .pricing-header-wrap {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }

        .pricing-toggle {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          border: 1px solid var(--line);
          padding: 10px 18px;
        }
        .pricing-toggle-btn {
          color: var(--mute) !important;
          font-size: 0.78rem;
          position: relative;
          padding-bottom: 3px;
          transition: color 0.25s var(--ease);
        }
        .pricing-toggle-btn.active { color: var(--ink) !important; }
        .pricing-toggle-btn.active::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 1px;
          background-color: var(--ink);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr;
          border: 1px solid var(--line);
        }
        @media (min-width: 900px) {
          .pricing-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .pricing-card {
          padding: clamp(36px, 4.5vw, 56px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-bottom: 1px solid var(--line);
          background-color: var(--paper) !important;
          color: var(--ink) !important;
        }
        @media (min-width: 900px) {
          .pricing-card {
            border-bottom: none;
            border-right: 1px solid var(--line);
          }
          .pricing-card:last-child { border-right: none; }
        }

        /* Featured Inverted Tier */
        .pricing-card.featured {
          background-color: var(--ink) !important;
          color: var(--paper) !important;
        }
        .pricing-card.featured .pricing-amount,
        .pricing-card.featured .pricing-feature-item {
          color: var(--paper) !important;
        }
        .pricing-card.featured .pricing-desc,
        .pricing-card.featured .pricing-period {
          color: var(--paper) !important;
          opacity: 0.75;
        }
        .pricing-card.featured .pricing-card-header,
        .pricing-card.featured .pricing-feature-item {
          border-color: rgba(241, 239, 233, 0.18);
        }

        .pricing-card-header {
          padding-bottom: 32px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 32px;
        }
        .pricing-tier-name { margin-bottom: 16px; color: var(--ink) !important; }
        .pricing-price-wrap {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 12px;
        }
        .pricing-amount {
          font-family: var(--font-serif) !important;
          font-size: clamp(3rem, 5.5vw, 4.8rem);
          line-height: 1;
          letter-spacing: -0.02em;
          transition: opacity 0.25s var(--ease);
          color: var(--ink) !important;
        }
        .pricing-amount.updating { opacity: 0.2; }
        .pricing-period { color: var(--mute) !important; }
        .pricing-desc {
          color: var(--mute) !important;
          font-size: 0.92rem;
          line-height: 1.4;
          min-height: 40px;
        }

        .pricing-features {
          list-style: none;
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pricing-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          color: var(--ink) !important;
        }
        .pricing-check {
          color: var(--signal) !important;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .faq-list {
          border-top: 1px solid var(--line);
          margin-top: clamp(40px, 6vw, 68px);
        }
        .faq-item { border-bottom: 1px solid var(--line); }
        .faq-trigger {
          width: 100%;
          text-align: left;
          padding: clamp(28px, 3.5vw, 40px) 0;
          display: grid;
          grid-template-columns: 48px 1fr 32px;
          align-items: center;
          gap: 16px;
          cursor: pointer;
        }
        .faq-index { color: var(--mute) !important; }
        .faq-question {
          font-family: var(--font-serif) !important;
          font-size: clamp(1.5rem, 3.2vw, 2.3rem);
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--ink) !important;
        }
        .faq-icon {
          font-family: var(--font-mono);
          font-size: 1.35rem;
          text-align: right;
          color: var(--ink) !important;
          transition: transform 0.4s var(--ease);
          display: inline-block;
        }
        .faq-item.open .faq-icon {
          transform: rotate(45deg);
          color: var(--signal) !important;
        }

        .faq-answer-grid {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.5s var(--ease);
        }
        .faq-item.open .faq-answer-grid { grid-template-rows: 1fr; }
        .faq-answer-inner { overflow: hidden; }
        .faq-answer-content {
          padding-left: 64px;
          padding-bottom: clamp(28px, 4vw, 40px);
          color: var(--mute) !important;
          font-size: 1.05rem;
          line-height: 1.55;
          max-width: 64ch;
        }
        @media (max-width: 768px) {
          .faq-answer-content { padding-left: 0; }
        }

        section#cta {
          border-bottom: 1px solid var(--line);
          text-align: center;
          padding-top: clamp(120px, 18vw, 240px);
          padding-bottom: clamp(120px, 18vw, 240px);
        }
        .cta-big-line {
          font-family: var(--font-serif) !important;
          font-size: clamp(3.2rem, 9.5vw, 9.8rem);
          line-height: 0.95;
          letter-spacing: -0.025em;
          margin-bottom: clamp(40px, 6vw, 64px);
          color: var(--ink) !important;
        }
        .cta-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .cta-microcopy {
          color: var(--mute) !important;
          font-size: 0.78rem;
        }

        footer#site-footer {
          padding-top: clamp(80px, 12vw, 140px);
          padding-bottom: clamp(36px, 6vw, 60px);
          background-color: var(--paper) !important;
          position: relative;
          overflow: hidden;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          padding-bottom: clamp(60px, 10vw, 120px);
          border-bottom: 1px solid var(--line);
        }
        @media (min-width: 768px) {
          .footer-grid { grid-template-columns: 1.2fr 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .footer-grid { grid-template-columns: 2fr 1fr 1fr 1.5fr; }
        }

        .footer-col-title {
          color: var(--mute) !important;
          margin-bottom: 24px;
        }
        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .footer-links a {
          color: var(--ink) !important;
          font-size: 0.8rem;
          transition: color 0.2s var(--ease);
          min-height: 24px;
          display: inline-flex;
          align-items: center;
        }
        .footer-links a:hover { color: var(--signal) !important; }

        .newsletter-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .newsletter-input-wrap {
          position: relative;
          display: flex;
        }
        .newsletter-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--line);
          color: var(--ink) !important;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          padding: 12px 0;
          border-radius: 0;
          outline: none;
          transition: border-color 0.25s var(--ease);
        }
        .newsletter-input:focus { border-bottom-color: var(--signal) !important; }
        .newsletter-input::placeholder { color: var(--mute) !important; }
        .newsletter-submit {
          position: absolute;
          right: 0;
          bottom: 12px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--ink) !important;
          transition: color 0.25s var(--ease);
        }
        .newsletter-submit:hover { color: var(--signal) !important; }
        .newsletter-msg {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          letter-spacing: 0.04em;
          min-height: 18px;
        }
        .newsletter-msg.error { color: var(--signal) !important; }
        .newsletter-msg.success { color: var(--ink) !important; }

        .footer-giant-wordmark-wrap {
          padding-top: clamp(40px, 8vw, 80px);
          overflow: hidden;
          width: 100%;
        }
        .footer-giant-wordmark {
          font-family: var(--font-serif) !important;
          font-size: clamp(3.2rem, 24vw, 24rem);
          line-height: 0.82;
          letter-spacing: -0.035em;
          white-space: nowrap;
          color: var(--ink) !important;
          display: block;
          width: 100%;
          text-align: center;
          transform: translateY(105%);
          transition: transform 1.2s var(--ease);
        }
        .footer-giant-wordmark.revealed { transform: translateY(0); }

        .footer-meta-bottom {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 32px;
          color: var(--mute) !important;
          font-size: 0.75rem;
        }
        @media (min-width: 768px) {
          .footer-meta-bottom {
            flex-direction: row;
            justify-content: space-between;
          }
        }

        @media (max-width: 899px) {
          .desktop-nav { display: none; }
          .mobile-menu-btn { display: inline-flex; align-items: center; }
          .hero-guides { grid-template-columns: repeat(2, 1fr); }
          .hero-guides .hero-guide-line:nth-child(3),
          .hero-guides .hero-guide-line:nth-child(4) {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .blackfighters-editorial-root *,
          .blackfighters-editorial-root *::before,
          .blackfighters-editorial-root *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          .hero-line-inner { transform: none !important; }
          .hero-guides .hero-guide-line { transform: none !important; }
          .reveal-on-scroll { opacity: 1 !important; transform: none !important; }
          .manifesto-word { opacity: 1 !important; }
          .footer-giant-wordmark { transform: none !important; }
          #cursor-dot { display: none !important; }
          .ticker-track { animation: none !important; }
        }
      `}</style>

      {/* Accessible Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Top Reading Progress Bar */}
      <div id="progress-line" ref={progressLineRef} aria-hidden="true" />

      {/* Signal Cursor Dot */}
      <div id="cursor-dot" ref={cursorDotRef} aria-hidden="true" />

      {/* Fixed Header */}
      <header id="site-header" ref={headerRef} role="banner">
        <div className="container header-inner">
          <Link to="/" className="brand-wordmark" aria-label="Black Fighters Home">
            Black Fighters<span className="signal-dot">.</span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#work">Capabilities</a>
            <a href="#process">Methodology</a>
            <a href="#numbers">Telemetry</a>
            <a href="#pricing">Tiers</a>
            <a href="#faq">Inquiries</a>
          </nav>

          <div className="header-controls">
            <Link
              to={authTarget}
              className="btn-pill btn-pill-sm"
            >
              {user ? 'Dashboard' : 'Start Free →'}
            </Link>

            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              type="button"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>

            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              type="button"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fullscreen Overlay */}
      <div
        id="mobile-menu-overlay"
        className={mobileMenuOpen ? 'open' : ''}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="mobile-menu-head">
          <span className="brand-wordmark">
            Black Fighters<span className="signal-dot">.</span>
          </span>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            type="button"
          >
            Close
          </button>
        </div>

        <nav className="mobile-nav-links" aria-label="Mobile links">
          <a href="#work" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            Capabilities
          </a>
          <a href="#process" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            Methodology
          </a>
          <a href="#numbers" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            Telemetry
          </a>
          <a href="#pricing" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            Tiers
          </a>
          <a href="#faq" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
            Inquiries
          </a>
          <Link
            to={authTarget}
            className="mobile-nav-link text-signal"
            onClick={() => setMobileMenuOpen(false)}
          >
            {user ? 'Open Dashboard' : 'Start Free →'}
          </Link>
        </nav>

        <div className="mobile-menu-foot">
          <span className="mono">Clinical Intelligence · Est. 2024</span>
          <button className="theme-toggle" onClick={toggleTheme} type="button">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      <main id="main-content">
        {/* HERO SECTION */}
        <section id="hero" className="editorial-section" aria-labelledby="hero-heading">
          <div className="hero-guides" ref={heroGuidesRef} aria-hidden="true">
            <div className="hero-guide-line" />
            <div className="hero-guide-line" />
            <div className="hero-guide-line" />
            <div className="hero-guide-line" />
          </div>

          <div className="container hero-content">
            <div className="hero-meta-row mono">
              <span>(01)</span>
              <span>The cognitive study layer for medicine</span>
              <span>Est. 2024</span>
            </div>

            <h1 id="hero-heading" className="hero-headline" ref={heroHeadlineRef}>
              <span className="hero-line-mask">
                <span className="hero-line-inner">Compress dense textbooks.</span>
              </span>
              <span className="hero-line-mask">
                <span className="hero-line-inner">
                  Retain <em className="signal-text">everything.</em>
                </span>
              </span>
            </h1>

            <div className="hero-bottom-row">
              <p className="hero-lede">
                Black Fighters synthesizes 1,000-page clinical references and raw lecture decks into
                structured, citation-backed intelligence, active-recall quizzes, and synchronized
                spaced repetition.
              </p>
              <div className="hero-actions">
                <Link to={authTarget} className="btn-pill" data-magnet>
                  {user ? 'Go to Dashboard' : 'Start studying free →'}
                </Link>
                <a href="#manifesto" className="hero-link">
                  See the methodology
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* TICKER SECTION */}
        <div className="ticker-wrap" aria-hidden="true">
          <div className="ticker-track">
            <div className="ticker-group">
              <span className="ticker-item">1,000-Page Textbook Engine</span>
              <span className="ticker-item">Page-Level Citations</span>
              <span className="ticker-item">Clinical Dosage Verifier</span>
              <span className="ticker-item">FSRS Spaced Repetition</span>
              <span className="ticker-item">Telegram Bot Auto-Sync</span>
              <span className="ticker-item">Prerequisite Bridges</span>
              <span className="ticker-item">Credit Ledger Protection</span>
              <span className="ticker-item">Clinical Reasoning Banks</span>
            </div>
            <div className="ticker-group">
              <span className="ticker-item">1,000-Page Textbook Engine</span>
              <span className="ticker-item">Page-Level Citations</span>
              <span className="ticker-item">Clinical Dosage Verifier</span>
              <span className="ticker-item">FSRS Spaced Repetition</span>
              <span className="ticker-item">Telegram Bot Auto-Sync</span>
              <span className="ticker-item">Prerequisite Bridges</span>
              <span className="ticker-item">Credit Ledger Protection</span>
              <span className="ticker-item">Clinical Reasoning Banks</span>
            </div>
          </div>
        </div>

        {/* MANIFESTO SECTION */}
        <section id="manifesto" className="editorial-section" aria-labelledby="manifesto-heading">
          <div className="container">
            <div className="manifesto-label mono">(02) THE THESIS</div>
            <h2 id="manifesto-heading" className="sr-only-hidden">
              Our Thesis
            </h2>
            <p className="manifesto-text" ref={manifestoRef}>
              Medical students and clinicians do not struggle from a lack of information. They drown
              in unrefined volume. When every examination demands thousands of complex slides,
              passive reading is quiet surrender. Black Fighters reconstructs raw syllabi into
              verifiable, foundational principles, so deep clinical comprehension becomes an{' '}
              <em className="signal-text">inherent truth.</em> Every claim cited. Every dosage
              confirmed.
            </p>
          </div>
        </section>

        {/* CAPABILITIES INDEX SECTION */}
        <section
          id="work"
          className="editorial-section reveal-on-scroll"
          aria-labelledby="capabilities-heading"
        >
          <div className="container">
            <div className="section-header-row">
              <div className="section-label mono">Capabilities</div>
              <h2 id="capabilities-heading" className="section-headline">
                Four pillars, <em className="signal-text">one</em> source of truth.
              </h2>
            </div>

            <div className="capabilities-list" role="list">
              <div className="capability-row" role="listitem" tabIndex={0}>
                <span className="cap-index mono">01</span>
                <h3 className="cap-title serif">Textbook & Lecture Synthesis</h3>
                <p className="cap-desc">
                  Partition documents up to 1,000 pages into modular chapters with preserved page
                  numbers and locked medical terminology.
                </p>
                <span className="cap-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              <div className="capability-row" role="listitem" tabIndex={0}>
                <span className="cap-index mono">02</span>
                <h3 className="cap-title serif">Prerequisite Scaffolding</h3>
                <p className="cap-desc">
                  The 'Before You Read' protocol explains physiological mechanisms from the ground up
                  before diving into complex pharmacology.
                </p>
                <span className="cap-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              <div className="capability-row" role="listitem" tabIndex={0}>
                <span className="cap-index mono">03</span>
                <h3 className="cap-title serif">Clinical Active Recall</h3>
                <p className="cap-desc">
                  Auto-generate diagnostic case dilemmas, evidence-based reasoning scenarios, and FSRS
                  spaced repetition cards directly from source pages.
                </p>
                <span className="cap-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              <div className="capability-row" role="listitem" tabIndex={0}>
                <span className="cap-index mono">04</span>
                <h3 className="cap-title serif">Autonomous Telegram Sync</h3>
                <p className="cap-desc">
                  Receive formatted briefings, offline high-resolution PDF exports, and interactive
                  revision quizzes directly in your mobile messaging inbox.
                </p>
                <span className="cap-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PROCESS SECTION */}
        <section id="process" className="editorial-section" aria-labelledby="process-heading">
          <div className="container">
            <div className="section-header-row reveal-on-scroll">
              <div className="section-label mono">Methodology</div>
              <h2 id="process-heading" className="section-headline">
                Three steps. <em className="signal-text">Zero cognitive waste.</em>
              </h2>
            </div>

            <div className="process-cards-stack">
              <article className="process-card" aria-label="Step 1: Ingest">
                <div className="card-top-row mono">
                  <span>STEP 01</span>
                  <span>INGEST</span>
                </div>
                <h3 className="card-headline">
                  Upload dense textbooks and slides up to 1,000 pages with{' '}
                  <em className="signal-text">zero</em> context loss.
                </h3>
                <div className="card-bottom-row">
                  <p className="card-desc">
                    Our OCR and semantic document engine partitions vast medical syllabi into
                    coherent modules while locking core clinical terminology and dosage tables.
                  </p>
                  <div className="card-tags mono">
                    <span className="card-tag">1,000-Page Buffer</span>
                    <span className="card-tag">Semantic Chunking</span>
                  </div>
                </div>
              </article>

              <article className="process-card" aria-label="Step 2: Synthesize">
                <div className="card-top-row mono">
                  <span>STEP 02</span>
                  <span>SYNTHESIZE</span>
                </div>
                <h3 className="card-headline">
                  Our medical reasoning model structures every chapter with verifiable citations and{' '}
                  <em className="signal-text">grounded</em> facts.
                </h3>
                <div className="card-bottom-row">
                  <p className="card-desc">
                    Every physiological mechanism, diagnostic criterion, and drug interaction is
                    linked bi-directionally to its source textbook page.
                  </p>
                  <div className="card-tags mono">
                    <span className="card-tag">Page Citations</span>
                    <span className="card-tag">Dosage Verifier</span>
                  </div>
                </div>
              </article>

              <article className="process-card" aria-label="Step 3: Retain">
                <div className="card-top-row mono">
                  <span>STEP 03</span>
                  <span>RETAIN</span>
                </div>
                <h3 className="card-headline">
                  Transition from passive reading into active recall across web and Telegram with{' '}
                  <em className="signal-text">FSRS</em> algorithms.
                </h3>
                <div className="card-bottom-row">
                  <p className="card-desc">
                    Calculated memory decay intervals schedule your quizzes and flashcards so
                    high-yield clinical facts survive long past exam day.
                  </p>
                  <div className="card-tags mono">
                    <span className="card-tag">FSRS Spaced Repetition</span>
                    <span className="card-tag">Telegram Bot Sync</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* NUMBERS SECTION */}
        <section id="numbers" className="editorial-section" aria-labelledby="numbers-heading">
          <div className="container">
            <div className="section-header-row reveal-on-scroll">
              <div className="section-label mono">Telemetry</div>
              <h2 id="numbers-heading" className="section-headline">
                Proven in <em className="signal-text">academic hospitals.</em>
              </h2>
            </div>

            <div className="numbers-grid reveal-on-scroll">
              <div className="stat-cell">
                <div className="stat-number" data-target="1000" data-suffix="">
                  0
                </div>
                <div className="stat-label mono">Max pages per single textbook upload.</div>
              </div>
              <div className="stat-cell">
                <div className="stat-number" data-target="99" data-suffix="%">
                  0%
                </div>
                <div className="stat-label mono">Citation grounding & factual trace accuracy.</div>
              </div>
              <div className="stat-cell">
                <div className="stat-number" data-target="14" data-suffix="h">
                  0h
                </div>
                <div className="stat-label mono">Average study hours saved weekly per student.</div>
              </div>
              <div className="stat-cell">
                <div className="stat-number" data-target="28" data-suffix="+">
                  0+
                </div>
                <div className="stat-label mono">Clinical specialties and subject modules.</div>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE SECTION */}
        <section
          id="quote"
          className="editorial-section reveal-on-scroll"
          aria-labelledby="quote-heading"
        >
          <div className="container">
            <h2 id="quote-heading" className="sr-only-hidden">
              Testimonial
            </h2>
            <blockquote className="editorial-quote">
              “We replaced five fragmented study tools and pre-exam all-nighters with one structured
              system. Now our students understand the physiological reasons, not just the slides,
              and the <em className="signal-text">evidence</em> remains verifiable at the bedside.”
            </blockquote>
            <div className="quote-attribution mono">
              Prof. K. Mansour — Clinical Education Fellow & Medical Resident Lead
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="editorial-section" aria-labelledby="pricing-heading">
          <div className="container">
            <div className="pricing-header-wrap reveal-on-scroll">
              <div>
                <div className="section-label mono">Pricing</div>
                <h2 id="pricing-heading" className="section-headline">
                  Plain prices. <em className="signal-text">Guaranteed credits.</em>
                </h2>
              </div>

              <div className="pricing-toggle mono" role="radiogroup" aria-label="Billing cycle selector">
                <button
                  className={`pricing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                  onClick={() => handleBillingToggle('monthly')}
                  type="button"
                  role="radio"
                  aria-checked={billingCycle === 'monthly'}
                >
                  Monthly
                </button>
                <button
                  className={`pricing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                  onClick={() => handleBillingToggle('annual')}
                  type="button"
                  role="radio"
                  aria-checked={billingCycle === 'annual'}
                >
                  Annual (25% Savings)
                </button>
              </div>
            </div>

            <div className="pricing-grid reveal-on-scroll">
              {/* Starter */}
              <div className="pricing-card">
                <div>
                  <div className="pricing-card-header">
                    <div className="pricing-tier-name mono">Starter</div>
                    <div className="pricing-price-wrap">
                      <span className={`pricing-amount ${pricesUpdating ? 'updating' : ''}`}>
                        {pricingData[billingCycle].starter}
                      </span>
                      <span className="pricing-period mono">/ month</span>
                    </div>
                    <p className="pricing-desc">
                      Essential lecture synthesis and active recall for individual students.
                    </p>
                  </div>

                  <ul className="pricing-features">
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Core lecture & slide summaries
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Foundational 'Before You Read' boxes
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Daily FSRS flashcard reviews
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Standard web reader with dark mode
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Community support
                    </li>
                  </ul>
                </div>
                <Link
                  to={authTarget}
                  className="btn-pill btn-pill-outline"
                >
                  Start studying free
                </Link>
              </div>

              {/* Pro Fighter (Featured Inverted) */}
              <div className="pricing-card featured">
                <div>
                  <div className="pricing-card-header">
                    <div className="pricing-tier-name mono text-signal">
                      Pro Fighter · Preferred
                    </div>
                    <div className="pricing-price-wrap">
                      <span className={`pricing-amount ${pricesUpdating ? 'updating' : ''}`}>
                        {pricingData[billingCycle].pro}
                      </span>
                      <span className="pricing-period mono opacity-80">
                        / month
                      </span>
                    </div>
                    <p className="pricing-desc">
                      For clinical students and demanding academic semesters.
                    </p>
                  </div>

                  <ul className="pricing-features">
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> 900 monthly AI credits
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> 1,000-page textbook engine
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Page-level citations & dosage verifier
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Unlimited PDF, HTML, & Telegram export
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Two-way Telegram bot synchronization
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Clinical reasoning case quizzes
                    </li>
                  </ul>
                </div>
                <Link to={authTarget} className="btn-pill w-full">
                  Choose Pro Fighter
                </Link>
              </div>

              {/* Supreme Max */}
              <div className="pricing-card">
                <div>
                  <div className="pricing-card-header">
                    <div className="pricing-tier-name mono">Supreme Max</div>
                    <div className="pricing-price-wrap">
                      <span className={`pricing-amount ${pricesUpdating ? 'updating' : ''}`}>
                        {pricingData[billingCycle].supreme}
                      </span>
                      <span className="pricing-period mono">/ month</span>
                    </div>
                    <p className="pricing-desc">
                      For residents, board candidates, and study group leaders.
                    </p>
                  </div>

                  <ul className="pricing-features">
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> 2,500 monthly AI credits
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Priority processing queue (zero wait)
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Full Telegram Mini App integration
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Emergency round clinical simulations
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Double-entry ledger credit insurance
                    </li>
                    <li className="pricing-feature-item">
                      <span className="pricing-check" aria-hidden="true">✓</span> Dedicated priority academic support
                    </li>
                  </ul>
                </div>
                <Link
                  to={authTarget}
                  className="btn-pill btn-pill-outline"
                >
                  Choose Supreme Max
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* QUESTIONS (FAQ) SECTION */}
        <section id="faq" className="editorial-section" aria-labelledby="faq-heading">
          <div className="container">
            <div className="section-header-row reveal-on-scroll">
              <div className="section-label mono">Questions</div>
              <h2 id="faq-heading" className="section-headline">
                Asked, <em className="signal-text">answered.</em>
              </h2>
            </div>

            <div className="faq-list reveal-on-scroll">
              {[
                {
                  idx: '01',
                  q: 'How does Black Fighters summarize 1,000-page textbooks without losing critical details?',
                  a: 'Large files are partitioned into coordinated chapters with a locked terminology index. Rather than compressing blindly, our architecture preserves every clinical criterion and links each paragraph directly to its source PDF page.',
                },
                {
                  idx: '02',
                  q: "What is the 'Before You Read' foundational bridge?",
                  a: 'Before diving into dense clinical manifestations or pharmacodynamics, each chapter opens with an intuitive prerequisite framework. It clarifies the core physiological mechanism in simple language while preserving exact medical terminology.',
                },
                {
                  idx: '03',
                  q: 'How does the Telegram bot integrate with my account?',
                  a: 'You link your Telegram account with one click. Once a lecture or textbook finishes synthesizing, the bot notifies you, delivers offline PDF documents, and generates interactive quizzes you can solve directly in chat.',
                },
                {
                  idx: '04',
                  q: 'Are credits refunded if a document processing task fails?',
                  a: 'Yes, completely. All credit transactions use a double-entry ledger. Credits are only reserved when a job begins and are automatically restored to your account if any chapter fails or times out.',
                },
                {
                  idx: '05',
                  q: 'Can I export my study materials to PDF and flashcard decks?',
                  a: 'Yes. All summaries can be downloaded as print-ready, high-resolution PDFs, standalone HTML documents, or exported directly into active-recall quizzes and FSRS spaced repetition schedules.',
                },
              ].map((item, i) => (
                <div key={item.idx} className={`faq-item ${openFaqIndex === i ? 'open' : ''}`}>
                  <button
                    className="faq-trigger"
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    aria-expanded={openFaqIndex === i}
                  >
                    <span className="faq-index mono">{item.idx}</span>
                    <span className="faq-question">{item.q}</span>
                    <span className="faq-icon" aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div className="faq-answer-grid">
                    <div className="faq-answer-inner">
                      <p className="faq-answer-content">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section id="cta" className="editorial-section" aria-labelledby="cta-heading">
          <div className="container reveal-on-scroll">
            <h2 id="cta-heading" className="cta-big-line">
              Master medicine with <em className="signal-text">absolute</em> clarity.
            </h2>
            <div className="cta-actions">
              <Link
                to={authTarget}
                className="btn-pill btn-pill-lg"
                data-magnet
              >
                {user ? 'Open Dashboard' : 'Start studying with Black Fighters →'}
              </Link>
              <span className="cta-microcopy mono">
                No credit card required · Free credits included · Instant access
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer id="site-footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid reveal-on-scroll">
            <div>
              <div className="footer-col-title mono">Quarterly clinical briefings</div>
              <p className="mono newsletter-subtext">
                Selected methodology, research notes, and platform upgrades. No spam.
              </p>
              <form className="newsletter-form" onSubmit={handleNewsletterSubmit} noValidate>
                <div className="newsletter-input-wrap">
                  <input
                    type="email"
                    className="newsletter-input"
                    placeholder="Your academic email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    aria-label="Academic email address"
                  />
                  <button type="submit" className="newsletter-submit mono">
                    Send
                  </button>
                </div>
                {newsletterStatus.text && (
                  <div
                    className={`newsletter-msg mono ${newsletterStatus.type}`}
                    aria-live="polite"
                  >
                    {newsletterStatus.text}
                  </div>
                )}
              </form>
            </div>

            <div>
              <div className="footer-col-title mono">Capabilities</div>
              <ul className="footer-links mono">
                <li><a href="#work">Textbook Engine</a></li>
                <li><a href="#work">Citation Trace</a></li>
                <li><a href="#work">Clinical Quizzes</a></li>
                <li><a href="#work">FSRS Flashcards</a></li>
                <li><a href="#work">Telegram Bot</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title mono">Disciplines</div>
              <ul className="footer-links mono">
                <li><a href="#work">Internal Medicine</a></li>
                <li><a href="#work">Pharmacology</a></li>
                <li><a href="#work">General Surgery</a></li>
                <li><a href="#work">Physiology</a></li>
                <li><a href="#work">Pathology</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title mono">Platform</div>
              <p className="mono footer-direct-desc">
                Black Fighters organizes your medical curriculum into one quiet, verifiable intelligence surface.
              </p>
              <ul className="footer-links mono">
                <li><a href="#numbers">System Status</a></li>
                <li><a href="#pricing">Credit Ledger</a></li>
                <li><a href="/login">Emergency Round</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-giant-wordmark-wrap" aria-hidden="true">
            <span className="footer-giant-wordmark" ref={footerWordmarkRef}>
              Black Fighters.
            </span>
          </div>

          <div className="footer-meta-bottom mono">
            <span>© 2026 Black Fighters · All rights reserved</span>
            <span>
              <a href="#manifesto" className="footer-privacy-link">Privacy</a>
              <a href="#manifesto">Terms</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
