export const OWNER_EMAILS = [
  'ibrahimkandil000@gmail.com'
];

export function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

export function isOwnerEmail(email) {
  return OWNER_EMAILS.includes(normalizeEmail(email));
}

export function applyOwnerPrivileges(profileOrUser = {}) {
  const owner = isOwnerEmail(profileOrUser.email);
  if (!owner) return profileOrUser || {};
  return {
    ...profileOrUser,
    role: 'admin',
    subscription_plan: 'premium',
    subscription_status: 'active',
    subscription_label: profileOrUser.subscription_label || 'Owner Premium',
    subscription_color: profileOrUser.subscription_color || 'gold',
    daily_file_limit: 0,
    quiz_daily_limit: 0,
    feature_ai_chat: true,
    feature_pdf_tools: true,
    feature_quizzes: true,
    feature_flashcards: true,
    feature_animated_emoji: true,
    is_locked: false,
  };
}

export function canAccessSettings(profileOrUser = {}) {
  const p = applyOwnerPrivileges(profileOrUser || {});
  return p.role === 'admin' || p.subscription_plan === 'premium';
}
