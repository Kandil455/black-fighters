package site.blackfighters.app.model

enum class MainTab {
    HOME,
    LECTURES,
    SUMMARIES,
    QUIZZES,
    FLASHCARDS,
    AI_TUTOR
}

enum class AiKeyPreference {
    AUTO_FALLBACK,     // Uses user key if provided, otherwise falls back automatically to platform key
    USER_KEY_ONLY      // Strictly requires user's personal Gemini key
}

data class StudentProfile(
    val fullName: String,
    val email: String,
    val rankTitle: String,
    val level: Int,
    val xp: Int,
    val xpToNext: Int,
    val streakDays: Int,
    val credits: Int,
    val isLoggedIn: Boolean,
    val authProvider: String = "حساب الطالب"
)

data class LectureSection(
    val heading: String,
    val timestamp: String,
    val paragraphs: List<String>
)

data class LectureItem(
    val id: String,
    val title: String,
    val subject: String,
    val durationLabel: String,
    val sourceType: String,
    val sections: List<LectureSection>,
    val restoredTerms: List<String>,
    val goldenTakeaway: String
)

data class AppNotificationItem(
    val id: String,
    val title: String,
    val message: String,
    val categoryLabel: String,
    val timeLabel: String,
    val isRead: Boolean = false,
    val isAdminBroadcast: Boolean = false
)

data class ComparisonPair(
    val term: String,
    val distinction: String,
    val clinicalNote: String
)

data class StudySummary(
    val id: String,
    val title: String,
    val subject: String,
    val plateCode: String,
    val readMinutes: Int,
    val coreSummary: String,
    val goldenPearl: String,
    val examBullets: List<String>,
    val comparisonItems: List<ComparisonPair>,
    val isBookmarked: Boolean = false,
    val isCustomAi: Boolean = false
)

data class QuizQuestion(
    val id: String,
    val subject: String,
    val isEmergencyOsce: Boolean,
    val caseVignette: String,
    val stem: String,
    val options: List<String>,
    val correctIndex: Int,
    val modelExplanation: String
)

data class FlashcardItem(
    val id: String,
    val subject: String,
    val frontQuestion: String,
    val frontHint: String,
    val backAnswer: String,
    val memoryPearl: String,
    val nextIntervalLabel: String = "جديد",
    val masteryLevel: Int = 0
)

data class DailyMission(
    val id: String,
    val title: String,
    val subtitle: String,
    val xpReward: Int,
    val isCompleted: Boolean,
    val targetTab: MainTab
)

data class AiChatMessage(
    val id: String,
    val senderIsUser: Boolean,
    val text: String,
    val timestampLabel: String
)

object InitialAcademicCatalog {

    val defaultLectures: List<LectureItem> = emptyList()

    val defaultSummaries: List<StudySummary> = emptyList()

    val defaultQuizzes: List<QuizQuestion> = emptyList()

    val defaultFlashcards: List<FlashcardItem> = emptyList()

    val defaultNotifications: List<AppNotificationItem> = listOf(
        AppNotificationItem(
            id = "notif_welcome",
            title = "أهلاً بك في منصتك الدراسية",
            message = "يمكنك الآن رفع محاضراتك لتفريغها، أو تلخيص دروسك، أو إنشاء اختبارات في أي مادة تدرسها بكل سهولة.",
            categoryLabel = "ترحيب",
            timeLabel = "الآن",
            isRead = false,
            isAdminBroadcast = true
        )
    )

    val defaultMissions: List<DailyMission> = listOf(
        DailyMission(
            id = "mission_0",
            title = "تفريغ محاضرة جديدة",
            subtitle = "ارفع ملفاً صوتياً أو الصق نص محاضرتك لتنظيمها",
            xpReward = 45,
            isCompleted = false,
            targetTab = MainTab.LECTURES
        ),
        DailyMission(
            id = "mission_1",
            title = "تلخيص درس أو فصل دراسي",
            subtitle = "حوّل أي موضوع في مادتك إلى ملخص منظم وواضح",
            xpReward = 40,
            isCompleted = false,
            targetTab = MainTab.SUMMARIES
        ),
        DailyMission(
            id = "mission_2",
            title = "اختبار سريع في مادتك",
            subtitle = "أنشئ أسئلة اختيار من متعدد في أي موضوع تذاكره",
            xpReward = 50,
            isCompleted = false,
            targetTab = MainTab.QUIZZES
        ),
        DailyMission(
            id = "mission_3",
            title = "إضافة بطاقة مراجعة",
            subtitle = "احفظ أهم التعريفات والقوانين في بطاقات سؤال وجواب",
            xpReward = 35,
            isCompleted = false,
            targetTab = MainTab.FLASHCARDS
        )
    )
}
