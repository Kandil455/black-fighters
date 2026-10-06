const MESSAGES = {
  'auth/invalid-credential': 'الإيميل أو كلمة المرور غير صحيحة',
  'auth/user-not-found': 'الإيميل أو كلمة المرور غير صحيحة',
  'auth/wrong-password': 'الإيميل أو كلمة المرور غير صحيحة',
  'auth/email-already-in-use': 'الإيميل ده متسجل بالفعل',
  'auth/weak-password': 'كلمة المرور ضعيفة؛ استخدم 8 أحرف على الأقل',
  'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
  'auth/too-many-requests': 'محاولات كثيرة؛ انتظر قليلًا ثم جرّب مرة أخرى',
  'auth/network-request-failed': 'تعذر الاتصال بخدمة تسجيل الدخول؛ افحص الإنترنت وحاول مجددًا',
  'auth/internal-error': 'خدمة تسجيل الدخول واجهت خطأ مؤقتًا؛ أعد المحاولة الآن',
  'auth/unauthorized-domain': 'دومين الموقع غير مصرح له في Firebase Auth',
  'auth/operation-not-allowed': 'طريقة تسجيل الدخول دي غير مفعلة حاليًا',
  'auth/popup-blocked': 'المتصفح منع نافذة Google؛ اسمح بالنوافذ المنبثقة وحاول مجددًا',
  'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية',
  'auth/cancelled-popup-request': 'تم إلغاء محاولة تسجيل الدخول السابقة',
};

export const RETRYABLE_AUTH_CODES = new Set([
  'auth/internal-error',
  'auth/network-request-failed',
  'auth/timeout',
]);

export function authErrorMessage(error, fallback = 'تعذر إكمال تسجيل الدخول') {
  if (error?.message === 'EMAIL_NOT_VERIFIED' || error?.code === 'EMAIL_NOT_VERIFIED') {
    return 'أكد بريدك من رسالة Black Fighters أولًا';
  }
  return MESSAGES[error?.code] || fallback;
}

export function friendlyAuthError(error, fallback) {
  const normalized = new Error(authErrorMessage(error, fallback));
  normalized.code = error?.code || 'auth/unknown';
  normalized.cause = error;
  return normalized;
}
