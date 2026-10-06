# تقرير الهوية البصرية الموحدة (LineVault Design System) — BLACK FIGHTERS

تم توحيد الهوية البصرية للمنصة بالكامل عبر الـ 31 صفحة على نظام تصميم واحد هادئ ونظيف مستوحى من **LineVault**، مع إزالة التضارب القديم بين هوية (Neon Cyberpunk / 3D) وهوية («الأطلس» الورقية)، والاحتفاظ الكامل بمحرك التلخيص الذكي، خوارزمية **FSRS v4.5**، والمدقق المزدوج (**Cross-Family Verifier**).

---

## 1) نظام التصميم الموحد (LineVault Design Tokens)

- **الخلفية الأساسية (`Background`)**: `#07090D` سادة بالكامل (تم إزالة كرات النيون المتحركة، الـ Mesh، والـ Grain، ومشهد الـ 3D).
- **سطح الكروت (`Card Surface`)**: `#0E1117` بحدود دقيقة `1px solid #1C222B` وزوايا `16px` (`rounded-2xl`) بدون ضبابية ثقيلة أو توهج نيون.
- **الكارت المرفوع (`Elevated / Hover`)**: `#131820` مع حد `#28313E`.
- **النصوص (`Typography`)**: النص الأساسي `#F2F4F7` • النص الثانوي `#8B94A3` • خط عربي موحد (`IBM Plex Sans Arabic`) وخط إنجليزي (`Inter`) وخط أرقام (`JetBrains Mono`).
- **اللون المميز الوحيد (`Single Accent`)**: الأخضر الزمردي الهادئ `#22E58B`.
- **ألوان الحالات (`Semantic Status`)**:
  - نجاح: `#22E58B`
  - تحذير: `#F5A524`
  - خطأ / خطر: `#F0545B`
- **الأزرار (`Buttons`)**:
  - الزر الرئيسي (`Primary`): خلفية مصمتة `#22E58B` ونص داكن `#07090D` بدون تدرجات لونية أو توهج، وزوايا `12px` (`rounded-xl`).
  - الزر الثانوي (`Secondary / Outline`): خلفية `#0E1117` وحد `#1C222B` ونص `#F2F4F7`.

---

## 2) مكتبة المكونات المشتركة ([src/components/ui/linevault.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/ui/linevault.jsx))

تم بناء مكتبة مكونات قياسية موحدة خالية تماماً من `style={{}}`:
- `PageHeader`: ترويسة الصفحة الموحدة (شارة اختيارية + عنوان + وصف + إجراء رئيسي واحد).
- `LVCard`: الكارت القياسي `#0E1117` بحد `#1C222B`.
- `LVBadge`: شارات الحالات (`default`, `accent`, `warning`, `danger`).
- `StatCard`: كارت الإحصائيات السريعة.
- `EmptyState`: حالة عدم وجود بيانات مع زر إجراء واضح.
- `PricingCard`: كارت الباقات الموحد.

---

## 3) أهم التعديلات الهيكلية على الصفحات والمكونات

1. **إزالة الخلفيات الثقيلة والأنيميشن المشتت**:
   - تحويل [NeonBackground.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/NeonBackground.jsx) إلى خلفية `#07090D` ثابتة ونظيفة.
   - توحيد جميع كلاسات `.ios-glass-card` و`.glass-card` و`.glass-panel` في [index.css](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/index.css) و[atlas-tokens.css](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/design/atlas-tokens.css) لترث تلقائياً ألوان وحدود LineVault في جميع الصفحات الـ 31.
2. **القائمة الجانبية والتنقل ([Layout.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/Layout.jsx) & [BottomTabBar.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/BottomTabBar.jsx))**:
   - تجميع عناصر القائمة الجانبية في **4 مجموعات واضحة فقط**: (`التعلّم` · `الأدوات` · `المجتمع` · `الحساب`).
   - إزالة الشارات الملونة الزائدة (`AI`, `EBE`, `OSCE`, `V5`, `FSRS`, `XP`, `TG`) وإزالة رابط `/atlas` التجريبي من القائمة الرئيسية.
   - توحيد الجزء السفلي من القائمة الجانبية في بلوك حساب واحد هادئ.
3. **لوحة التحكم ([Dashboard.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/Dashboard.jsx))**:
   - اختصار الصفحة من 778 سطراً و9 أقسام مزدحمة إلى **4 بلوكات مركزة**:
     1. ترحيب + زر «كمّل من حيث وقفت» (أو «أنشئ تلخيصاً جديداً»).
     2. «مهام النهاردة» ([DailyOrderSheet.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/atlas/DailyOrderSheet.jsx)) مربوطة ببيانات الطالب الفعلية من Firestore وبطاقات المراجعة المستحقة، مع إزالة الكورسات الطبية الوهمية (`فسيولوجيا القلب 92%`...).
     3. إحصائيات سريعة في صف واحد نظيف (الكورسات، المهام المكتملة، أيام الاستمرارية، XP).
     4. شبكة «كورساتي» مع بحث وفلترة سريعة.
4. **الصفحة الرئيسية ([Landing.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/Landing.jsx))**:
   - إزالة مشهد الـ 3D (`HellKnightScene`)، شريط الـ Marquee المتحرك، والكروت المائلة ثلاثية الأبعاد.
   - بناء صفحة هبوط هادئة ومقنعة: **Hero واضح + 3 خطوات + معاينة حية للقارئ ([LandingAtlasShowcase.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/atlas/LandingAtlasShowcase.jsx)) + ملخص الباقات + الأسئلة الشائعة**.
5. **صفحات الدخول والتسجيل ([Login.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/Login.jsx), [Register.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/Register.jsx), [ForgotPassword.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/ForgotPassword.jsx), [ResetPassword.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/ResetPassword.jsx))**:
   - كارت واحد متمركز في منتصف الشاشة `#0E1117` بحد `#1C222B` وحقول واضحة وزر رئيسي واحد `#22E58B`.
6. **قارئ الملخصات ([SummaryDocumentRenderer.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/course/SummaryDocumentRenderer.jsx) & [AtlasSummaryReader.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/atlas/AtlasSummaryReader.jsx))**:
   - إزالة أزرار التبديل المتضاربة («وضع الأطلس V5» و«التصميم الجديد Neon») وتوحيد القارئ في واجهة واحدة تدعم التبديل الهادئ بين الوضع المظلم والوضع الفاتح للطباعة، مع زر «إخفاء الإجابات» للاستدعاء النشط.
7. **صفحة الاشتراكات ([Subscriptions.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/pages/Subscriptions.jsx) & [PlanCard.jsx](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/subscriptions/PlanCard.jsx))**:
   - توحيد جميع كروت الباقات بنفس التصميم الهادئ `#0E1117`، وتمييز الباقة الموصى بها/المختارة بحد `#22E58B` فقط.
   - عرض 5–6 ميزات أساسية لكل باقة مع جدول «مقارنة الباقات» بالأسفل، وتثبيت ملخص الفاتورة في العمود الجانبي.
