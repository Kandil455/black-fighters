package site.blackfighters.app.security

import android.net.Uri

/**
 * Enforces strict isolation of the Student Android Application from any Admin
 * routes, endpoints, or privileges. The Admin dashboard is exclusively
 * accessible from the standalone web admin portal.
 */
object StudentAppSecurityGuard {

    private val BLOCKED_ADMIN_SEGMENTS = setOf(
        "admin",
        "adminconfig",
        "admin-payment-action",
        "generate-activation-codes",
        "adminanalytics",
        "paymentrequestsmanager"
    )

    private val ALLOWED_WEB_HOSTS = setOf(
        "blackfighters.site",
        "www.blackfighters.site",
        "iiiak-study-app.netlify.app",
        "accounts.google.com"
    )

    fun isUrlSafeForStudentApp(rawUrl: String?): Boolean {
        if (rawUrl.isNullOrBlank()) return false
        return try {
            val uri = Uri.parse(rawUrl)
            val scheme = uri.scheme?.lowercase() ?: return false
            if (scheme != "https" && scheme != "http") return false

            val pathSegments = uri.pathSegments.map { it.lowercase() }
            if (pathSegments.any { seg -> BLOCKED_ADMIN_SEGMENTS.any { blocked -> seg.contains(blocked) } }) {
                return false
            }

            val fullPath = (uri.path ?: "").lowercase()
            if (fullPath.contains("/admin") || fullPath.contains("admin-payment") || fullPath.contains("generate-activation")) {
                return false
            }

            val host = (uri.host ?: "").lowercase()
            ALLOWED_WEB_HOSTS.contains(host) || host.endsWith(".blackfighters.site") || host.endsWith(".run.app")
        } catch (_: Exception) {
            false
        }
    }

    fun sanitizeGeminiKey(rawKey: String): String {
        return rawKey.trim().replace("\"", "").replace("'", "").replace(" ", "")
    }

    fun isValidGeminiKeyFormat(rawKey: String): Boolean {
        val clean = sanitizeGeminiKey(rawKey)
        return clean.startsWith("AIza") && clean.length in 30..60 && clean.all {
            it.isLetterOrDigit() || it == '_' || it == '-'
        }
    }

    fun maskApiKey(rawKey: String): String {
        val clean = sanitizeGeminiKey(rawKey)
        if (clean.length < 12) return "غير مضبوط"
        return "${clean.take(7)}••••••••${clean.takeLast(4)}"
    }
}
