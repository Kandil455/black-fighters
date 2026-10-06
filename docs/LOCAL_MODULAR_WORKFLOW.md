# مساحة التطوير المحلية المقسّمة

هذه النسخة مخصّصة للتطوير المحلي فقط: `/Users/ibrahimkandil/Desktop/peak-task-flow-local`.
لم يتم تعديل النسخة الأصلية: `/Users/ibrahimkandil/Desktop/peak-task-flow-new`.

| الجزء | نقطة البداية | الملفات التابعة |
| --- | --- | --- |
| النظري: كورسات، ملخصات، مراجعة | `src/app/routes/theoryRoutes.jsx` | `pages/CreateCourse.jsx`, `pages/CourseView.jsx`, `components/course/`, `lib/summary*` |
| العملي: PDF وصور وأسئلة عملية | `src/app/routes/practicalRoutes.jsx` | `pages/PdfTools.jsx`, `pages/ImageExtractor.jsx`, `components/imageExtractor/`, `components/pdf/` |
| الاختبارات والنتائج | `src/app/routes/assessmentRoutes.jsx` | `pages/Quizzes.jsx`, `components/quiz/`, `lib/quiz*` |
| المجتمع | `src/app/routes/communityRoutes.jsx` | `pages/Friends.jsx`, `pages/Groups.jsx`, `components/social/`, `components/groups/` |
| الحساب والدفع | `src/app/routes/accountRoutes.jsx` | `pages/Profile.jsx`, `pages/Settings.jsx`, `pages/Subscriptions.jsx` |
| الأدمن والطوارئ | `src/app/routes/systemRoutes.jsx` | `pages/Admin.jsx`, `pages/EmergencyHub.jsx`, `components/admin/` |
| الواجهة العامة | `src/components/Layout.jsx`, `src/components/ui/` | لا تضع منطق كورس أو كويز هنا |

## طريقة العمل

1. لأن ملفات الأسرار لا تدخل Git، انسخ `.env` و`.env.local` من النسخة الأصلية محلياً إذا احتاجت Firebase أو الـAPI، ولا تضفهما إلى Git.
2. شغّل النسخة المحلية: `npm run dev:local`.
3. عدّل feature واحدة فقط في كل مرة.
4. بعد كل جزء: `npm run check:local`.
5. احفظ كل feature في commit مستقل ثم راجع `git diff`.
6. لا يوجد نشر تلقائي. عندما تعتمد النتيجة فقط، ادمج فرع `local-modular-lab` في `main` أو انقل commit واحداً بعينه.

## تفكيك الصفحات الكبيرة

لا تنقل صفحة كاملة دفعة واحدة. أنشئ داخل الـfeature مجلدات `components/` و`hooks/` و`services/` و`screens/`، ثم انقل بطاقة أو hook واحداً واختبره. الصفحة الأصلية تصبح شاشة تجميع فقط؛ وبذلك يبقى أي crash محصوراً في جزء واحد.

## تعديلات النسخة الأصلية

الـworktree بدأ من آخر commit آمن، لذلك تعديلاتك غير المحفوظة في المشروع الأصلي لم تُنسخ إليه. هذا مقصود لحمايتها من التجارب. احفظها في commit منفصل ثم انقل ما تريد منها للنسخة المحلية بانتقائية.
