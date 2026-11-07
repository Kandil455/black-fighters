import { handler as adminPaymentAction } from "../netlify/functions/admin-payment-action.mjs";
import { handler as ai } from "../netlify/functions/ai.mjs";
import { handler as cancelSummaryJob } from "../netlify/functions/cancel-summary-job.mjs";
import { handler as chargeAiJob } from "../netlify/functions/charge-ai-job.mjs";
import { handler as deleteGeneratedContent } from "../netlify/functions/delete-generated-content.mjs";
import { handler as generateActivationCodes } from "../netlify/functions/generate-activation-codes.mjs";
import { handler as getSummaryDocument } from "../netlify/functions/get-summary-document.mjs";
import { handler as getSummaryJob } from "../netlify/functions/get-summary-job.mjs";
import { handler as listSummaryRevisions } from "../netlify/functions/list-summary-revisions.mjs";
import { handler as proxyMedia } from "../netlify/functions/proxy-media.mjs";
import { handler as purchaseCosmetic } from "../netlify/functions/purchase-cosmetic.mjs";
import { handler as quoteAiCost } from "../netlify/functions/quote-ai-cost.mjs";
import { handler as redeemCode } from "../netlify/functions/redeem-code.mjs";
import { handler as retrySummaryChunk } from "../netlify/functions/retry-summary-chunk.mjs";
import { handler as saveGeneratedContent } from "../netlify/functions/save-generated-content.mjs";
import { handler as saveSummaryDocument } from "../netlify/functions/save-summary-document.mjs";
import { handler as searchLicensedImages } from "../netlify/functions/search-licensed-images.mjs";
import { handler as seedMyQuizzes } from "../netlify/functions/seed-my-quizzes.mjs";
import { handler as startSummaryJob } from "../netlify/functions/start-summary-job.mjs";
import { handler as submitPayment } from "../netlify/functions/submit-payment.mjs";
import { handler as updateSummaryJob } from "../netlify/functions/update-summary-job.mjs";
import { handler as telegramWebhook } from "../netlify/functions/telegram-webhook.mjs";
import { handler as telegramBotStore } from "../netlify/functions/telegram-bot-store.mjs";
import { handler as telegramLink } from "../netlify/functions/telegram-link.mjs";
import { handler as telegramBridge } from "../netlify/functions/telegram-bridge.mjs";
import { handler as telegramMiniAppAuth } from "../netlify/functions/telegram-miniapp-auth.mjs";
import { handler as emailOtp } from "../netlify/functions/email-otp.mjs";
import { handler as deleteSummaryDocument } from "../netlify/functions/delete-summary-document.mjs";
import { handler as telegramUpload } from "../netlify/functions/telegram-upload.mjs";
import { handler as telegramManifest } from "../netlify/functions/telegram-manifest.mjs";
import { handler as telegramOutboxWorker } from "../netlify/functions/telegram-outbox-worker.mjs";
import { handler as exportToTelegram } from "../netlify/functions/export-to-telegram.mjs";
import { handler as youtubeTranscript } from "../netlify/functions/youtube-transcript.mjs";
import { handler as youtubeAiJob } from "../netlify/functions/youtube-ai-job.mjs";
import { handler as economyActions } from "../netlify/functions/economy-actions.mjs";
import { handler as certificates } from "../netlify/functions/certificates.mjs";
import { handler as socialActions } from "../netlify/functions/social-actions.mjs";
import { handler as profileActions } from "../netlify/functions/profile-actions.mjs";
import { handler as notifySignup } from "../netlify/functions/notify-signup.mjs";
import { handler as uploadMedia } from "../netlify/functions/upload-media.mjs";
import { handler as streamMedia } from "../netlify/functions/stream-media.mjs";
import { handler as awardProgress } from "../netlify/functions/award-progress.mjs";
import { handler as emergencyContent } from "../netlify/functions/emergency-content.mjs";
import { handler as lectureCreate } from "../netlify/functions/lecture-create.mjs";
import { handler as lectureChunkClaim } from "../netlify/functions/lecture-chunk-claim.mjs";
import { handler as lectureTranscribeChunk } from "../netlify/functions/lecture-transcribe-chunk.mjs";
import { handler as lectureFinalize } from "../netlify/functions/lecture-finalize.mjs";
import { handler as lectureOrganize } from "../netlify/functions/lecture-organize.mjs";
import { handler as lectureSummary } from "../netlify/functions/lecture-summary.mjs";
import { handler as lectureActions } from "../netlify/functions/lecture-actions.mjs";
import { handler as lectureCleanup } from "../netlify/functions/lecture-cleanup.mjs";
import { adaptNetlifyHandler, corsHeaders } from "./_netlify-adapter.mjs";

const ROUTES = new Map(
  Object.entries({
    "upload-media": uploadMedia,
    "stream-media": streamMedia,
    "award-progress": awardProgress,
    "emergency-content": emergencyContent,
    "admin-payment-action": adminPaymentAction,
    ai,
    "cancel-summary-job": cancelSummaryJob,
    "charge-ai-job": chargeAiJob,
    "delete-generated-content": deleteGeneratedContent,
    "delete-summary-document": deleteSummaryDocument,
    "generate-activation-codes": generateActivationCodes,
    "get-summary-document": getSummaryDocument,
    "get-summary-job": getSummaryJob,
    "list-summary-revisions": listSummaryRevisions,
    "proxy-media": proxyMedia,
    "purchase-cosmetic": purchaseCosmetic,
    "quote-ai-cost": quoteAiCost,
    "redeem-code": redeemCode,
    "retry-summary-chunk": retrySummaryChunk,
    "save-generated-content": saveGeneratedContent,
    "save-summary-document": saveSummaryDocument,
    "search-licensed-images": searchLicensedImages,
    "seed-my-quizzes": seedMyQuizzes,
    "start-summary-job": startSummaryJob,
    "submit-payment": submitPayment,
    "update-summary-job": updateSummaryJob,
    "telegram-webhook": telegramWebhook,
    "telegram-bot-store": telegramBotStore,
    "telegram-link": telegramLink,
    "telegram-bridge": telegramBridge,
    "telegram-miniapp-auth": telegramMiniAppAuth,
    "email-otp": emailOtp,
    "telegram-upload": telegramUpload,
    "telegram-manifest": telegramManifest,
    "telegram-outbox-worker": telegramOutboxWorker,
    "export-to-telegram": exportToTelegram,
    "youtube-transcript": youtubeTranscript,
    "youtube-ai-job": youtubeAiJob,
    "economy-actions": economyActions,
    certificates,
    "social-actions": socialActions,
    "profile-actions": profileActions,
    "notify-signup": notifySignup,
    "lecture-create": lectureCreate,
    "lecture-chunk-claim": lectureChunkClaim,
    "lecture-transcribe-chunk": lectureTranscribeChunk,
    "lecture-finalize": lectureFinalize,
    "lecture-organize": lectureOrganize,
    "lecture-summary": lectureSummary,
    "lecture-actions": lectureActions,
    "lecture-cleanup": lectureCleanup,
  }),
);

async function routeRequest(request) {
  const url = new URL(request.url);

  // Answer the CORS preflight here, once, instead of relying on 39 handlers to
  // each implement OPTIONS (only 6 did, so cross-origin calls were blocked).
  if (request.method === "OPTIONS") {
    const cors = corsHeaders(request);
    if (!cors["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  const routeName = url.pathname.replace(/^\/(?:\.netlify\/functions|api)\//, "").split("/")[0];
  const handler = ROUTES.get(routeName);

  if (!handler) {
    return new Response(JSON.stringify({ error: "not_found", route: routeName || null }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request) },
    });
  }

  return adaptNetlifyHandler(handler)(request);
}

export default { fetch: routeRequest };
