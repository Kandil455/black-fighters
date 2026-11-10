package site.blackfighters.app.viewmodel

import android.app.Application
import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import site.blackfighters.app.data.GeminiAiClient
import site.blackfighters.app.model.AiChatMessage
import site.blackfighters.app.model.AiKeyPreference
import site.blackfighters.app.model.AppNotificationItem
import site.blackfighters.app.model.ComparisonPair
import site.blackfighters.app.model.DailyMission
import site.blackfighters.app.model.FlashcardItem
import site.blackfighters.app.model.InitialAcademicCatalog
import site.blackfighters.app.model.LectureItem
import site.blackfighters.app.model.MainTab
import site.blackfighters.app.model.QuizQuestion
import site.blackfighters.app.model.StudentProfile
import site.blackfighters.app.model.StudySummary
import site.blackfighters.app.notifications.NotificationHelper
import site.blackfighters.app.security.StudentAppSecurityGuard

data class AcademicUiState(
    val darkTheme: Boolean = false,
    val profile: StudentProfile = StudentProfile(
        fullName = "طالب جامعي",
        email = "student@university.edu",
        rankTitle = "طالب جامعي",
        level = 1,
        xp = 0,
        xpToNext = 300,
        streakDays = 1,
        credits = 25,
        isLoggedIn = false
    ),
    val currentTab: MainTab = MainTab.HOME,
    val readerFontScale: Float = 1.05f,
    val lectures: List<LectureItem> = InitialAcademicCatalog.defaultLectures,
    val selectedLectureId: String? = null,
    val summaries: List<StudySummary> = InitialAcademicCatalog.defaultSummaries,
    val selectedSummaryId: String? = null,
    val quizzes: List<QuizQuestion> = InitialAcademicCatalog.defaultQuizzes,
    val mistakeVaultIds: Set<String> = emptySet(),
    val flashcards: List<FlashcardItem> = InitialAcademicCatalog.defaultFlashcards,
    val missions: List<DailyMission> = InitialAcademicCatalog.defaultMissions,
    val pomodoroSeconds: Int = 25 * 60,
    val pomodoroRunning: Boolean = false,
    val aiMessages: List<AiChatMessage> = listOf(
        AiChatMessage(
            id = "welcome_1",
            senderIsUser = false,
            text = "أهلاً بك في المساعد الذكي! اكتب أي سؤال أو موضوع تدرسه في مادتك وسأشرحه لك ببساطة ووضوح.",
            timestampLabel = "الآن"
        )
    ),
    val showCloudPortal: Boolean = false,
    val isAiLoading: Boolean = false,
    val statusBanner: String? = null,
    val userGeminiKey: String = "",
    val keyPreference: AiKeyPreference = AiKeyPreference.AUTO_FALLBACK,
    val hasAdminPlatformKey: Boolean = GeminiAiClient.hasPlatformAutoKey(),
    val isTestingKey: Boolean = false,
    val keyTestResultMessage: String? = null,
    val showKeySettingsDialog: Boolean = false,
    val showSettingsScreen: Boolean = false,
    val notifications: List<AppNotificationItem> = InitialAcademicCatalog.defaultNotifications,
    val showNotificationsDialog: Boolean = false
) {
    val hasValidUserKey: Boolean
        get() = StudentAppSecurityGuard.isValidGeminiKeyFormat(userGeminiKey)

    val isAiReady: Boolean
        get() = when (keyPreference) {
            AiKeyPreference.USER_KEY_ONLY -> hasValidUserKey
            AiKeyPreference.AUTO_FALLBACK -> hasValidUserKey || hasAdminPlatformKey
        }

    val activeKeyModeLabel: String
        get() = when {
            hasValidUserKey -> "مفتاحك الشخصي (${StudentAppSecurityGuard.maskApiKey(userGeminiKey)})"
            keyPreference == AiKeyPreference.AUTO_FALLBACK && hasAdminPlatformKey -> "المفتاح التلقائي للمنصة مفعل"
            else -> "يلزم إدخال مفتاح Gemini"
        }

    val unreadNotificationsCount: Int
        get() = notifications.count { !it.isRead }
}

class AcademicViewModel(private val app: Application) : AndroidViewModel(app) {

    private val prefs = app.getSharedPreferences("black_fighters_academic_prefs", Context.MODE_PRIVATE)
    private val _uiState = MutableStateFlow(AcademicUiState())
    val uiState: StateFlow<AcademicUiState> = _uiState.asStateFlow()

    private var pomodoroJob: Job? = null

    private object Keys {
        const val DARK_THEME = "dark_theme"
        const val IS_LOGGED_IN = "is_logged_in"
        const val STUDENT_NAME = "student_name"
        const val STUDENT_EMAIL = "student_email"
        const val AUTH_PROVIDER = "auth_provider"
        const val XP_POINTS = "xp_points"
        const val STREAK_DAYS = "streak_days"
        const val CREDITS = "credits"
        const val FONT_SCALE = "font_scale"
        const val BOOKMARKED_SUMMARIES = "bookmarked_summaries"
        const val MISTAKE_VAULT_IDS = "mistake_vault_ids"
        const val USER_GEMINI_KEY = "user_gemini_api_key"
        const val KEY_PREFERENCE = "ai_key_preference"
    }

    init {
        NotificationHelper.ensureChannelCreated(app)
        val dark = prefs.getBoolean(Keys.DARK_THEME, false)
        val loggedIn = prefs.getBoolean(Keys.IS_LOGGED_IN, false)
        val name = prefs.getString(Keys.STUDENT_NAME, "طالب جامعي") ?: "طالب جامعي"
        val email = prefs.getString(Keys.STUDENT_EMAIL, "student@university.edu") ?: "student@university.edu"
        val provider = prefs.getString(Keys.AUTH_PROVIDER, "البريد الإلكتروني") ?: "البريد الإلكتروني"
        val xp = prefs.getInt(Keys.XP_POINTS, 0)
        val streak = prefs.getInt(Keys.STREAK_DAYS, 1)
        val credits = prefs.getInt(Keys.CREDITS, 25)
        val scale = prefs.getFloat(Keys.FONT_SCALE, 1.05f)
        val bookmarks = prefs.getStringSet(
            Keys.BOOKMARKED_SUMMARIES,
            emptySet()
        ) ?: emptySet()
        val mistakes = prefs.getStringSet(Keys.MISTAKE_VAULT_IDS, emptySet()) ?: emptySet()
        val savedUserKey = prefs.getString(Keys.USER_GEMINI_KEY, "") ?: ""
        val savedPrefName = prefs.getString(Keys.KEY_PREFERENCE, AiKeyPreference.AUTO_FALLBACK.name)
            ?: AiKeyPreference.AUTO_FALLBACK.name
        val keyPref = runCatching { AiKeyPreference.valueOf(savedPrefName) }
            .getOrDefault(AiKeyPreference.AUTO_FALLBACK)

        val computedLevel = (xp / 300) + 1
        val nextLevelXp = computedLevel * 300

        _uiState.update { state ->
            state.copy(
                darkTheme = dark,
                profile = state.profile.copy(
                    fullName = name,
                    email = email,
                    level = computedLevel,
                    xp = xp,
                    xpToNext = nextLevelXp,
                    streakDays = streak,
                    credits = credits,
                    isLoggedIn = loggedIn,
                    authProvider = provider
                ),
                readerFontScale = scale,
                userGeminiKey = savedUserKey,
                keyPreference = keyPref,
                hasAdminPlatformKey = GeminiAiClient.hasPlatformAutoKey(),
                summaries = state.summaries.map { s ->
                    s.copy(isBookmarked = s.id in bookmarks)
                },
                mistakeVaultIds = mistakes
            )
        }
    }

    fun toggleDarkTheme() {
        val nextDark = !_uiState.value.darkTheme
        _uiState.update { it.copy(darkTheme = nextDark) }
        prefs.edit().putBoolean(Keys.DARK_THEME, nextDark).apply()
    }

    fun toggleSettingsScreen(show: Boolean) {
        _uiState.update { it.copy(showSettingsScreen = show) }
    }

    fun loginWithCredentials(name: String, email: String) {
        val cleanEmail = email.trim().ifBlank { "student@university.edu" }
        val derivedName = name.trim().ifBlank {
            cleanEmail.substringBefore("@").replace(".", " ").ifBlank { "طالب جامعي" }
        }

        _uiState.update { state ->
            state.copy(
                profile = state.profile.copy(
                    fullName = derivedName,
                    email = cleanEmail,
                    isLoggedIn = true,
                    authProvider = "البريد الإلكتروني"
                ),
                statusBanner = "أهلاً بك يا $derivedName في التطبيق."
            )
        }
        prefs.edit()
            .putBoolean(Keys.IS_LOGGED_IN, true)
            .putString(Keys.STUDENT_NAME, derivedName)
            .putString(Keys.STUDENT_EMAIL, cleanEmail)
            .putString(Keys.AUTH_PROVIDER, "البريد الإلكتروني")
            .apply()
    }

    fun loginWithGoogle(name: String, email: String) {
        val cleanEmail = email.trim().ifBlank { "student@gmail.com" }
        val derivedName = name.trim().ifBlank {
            cleanEmail.substringBefore("@").replace(".", " ").ifBlank { "طالب Google" }
        }

        _uiState.update { state ->
            state.copy(
                profile = state.profile.copy(
                    fullName = derivedName,
                    email = cleanEmail,
                    isLoggedIn = true,
                    authProvider = "حساب Google"
                ),
                statusBanner = "تم تسجيل الدخول بحساب Google بنجاح! أهلاً بك يا $derivedName."
            )
        }
        prefs.edit()
            .putBoolean(Keys.IS_LOGGED_IN, true)
            .putString(Keys.STUDENT_NAME, derivedName)
            .putString(Keys.STUDENT_EMAIL, cleanEmail)
            .putString(Keys.AUTH_PROVIDER, "حساب Google")
            .apply()
    }

    fun logout() {
        pomodoroJob?.cancel()
        _uiState.update { state ->
            state.copy(
                profile = state.profile.copy(isLoggedIn = false),
                currentTab = MainTab.HOME,
                selectedLectureId = null,
                selectedSummaryId = null,
                showCloudPortal = false,
                showSettingsScreen = false,
                pomodoroRunning = false
            )
        }
        prefs.edit().putBoolean(Keys.IS_LOGGED_IN, false).apply()
    }

    fun selectTab(tab: MainTab) {
        _uiState.update {
            it.copy(
                currentTab = tab,
                selectedLectureId = if (tab != MainTab.LECTURES) null else it.selectedLectureId,
                selectedSummaryId = if (tab != MainTab.SUMMARIES) null else it.selectedSummaryId,
                showCloudPortal = false,
                showSettingsScreen = false
            )
        }
    }

    fun dismissBanner() {
        _uiState.update { it.copy(statusBanner = null) }
    }

    fun adjustFontScale(delta: Float) {
        val nextScale = (_uiState.value.readerFontScale + delta).coerceIn(0.85f, 1.45f)
        _uiState.update { it.copy(readerFontScale = nextScale) }
        prefs.edit().putFloat(Keys.FONT_SCALE, nextScale).apply()
    }

    // --- Gemini API Key Management ---
    fun toggleKeySettingsDialog(show: Boolean) {
        _uiState.update {
            it.copy(
                showKeySettingsDialog = show,
                keyTestResultMessage = if (!show) null else it.keyTestResultMessage
            )
        }
    }

    fun saveUserGeminiKey(rawKey: String, preference: AiKeyPreference) {
        val cleanKey = StudentAppSecurityGuard.sanitizeGeminiKey(rawKey)
        if (cleanKey.isNotEmpty() && !StudentAppSecurityGuard.isValidGeminiKeyFormat(cleanKey)) {
            _uiState.update {
                it.copy(
                    keyTestResultMessage = "صيغة المفتاح غير صحيحة. يجب أن يبدأ مفتاح Gemini بـ AIza."
                )
            }
            return
        }

        _uiState.update {
            it.copy(
                userGeminiKey = cleanKey,
                keyPreference = preference,
                keyTestResultMessage = if (cleanKey.isNotEmpty()) {
                    "تم حفظ مفتاح Gemini الشخصي بنجاح."
                } else {
                    "تم حفظ تفضيلات التشغيل التلقائي."
                },
                statusBanner = if (cleanKey.isNotEmpty()) {
                    "تم تفعيل مفتاح Gemini الشخصي لتفريغ وتلخيص المحاضرات."
                } else {
                    "تم تحديث إعدادات مفتاح الذكاء الاصطناعي."
                }
            )
        }

        prefs.edit()
            .putString(Keys.USER_GEMINI_KEY, cleanKey)
            .putString(Keys.KEY_PREFERENCE, preference.name)
            .apply()
    }

    fun clearUserGeminiKey() {
        _uiState.update {
            it.copy(
                userGeminiKey = "",
                keyPreference = AiKeyPreference.AUTO_FALLBACK,
                keyTestResultMessage = "تم مسح المفتاح الشخصي والعودة للوضع التلقائي."
            )
        }
        prefs.edit()
            .putString(Keys.USER_GEMINI_KEY, "")
            .putString(Keys.KEY_PREFERENCE, AiKeyPreference.AUTO_FALLBACK.name)
            .apply()
    }

    fun testUserGeminiKey(candidateKey: String) {
        if (_uiState.value.isTestingKey) return
        _uiState.update {
            it.copy(
                isTestingKey = true,
                keyTestResultMessage = "جاري فحص المفتاح مع خوادم Gemini..."
            )
        }
        viewModelScope.launch {
            val result = GeminiAiClient.verifyGeminiKey(candidateKey)
            result.onSuccess { msg ->
                _uiState.update {
                    it.copy(
                        isTestingKey = false,
                        keyTestResultMessage = msg
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isTestingKey = false,
                        keyTestResultMessage = err.message ?: "تعذر التحقق من المفتاح."
                    )
                }
            }
        }
    }

    // --- Notifications System (User & Admin Broadcasts) ---
    fun toggleNotificationsDialog(show: Boolean) {
        _uiState.update { it.copy(showNotificationsDialog = show) }
    }

    fun markAllNotificationsRead() {
        _uiState.update { state ->
            state.copy(
                notifications = state.notifications.map { it.copy(isRead = true) }
            )
        }
    }

    fun pushNotification(
        title: String,
        message: String,
        categoryLabel: String,
        isAdminBroadcast: Boolean = false
    ) {
        val item = AppNotificationItem(
            id = "notif_${System.currentTimeMillis()}",
            title = title,
            message = message,
            categoryLabel = categoryLabel,
            timeLabel = "الآن",
            isRead = false,
            isAdminBroadcast = isAdminBroadcast
        )
        _uiState.update { state ->
            state.copy(notifications = listOf(item) + state.notifications)
        }
        NotificationHelper.showSystemNotification(
            context = app,
            title = title,
            message = message,
            notificationId = (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
        )
    }

    fun triggerStudyReminderNotification() {
        pushNotification(
            title = "تذكير المذاكرة اليومية",
            message = "حان وقت مراجعة محاضراتك وملخصاتك اليومية.",
            categoryLabel = "منبه المذاكرة",
            isAdminBroadcast = false
        )
        _uiState.update {
            it.copy(statusBanner = "تم إرسال إشعار تذكير المذاكرة إلى جهازك بنجاح.")
        }
    }

    fun syncAdminBroadcastNotifications() {
        pushNotification(
            title = "إشعار من إدارة المنصة",
            message = "تم تحديث خدمات التفريغ والتلخيص لتعمل بأعلى سرعة.",
            categoryLabel = "إشعار عام",
            isAdminBroadcast = true
        )
        _uiState.update {
            it.copy(statusBanner = "تم تحديث الإشعارات بنجاح.")
        }
    }

    // --- Lectures & Transcription Section ---
    fun openLecture(lectureId: String?) {
        _uiState.update { it.copy(selectedLectureId = lectureId) }
    }

    fun transcribeLectureFromText(title: String, subject: String, rawText: String) {
        val state = _uiState.value
        if (!state.isAiReady) {
            _uiState.update {
                it.copy(
                    showKeySettingsDialog = true,
                    statusBanner = "يرجى إدخال مفتاح Gemini الخاص بك أولاً لتفريغ المحاضرات أو تفعيل الوضع التلقائي."
                )
            }
            return
        }
        if (rawText.trim().length < 15) {
            _uiState.update {
                it.copy(statusBanner = "يرجى إدخال نص المحاضرة أو الملاحظات بشكل كافٍ للتفريغ والتنظيم.")
            }
            return
        }

        _uiState.update {
            it.copy(
                isAiLoading = true,
                statusBanner = "جارٍ تفريغ وتنظيم المحاضرة في فقرات واضحة..."
            )
        }

        viewModelScope.launch {
            val cleanSubject = subject.trim().ifBlank { "مادة عامة" }
            val cleanTitle = title.trim().ifBlank { "محاضرة $cleanSubject" }
            val result = GeminiAiClient.transcribeAndOrganizeLecture(
                rawInput = rawText.trim(),
                audioBase64 = null,
                audioMimeType = null,
                title = cleanTitle,
                subject = cleanSubject,
                userKey = state.userGeminiKey,
                keyPreference = state.keyPreference,
                sourceTypeLabel = "تفريغ نصي منظم"
            )

            result.onSuccess { newLecture ->
                _uiState.update { current ->
                    current.copy(
                        isAiLoading = false,
                        lectures = listOf(newLecture) + current.lectures,
                        selectedLectureId = newLecture.id,
                        currentTab = MainTab.LECTURES,
                        statusBanner = "تم تفريغ وتنظيم المحاضرة «${newLecture.title}» بنجاح (+50 XP)"
                    )
                }
                awardXp(50)
                pushNotification(
                    title = "اكتمل تفريغ المحاضرة بنجاح",
                    message = "المحاضرة «${newLecture.title}» أصبحت جاهزة للقراءة والتحويل إلى ملخص أو اختبار.",
                    categoryLabel = "تفريغ المحاضرات"
                )
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isAiLoading = false,
                        statusBanner = err.message ?: "تعذر تفريغ المحاضرة. تحقق من مفتاح Gemini."
                    )
                }
            }
        }
    }

    fun transcribeLectureFromAudioUri(uri: Uri, title: String, subject: String) {
        val state = _uiState.value
        if (!state.isAiReady) {
            _uiState.update {
                it.copy(
                    showKeySettingsDialog = true,
                    statusBanner = "يرجى إدخال مفتاح Gemini الخاص بك أولاً لتفريغ الملفات الصوتية."
                )
            }
            return
        }

        _uiState.update {
            it.copy(
                isAiLoading = true,
                statusBanner = "جارٍ قراءة الملف الصوتي وتفريغ المحاضرة عبر Gemini..."
            )
        }

        viewModelScope.launch {
            try {
                val (base64Audio, mimeType) = withContext(Dispatchers.IO) {
                    val resolver = app.contentResolver
                    val detectedMime = resolver.getType(uri) ?: "audio/mp3"
                    val bytes = resolver.openInputStream(uri)?.use { input ->
                        input.readBytes()
                    } ?: throw IllegalStateException("تعذر قراءة الملف الصوتي المختار.")

                    if (bytes.isEmpty()) {
                        throw IllegalStateException("الملف الصوتي المختار فارغ.")
                    }
                    if (bytes.size > 9 * 1024 * 1024) {
                        throw IllegalStateException("حجم الملف الصوتي كبير. يرجى اختيار ملف أقل من 9 ميجابايت لضمان سرعة التفريغ.")
                    }
                    Base64.encodeToString(bytes, Base64.NO_WRAP) to detectedMime
                }

                val cleanSubject = subject.trim().ifBlank { "مادة عامة" }
                val cleanTitle = title.trim().ifBlank { "محاضرة صوتية - $cleanSubject" }
                val result = GeminiAiClient.transcribeAndOrganizeLecture(
                    rawInput = "",
                    audioBase64 = base64Audio,
                    audioMimeType = mimeType,
                    title = cleanTitle,
                    subject = cleanSubject,
                    userKey = state.userGeminiKey,
                    keyPreference = state.keyPreference,
                    sourceTypeLabel = "تفريغ صوتي ذكي"
                )

                result.onSuccess { newLecture ->
                    _uiState.update { current ->
                        current.copy(
                            isAiLoading = false,
                            lectures = listOf(newLecture) + current.lectures,
                            selectedLectureId = newLecture.id,
                            currentTab = MainTab.LECTURES,
                            statusBanner = "تم تفريغ الملف الصوتي للمحاضرة «${newLecture.title}» بنجاح (+60 XP)"
                        )
                    }
                    awardXp(60)
                    pushNotification(
                        title = "اكتمل التفريغ الصوتي للمحاضرة",
                        message = "تم تفريغ وتنظيم «${newLecture.title}» في فقرات مرتبة وواضحة.",
                        categoryLabel = "تفريغ صوتي"
                    )
                }.onFailure { err ->
                    _uiState.update {
                        it.copy(
                            isAiLoading = false,
                            statusBanner = err.message ?: "تعذر تفريغ الملف الصوتي."
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isAiLoading = false,
                        statusBanner = e.message ?: "حدث خطأ أثناء قراءة الملف الصوتي."
                    )
                }
            }
        }
    }

    fun convertLectureToSummary(lecture: LectureItem) {
        val coreText = lecture.sections.firstOrNull()?.paragraphs?.firstOrNull()
            ?: lecture.goldenTakeaway
        val bullets = lecture.sections.flatMap { sec ->
            sec.paragraphs.map { p -> "${sec.heading}: $p" }
        }.take(6)
        val comparisons = lecture.restoredTerms.mapIndexed { idx, term ->
            ComparisonPair(
                term = term,
                distinction = lecture.sections.getOrNull(idx % lecture.sections.size)?.heading
                    ?: "مفهوم أساسي في المحاضرة",
                clinicalNote = "راجع هذا المفهوم ضمن مادة ${lecture.subject}"
            )
        }.take(4)

        val converted = StudySummary(
            id = "sum_from_${lecture.id}",
            title = "ملخص: ${lecture.title.removePrefix("تفريغ محاضرة: ")}",
            subject = lecture.subject,
            plateCode = "NOTE",
            readMinutes = (lecture.sections.size * 2).coerceAtLeast(5),
            coreSummary = coreText,
            goldenPearl = lecture.goldenTakeaway,
            examBullets = if (bullets.isEmpty()) listOf(lecture.goldenTakeaway) else bullets,
            comparisonItems = comparisons,
            isBookmarked = true,
            isCustomAi = true
        )

        _uiState.update { state ->
            val updated = listOf(converted) + state.summaries.filterNot { it.id == converted.id }
            state.copy(
                summaries = updated,
                currentTab = MainTab.SUMMARIES,
                selectedSummaryId = converted.id,
                selectedLectureId = null,
                statusBanner = "تم تحويل المحاضرة إلى مذكرة أكاديمية شاملة (+30 XP)"
            )
        }
        awardXp(30)
    }

    fun generateQuizFromLecture(lecture: LectureItem) {
        generateAiQuiz(lecture.title)
        _uiState.update { it.copy(currentTab = MainTab.QUIZZES, selectedLectureId = null) }
    }

    // --- Summaries ---
    fun openSummary(summaryId: String?) {
        _uiState.update { it.copy(selectedSummaryId = summaryId) }
    }

    fun toggleBookmark(summaryId: String) {
        val updated = _uiState.value.summaries.map { s ->
            if (s.id == summaryId) s.copy(isBookmarked = !s.isBookmarked) else s
        }
        _uiState.update { it.copy(summaries = updated) }
        val bookmarkedIds = updated.filter { it.isBookmarked }.map { it.id }.toSet()
        prefs.edit().putStringSet(Keys.BOOKMARKED_SUMMARIES, bookmarkedIds).apply()
    }

    fun generateAiSummary(topic: String, subject: String) {
        val state = _uiState.value
        if (!state.isAiReady) {
            _uiState.update {
                it.copy(
                    showKeySettingsDialog = true,
                    statusBanner = "يرجى إدخال مفتاح Gemini الخاص بك أولاً لتلخيص المحاضرات."
                )
            }
            return
        }

        _uiState.update {
            it.copy(
                isAiLoading = true,
                statusBanner = "جارٍ صياغة المذكرة الأكاديمية بالذكاء الاصطناعي..."
            )
        }
        viewModelScope.launch {
            val result = GeminiAiClient.generateStructuredSummary(
                topicOrNotes = topic,
                subject = subject,
                userKey = state.userGeminiKey,
                keyPreference = state.keyPreference
            )
            result.onSuccess { summary ->
                _uiState.update { current ->
                    current.copy(
                        isAiLoading = false,
                        summaries = listOf(summary) + current.summaries,
                        selectedSummaryId = summary.id,
                        statusBanner = "تم إنشاء المذكرة الأكاديمية «${summary.title}» بنجاح (+40 XP)"
                    )
                }
                awardXp(40)
                pushNotification(
                    title = "تم تجهيز المذكرة الأكاديمية 📘",
                    message = "المذكرة «${summary.title}» جاهزة الآن للمراجعة المنظمة.",
                    categoryLabel = "المذكرات الذكية"
                )
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isAiLoading = false,
                        statusBanner = err.message ?: "تعذر إنشاء المذكرة حالياً."
                    )
                }
            }
        }
    }

    // --- Quizzes ---
    fun recordQuizAnswer(questionId: String, isCorrect: Boolean) {
        val currentMistakes = _uiState.value.mistakeVaultIds.toMutableSet()
        if (isCorrect) {
            currentMistakes.remove(questionId)
            awardXp(20)
        } else {
            currentMistakes.add(questionId)
        }
        _uiState.update { it.copy(mistakeVaultIds = currentMistakes) }
        prefs.edit().putStringSet(Keys.MISTAKE_VAULT_IDS, currentMistakes).apply()
    }

    fun generateAiQuiz(topic: String) {
        val state = _uiState.value
        if (!state.isAiReady) {
            _uiState.update {
                it.copy(
                    showKeySettingsDialog = true,
                    statusBanner = "يرجى إدخال مفتاح Gemini الخاص بك أولاً لتوليد الكويزات الذكية."
                )
            }
            return
        }

        _uiState.update {
            it.copy(
                isAiLoading = true,
                statusBanner = "جارٍ توليد أسئلة اختبار ذكية حول «$topic»..."
            )
        }
        viewModelScope.launch {
            val result = GeminiAiClient.generateQuizQuestions(
                topic = topic,
                userKey = state.userGeminiKey,
                keyPreference = state.keyPreference
            )
            result.onSuccess { newQuestions ->
                _uiState.update { current ->
                    current.copy(
                        isAiLoading = false,
                        quizzes = newQuestions + current.quizzes,
                        statusBanner = "تمت إضافة ${newQuestions.size} أسئلة جديدة مع التفسيرات النموذجية (+30 XP)"
                    )
                }
                awardXp(30)
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isAiLoading = false,
                        statusBanner = err.message ?: "تعذر توليد الأسئلة حالياً."
                    )
                }
            }
        }
    }

    // --- Flashcards ---
    fun rateFlashcard(cardId: String, quality: Int) {
        val nextLabel = when (quality) {
            1 -> "بعد 10 دقائق"
            2 -> "غداً"
            3 -> "بعد 3 أيام"
            else -> "بعد 7 أيام"
        }
        val updated = _uiState.value.flashcards.map { c ->
            if (c.id == cardId) {
                c.copy(
                    nextIntervalLabel = nextLabel,
                    masteryLevel = (c.masteryLevel + 1).coerceAtMost(5)
                )
            } else {
                c
            }
        }
        _uiState.update { it.copy(flashcards = updated) }
        awardXp(10)
    }

    fun addCustomFlashcard(subject: String, front: String, back: String, pearl: String) {
        val newCard = FlashcardItem(
            id = "fc_${System.currentTimeMillis()}",
            subject = subject.ifBlank { "عام" },
            frontQuestion = front.trim(),
            frontHint = "بطاقة مخصصة للطالب",
            backAnswer = back.trim(),
            memoryPearl = pearl.ifBlank { back.trim() },
            nextIntervalLabel = "جديد",
            masteryLevel = 0
        )
        _uiState.update { state ->
            state.copy(
                flashcards = listOf(newCard) + state.flashcards,
                statusBanner = "تمت إضافة البطاقة الجديدة بنجاح (+15 XP)"
            )
        }
        awardXp(15)
    }

    // --- Missions & Pomodoro ---
    fun completeMission(missionId: String) {
        var gainedXp = 0
        val updated = _uiState.value.missions.map { m ->
            if (m.id == missionId && !m.isCompleted) {
                gainedXp = m.xpReward
                m.copy(isCompleted = true)
            } else {
                m
            }
        }
        _uiState.update { it.copy(missions = updated) }
        if (gainedXp > 0) {
            awardXp(gainedXp)
        }
    }

    fun togglePomodoro() {
        val running = !_uiState.value.pomodoroRunning
        _uiState.update { it.copy(pomodoroRunning = running) }
        if (running) {
            pomodoroJob?.cancel()
            pomodoroJob = viewModelScope.launch {
                while (_uiState.value.pomodoroRunning && _uiState.value.pomodoroSeconds > 0) {
                    delay(1000L)
                    _uiState.update { s ->
                        val nextSec = (s.pomodoroSeconds - 1).coerceAtLeast(0)
                        s.copy(pomodoroSeconds = nextSec)
                    }
                }
                if (_uiState.value.pomodoroSeconds == 0) {
                    _uiState.update {
                        it.copy(
                            pomodoroRunning = false,
                            pomodoroSeconds = 25 * 60,
                            statusBanner = "أحسنت! أتممت جلسة مذاكرة عميقة (+50 XP)"
                        )
                    }
                    awardXp(50)
                    pushNotification(
                        title = "انتهت جلسة المذاكرة العميقة (Pomodoro) ⏱️",
                        message = "أحسنت التركيز لمدة 25 دقيقة! خذ استراحة قصيرة لمدة 5 دقائق.",
                        categoryLabel = "مؤقت المذاكرة"
                    )
                }
            }
        } else {
            pomodoroJob?.cancel()
        }
    }

    fun resetPomodoro() {
        pomodoroJob?.cancel()
        _uiState.update {
            it.copy(
                pomodoroRunning = false,
                pomodoroSeconds = 25 * 60
            )
        }
    }

    // --- AI Tutor & Cloud Portal ---
    fun sendTutorQuestion(question: String) {
        val clean = question.trim()
        if (clean.isEmpty()) return

        val state = _uiState.value
        if (!state.isAiReady) {
            _uiState.update {
                it.copy(
                    showKeySettingsDialog = true,
                    statusBanner = "يرجى إدخال مفتاح Gemini الخاص بك أولاً لاستخدام المساعد الأكاديمي."
                )
            }
            return
        }

        val userMsg = AiChatMessage(
            id = "u_${System.currentTimeMillis()}",
            senderIsUser = true,
            text = clean,
            timestampLabel = "الآن"
        )
        _uiState.update {
            it.copy(
                aiMessages = it.aiMessages + userMsg,
                isAiLoading = true
            )
        }

        viewModelScope.launch {
            val result = GeminiAiClient.askAcademicTutor(
                question = clean,
                userKey = state.userGeminiKey,
                keyPreference = state.keyPreference
            )
            result.onSuccess { reply ->
                val aiMsg = AiChatMessage(
                    id = "a_${System.currentTimeMillis()}",
                    senderIsUser = false,
                    text = reply,
                    timestampLabel = "الآن"
                )
                _uiState.update {
                    it.copy(
                        aiMessages = it.aiMessages + aiMsg,
                        isAiLoading = false
                    )
                }
                awardXp(10)
            }.onFailure { err ->
                val errMsg = AiChatMessage(
                    id = "a_${System.currentTimeMillis()}",
                    senderIsUser = false,
                    text = err.message ?: "تعذر الاتصال بخدمة Gemini حالياً. تأكد من مفتاح Gemini في الإعدادات (🔑).",
                    timestampLabel = "الآن"
                )
                _uiState.update {
                    it.copy(
                        aiMessages = it.aiMessages + errMsg,
                        isAiLoading = false
                    )
                }
            }
        }
    }

    fun toggleCloudPortal(show: Boolean) {
        _uiState.update { it.copy(showCloudPortal = show) }
    }

    private fun awardXp(points: Int) {
        val currentXp = _uiState.value.profile.xp
        val nextXp = (currentXp + points).coerceAtLeast(0)
        val nextLevel = (nextXp / 300) + 1
        val nextTarget = nextLevel * 300

        _uiState.update { state ->
            state.copy(
                profile = state.profile.copy(
                    xp = nextXp,
                    level = nextLevel,
                    xpToNext = nextTarget
                )
            )
        }
        prefs.edit().putInt(Keys.XP_POINTS, nextXp).apply()
    }
}
