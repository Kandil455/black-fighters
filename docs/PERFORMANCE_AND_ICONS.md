# أداء المنصة — الأجهزة الضعيفة والأنيميشن

> كيف بنخلي المنصة سريعة على موبايل 2–4 جيجا رام، وإيه القواعد الثابتة.

## 1) طبقات القدرات (tiers)

مصدر واحد: `getDeviceTier()` في [src/lib/webglQuality.js](../src/lib/webglQuality.js) → `lite | balanced | full`.

| الطبقة | الشرط | السلوك |
|---|---|---|
| `lite` | `deviceMemory ≤ 4 && hardwareConcurrency ≤ 4`، أو GPU سوفتوير، أو `saveData`، أو شبكة 2G/3G | لا `backdrop-filter`، لا WebGL افتراضيًا، لا أنيميشن زخرفي |
| `balanced` | `≤ 8 cores` أو `≤ 8 GB` | أنيميشن شغّال، دقة 3D محدودة |
| `full` | غير كده | كله شغّال |

- `PerformanceContext` بيكتب `html[data-tier="..."]`، وCSS هي اللي بتطبّق الحاجات الثقيلة.
- **قيد متعمّد**: `prefers-reduced-motion` **مايدخلش** في تصنيف الجهاز — ده تفضيل إتاحة، وأجهزة قوية كتير بتفعّله. (عقد مثبّت في `tests/unit/perfModes.test.mjs`.)

## 2) الأنيميشن

- الأيقونات: مكوّن واحد [src/components/ui/icons.jsx](../src/components/ui/icons.jsx) فوق `lucide-react`.
- الحركة: `transform` / `opacity` فقط. ممنوع تحريك `filter` أو `box-shadow` أو `width`/`height` (كلها بتعيد الرسم على الـmain thread كل فريم).
- الصلاحية: `useMotionGate()` في [src/lib/motion.js](../src/lib/motion.js) → `{ enabled, duration, stagger }`.
- في القوائم والشبكات: `animated={false}` افتراضيًا. أيقونة بحركة لا نهائية في كل عنصر = الصفحة ما بتهدأش أبدًا.
- `html[data-tier="lite"]` و`html[data-performance="saver"]` بيوقفوا الحركة الزخرفية، و`prefers-reduced-motion` كذلك.

## 3) ميزانيات الحزمة

مثبّتة في [tests/unit/perfBudget.test.mjs](../tests/unit/perfBudget.test.mjs):

- entry chunk ≤ 700 KB (كان ~982 KB قبل التنظيف).
- أول تحميل ≤ 2400 KB.
- ممنوع دخول `three` / PDF / Office / tesseract في مسار الإقلاع (لازم يفضلوا lazy).
- ممنوع `lottie-react` / `gsap` / `lenis` كاعتماديات.

## 4) الأصول

| النوع | القاعدة |
|---|---|
| خلفيات الثيمات | WebP (كانت JPEG 780–960 KB → بقت 97–153 KB) |
| خطوط جوجل | 3 عائلات فقط، والمستخدمة بس (`Alexandria`, `Inter`, `JetBrains Mono`) |
| `public/downloads` (APK/PDF) | بره الـprecache، و`Cache-Control: immutable` |
| Lottie JSON | اتشال بالكامل (2.4 MB × 2 نسخة) |

## 5) القياس

```bash
npm run build                      # ينتج dist/ ويطبع عدد أصول الـprecache
npm test                           # بيتضمن عقود الأداء + ميزانية الحزمة
npx lighthouserc.json              # lighthouse (ملف الإعداد في الجذر)
```

اختبار يدوي لجهاز ضعيف: Chrome DevTools → Performance → CPU 4× throttle، و`deviceMemory` = 2 (من Application → Service Workers، أو عبر `--js-flags`)، ثم تأكد إن التنقل والقوائم ما بيعلقوش وإن الـtier اتحوّل لـ`lite` على عنصر `<html>`.

## 6) المكوّنات الميتة اللي اتشالت

`Meteors`, `Spotlight`, `BorderBeam`, `Marquee`, `TextScramble`, `DecryptedText`, `CanvasScrollSequence`, `CinematicPreloader`, `ScreenSlashTransition`, `HellKnight3DBackground`, `ThreeDGallery`, `DashboardExperiencePanel`, `Spline3DHero`, `NeuralCore3D`, `CinematicHoloVisualizer`, `StudyOrbit3D`, `SaturnCosmos3D` — كلها كانت غير موصولة (بعضها كان بيسحب `three.js` و`gsap` بلا داعي).
