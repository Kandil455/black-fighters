package site.blackfighters.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import site.blackfighters.app.BuildConfig
import site.blackfighters.app.model.AiKeyPreference
import site.blackfighters.app.model.ComparisonPair
import site.blackfighters.app.model.LectureItem
import site.blackfighters.app.model.LectureSection
import site.blackfighters.app.model.QuizQuestion
import site.blackfighters.app.model.StudySummary
import site.blackfighters.app.security.StudentAppSecurityGuard
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object GeminiAiClient {

    private fun extractAdminKeys(): List<String> {
        val keys = mutableListOf<String>()
        val primary = BuildConfig.GEMINI_API_KEY.trim()
        if (StudentAppSecurityGuard.isValidGeminiKeyFormat(primary)) {
            keys.add(primary)
        }
        val backups = BuildConfig.GEMINI_BACKUP_KEYS
            .split(",", "\n", ";", " ")
            .map { it.trim() }
            .filter { StudentAppSecurityGuard.isValidGeminiKeyFormat(it) }
        keys.addAll(backups)
        return keys.distinct()
    }

    fun hasPlatformAutoKey(): Boolean {
        return extractAdminKeys().isNotEmpty()
    }

    fun resolveApiKeyPool(
        userKey: String,
        keyPreference: AiKeyPreference
    ): List<String> {
        val cleanUserKey = StudentAppSecurityGuard.sanitizeGeminiKey(userKey)
        val hasValidUserKey = StudentAppSecurityGuard.isValidGeminiKeyFormat(cleanUserKey)

        if (keyPreference == AiKeyPreference.USER_KEY_ONLY) {
            return if (hasValidUserKey) listOf(cleanUserKey) else emptyList()
        }

        val pool = mutableListOf<String>()
        if (hasValidUserKey) {
            pool.add(cleanUserKey)
        }
        pool.addAll(extractAdminKeys())
        return pool.distinct()
    }

    suspend fun verifyGeminiKey(candidateKey: String): Result<String> = withContext(Dispatchers.IO) {
        val cleanKey = StudentAppSecurityGuard.sanitizeGeminiKey(candidateKey)
        if (!StudentAppSecurityGuard.isValidGeminiKeyFormat(cleanKey)) {
            return@withContext Result.failure(
                IllegalArgumentException("صيغة المفتاح غير صحيحة. يجب أن يبدأ مفتاح Gemini بـ AIza.")
            )
        }
        try {
            val response = executeGenerateContent(
                apiKey = cleanKey,
                prompt = "أجب بكلمة واحدة فقط: جاهز",
                jsonMode = false,
                audioBase64 = null,
                audioMimeType = null
            )
            if (response.isNotBlank()) {
                Result.success("تم التحقق من مفتاح Gemini الشخصي بنجاح وهو جاهز لتفريغ وتلخيص المحاضرات.")
            } else {
                Result.failure(IllegalStateException("لم يتم استلام استجابة صالحة من الخادم."))
            }
        } catch (e: Exception) {
            Result.failure(
                IllegalStateException("تعذر التحقق من المفتاح: تأكد من صلاحية مفتاح Gemini واتصالك بالإنترنت.")
            )
        }
    }

    suspend fun transcribeAndOrganizeLecture(
        rawInput: String,
        audioBase64: String?,
        audioMimeType: String?,
        title: String,
        subject: String,
        userKey: String,
        keyPreference: AiKeyPreference,
        sourceTypeLabel: String
    ): Result<LectureItem> = withContext(Dispatchers.IO) {
        val keys = resolveApiKeyPool(userKey, keyPreference)
        if (keys.isEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("يرجى إدخال مفتاح Gemini الخاص بك أولاً من إعدادات المفتاح (🔑) لتفريغ المحاضرات أو تلخيصها.")
            )
        }

        val prompt = buildString {
            appendLine("أنت مساعد دراسي جامعي ذكي متخصص في تفريغ المحاضرات وتنظيمها بدقة ووضوح لأي تخصص جامعي.")
            appendLine("قم بتفريغ وتنظيم هذه المحاضرة باللغة العربية الواضحة مع الحفاظ على أي مصطلحات مهمة أو إنجليزية وردت في المحاضرة.")
            appendLine("عنوان المحاضرة: $title")
            appendLine("المادة: $subject")
            if (rawInput.isNotBlank()) {
                appendLine("النص أو الملاحظات المرفقة للمحاضرة:")
                appendLine(rawInput.take(14000))
            } else {
                appendLine("قم بتفريغ الملف الصوتي المرفق بالكامل وتنظيمه في فقرات مرتبة وواضحة دون أي تداخل.")
            }
            appendLine()
            appendLine("أخرج النتيجة بصيغة JSON فقط بهذا الهيكل الدقيق:")
            appendLine(
                """
                {
                  "title": "عنوان المحاضرة المنظم",
                  "subject": "$subject",
                  "durationLabel": "مفرّغة ومنظمة",
                  "sections": [
                    {
                      "heading": "عنوان العنصر أو الفقرة الأولى",
                      "timestamp": "الجزء 1",
                      "paragraphs": [
                        "فقرة أولى واضحة ومنسقة بالكامل دون أي تداخل",
                        "فقرة ثانية مكملة للشرح بأسلوب سهل ومفهوم"
                      ]
                    }
                  ],
                  "restoredTerms": ["مصطلح 1", "مصطلح 2"],
                  "goldenTakeaway": "📌 خلاصة المحاضرة: أهم النقاط التي يجب التركيز عليها"
                }
                """.trimIndent()
            )
        }

        var lastError: Exception? = null
        for (key in keys) {
            try {
                val rawResponse = executeGenerateContent(
                    apiKey = key,
                    prompt = prompt,
                    jsonMode = true,
                    audioBase64 = audioBase64,
                    audioMimeType = audioMimeType
                )
                val parsed = parseLectureJson(
                    jsonText = rawResponse,
                    fallbackTitle = title,
                    fallbackSubject = subject,
                    sourceTypeLabel = sourceTypeLabel
                )
                return@withContext Result.success(parsed)
            } catch (e: Exception) {
                lastError = e
            }
        }

        Result.failure(
            lastError ?: IllegalStateException("تعذر تفريغ المحاضرة حالياً. تحقق من مفتاح Gemini أو اتصال الإنترنت.")
        )
    }

    suspend fun generateStructuredSummary(
        topicOrNotes: String,
        subject: String,
        userKey: String,
        keyPreference: AiKeyPreference
    ): Result<StudySummary> = withContext(Dispatchers.IO) {
        val keys = resolveApiKeyPool(userKey, keyPreference)
        if (keys.isEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("يرجى إدخال مفتاح Gemini الخاص بك أولاً من إعدادات المفتاح (🔑) لتلخيص المحاضرات.")
            )
        }

        val prompt = """
            أنت مساعد دراسي جامعي خبير. قم بتحويل الموضوع أو النص الدراسي التالي إلى ملخص منظم وواضح وسهل الفهم يناسب تخصص ومادة الطالب.
            المادة: $subject
            الموضوع أو النص:
            ${topicOrNotes.take(12000)}

            أخرج النتيجة بصيغة JSON فقط وفق الهيكل التالي:
            {
              "title": "ملخص: عنوان واضح للموضوع",
              "subject": "$subject",
              "coreSummary": "شرح أساسي شامل ومبسط للموضوع في فقرة متكاملة",
              "goldenPearl": "📌 الخلاصة المركزة: أهم فكرة أو قاعدة أساسية في هذا الدرس",
              "examBullets": [
                "نقطة أساسية 1",
                "نقطة أساسية 2",
                "نقطة أساسية 3"
              ],
              "comparisonItems": [
                {
                  "term": "المفهوم أو المصطلح الأول",
                  "distinction": "التعريف أو الفرق الأساسي بوضوح",
                  "clinicalNote": "ملاحظة مهمة للمراجعة"
                }
              ]
            }
        """.trimIndent()

        var lastError: Exception? = null
        for (key in keys) {
            try {
                val responseText = executeGenerateContent(
                    apiKey = key,
                    prompt = prompt,
                    jsonMode = true,
                    audioBase64 = null,
                    audioMimeType = null
                )
                val parsed = parseSummaryJson(responseText, topicOrNotes, subject)
                return@withContext Result.success(parsed)
            } catch (e: Exception) {
                lastError = e
            }
        }

        Result.failure(lastError ?: IllegalStateException("تعذر توليد الملخص حالياً."))
    }

    suspend fun generateQuizQuestions(
        topic: String,
        userKey: String,
        keyPreference: AiKeyPreference
    ): Result<List<QuizQuestion>> = withContext(Dispatchers.IO) {
        val keys = resolveApiKeyPool(userKey, keyPreference)
        if (keys.isEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("يرجى إدخال مفتاح Gemini الخاص بك أولاً من إعدادات المفتاح (🔑) لتوليد الاختبارات الذكية.")
            )
        }

        val prompt = """
            قم بإنشاء 3 أسئلة اختيار من متعدد (MCQ) واضحة ودقيقة حول الموضوع الدراسي التالي:
            الموضوع: $topic

            أخرج النتيجة بصيغة JSON فقط بهذا الشكل:
            {
              "questions": [
                {
                  "subject": "$topic",
                  "isEmergencyOsce": false,
                  "caseVignette": "سياق السؤال أو التمهيد",
                  "stem": "نص السؤال المباشر؟",
                  "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
                  "correctIndex": 0,
                  "modelExplanation": "📌 الشرح والتوضيح: سبب صحة هذه الإجابة بأسلوب مبسط"
                }
              ]
            }
        """.trimIndent()

        var lastError: Exception? = null
        for (key in keys) {
            try {
                val responseText = executeGenerateContent(
                    apiKey = key,
                    prompt = prompt,
                    jsonMode = true,
                    audioBase64 = null,
                    audioMimeType = null
                )
                val parsed = parseQuizQuestionsJson(responseText, topic)
                return@withContext Result.success(parsed)
            } catch (e: Exception) {
                lastError = e
            }
        }

        Result.failure(lastError ?: IllegalStateException("تعذر إنشاء الأسئلة حالياً."))
    }

    suspend fun askAcademicTutor(
        question: String,
        userKey: String,
        keyPreference: AiKeyPreference
    ): Result<String> = withContext(Dispatchers.IO) {
        val keys = resolveApiKeyPool(userKey, keyPreference)
        if (keys.isEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("يرجى إدخال مفتاح Gemini الخاص بك أولاً من إعدادات المفتاح (🔑) لاستخدام المساعد الذكي.")
            )
        }

        val prompt = """
            أنت مساعد دراسي ذكي وودود.
            اشرح للطالب إجابة سؤاله بأسلوب بسيط وواضح ومنظم في نقاط مرتبة غير متداخلة، أياً كان تخصصه الدراسي (تجارة، هندسة، حقوق، علوم، لغات، طب، أو غيرها).
            سؤال الطالب: $question
        """.trimIndent()

        var lastError: Exception? = null
        for (key in keys) {
            try {
                val responseText = executeGenerateContent(
                    apiKey = key,
                    prompt = prompt,
                    jsonMode = false,
                    audioBase64 = null,
                    audioMimeType = null
                )
                if (responseText.isNotBlank()) {
                    return@withContext Result.success(responseText.trim())
                }
            } catch (e: Exception) {
                lastError = e
            }
        }

        Result.failure(lastError ?: IllegalStateException("تعذر الاتصال بالمساعد الأكاديمي حالياً."))
    }

    private fun executeGenerateContent(
        apiKey: String,
        prompt: String,
        jsonMode: Boolean,
        audioBase64: String?,
        audioMimeType: String?
    ): String {
        val endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey"
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 20000
            readTimeout = 45000
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        }

        val partsArray = JSONArray().apply {
            if (!audioBase64.isNullOrBlank() && !audioMimeType.isNullOrBlank()) {
                put(
                    JSONObject().apply {
                        put(
                            "inlineData",
                            JSONObject().apply {
                                put("mimeType", audioMimeType)
                                put("data", audioBase64)
                            }
                        )
                    }
                )
            }
            put(JSONObject().put("text", prompt))
        }

        val payload = JSONObject().apply {
            put(
                "contents",
                JSONArray().put(
                    JSONObject().put("parts", partsArray)
                )
            )
            put(
                "generationConfig",
                JSONObject().apply {
                    put("temperature", 0.3)
                    if (jsonMode) {
                        put("responseMimeType", "application/json")
                    }
                }
            )
        }

        OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
            writer.write(payload.toString())
            writer.flush()
        }

        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val body = BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }

        if (status !in 200..299) {
            throw IllegalStateException("HTTP $status: $body")
        }

        val root = JSONObject(body)
        val candidates = root.optJSONArray("candidates") ?: throw IllegalStateException("Empty candidates")
        val firstCandidate = candidates.optJSONObject(0) ?: throw IllegalStateException("No candidate")
        val content = firstCandidate.optJSONObject("content") ?: throw IllegalStateException("No content")
        val parts = content.optJSONArray("parts") ?: throw IllegalStateException("No parts")
        val text = parts.optJSONObject(0)?.optString("text").orEmpty()
        if (text.isBlank()) throw IllegalStateException("Empty response text")
        return text
    }

    private fun cleanJsonText(raw: String): String {
        return raw.trim()
            .removePrefix("```json")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()
    }

    private fun parseLectureJson(
        jsonText: String,
        fallbackTitle: String,
        fallbackSubject: String,
        sourceTypeLabel: String
    ): LectureItem {
        val cleaned = cleanJsonText(jsonText)
        val obj = JSONObject(cleaned)
        val title = obj.optString("title").ifBlank { "تفريغ محاضرة: $fallbackTitle" }
        val subject = obj.optString("subject").ifBlank { fallbackSubject }
        val durationLabel = obj.optString("durationLabel").ifBlank { "35 دقيقة · مفرّغة ومنظمة" }
        val goldenTakeaway = obj.optString("goldenTakeaway")
            .ifBlank { "📌 خلاصة المحاضرة للامتحان: راجع المحاور الأساسية والمصطلحات المرممة بعناية." }

        val sectionsArray = obj.optJSONArray("sections") ?: JSONArray()
        val sections = mutableListOf<LectureSection>()
        for (i in 0 until sectionsArray.length()) {
            val secObj = sectionsArray.optJSONObject(i) ?: continue
            val heading = secObj.optString("heading").ifBlank { "المحور ${i + 1}" }
            val timestamp = secObj.optString("timestamp").ifBlank { "القسم ${i + 1}" }
            val pArray = secObj.optJSONArray("paragraphs") ?: JSONArray()
            val paragraphs = mutableListOf<String>()
            for (j in 0 until pArray.length()) {
                val p = pArray.optString(j).trim()
                if (p.isNotEmpty()) paragraphs.add(p)
            }
            if (paragraphs.isEmpty()) {
                val singleText = secObj.optString("transcriptText").trim()
                if (singleText.isNotEmpty()) paragraphs.add(singleText)
            }
            if (paragraphs.isNotEmpty()) {
                sections.add(
                    LectureSection(
                        heading = heading,
                        timestamp = timestamp,
                        paragraphs = paragraphs
                    )
                )
            }
        }

        val termsArray = obj.optJSONArray("restoredTerms") ?: JSONArray()
        val restoredTerms = mutableListOf<String>()
        for (i in 0 until termsArray.length()) {
            val term = termsArray.optString(i).trim()
            if (term.isNotEmpty()) restoredTerms.add(term)
        }

        return LectureItem(
            id = "lec_${System.currentTimeMillis()}",
            title = title,
            subject = subject,
            durationLabel = durationLabel,
            sourceType = sourceTypeLabel,
            sections = if (sections.isEmpty()) {
                listOf(
                    LectureSection(
                        heading = title,
                        timestamp = "00:00",
                        paragraphs = listOf(goldenTakeaway)
                    )
                )
            } else {
                sections
            },
            restoredTerms = restoredTerms,
            goldenTakeaway = goldenTakeaway
        )
    }

    private fun parseSummaryJson(
        jsonText: String,
        fallbackTopic: String,
        fallbackSubject: String
    ): StudySummary {
        val cleaned = cleanJsonText(jsonText)
        val obj = JSONObject(cleaned)
        val title = obj.optString("title").ifBlank { "المذكرة الأكاديمية الشاملة: $fallbackTopic" }
        val subject = obj.optString("subject").ifBlank { fallbackSubject }
        val coreSummary = obj.optString("coreSummary").ifBlank { "شرح أكاديمي منظم للمحاضرة." }
        val goldenPearl = obj.optString("goldenPearl")
            .ifBlank { "📌 خلاصة علمية مركزة — إجابة نموذجية: $coreSummary" }

        val bulletsJson = obj.optJSONArray("examBullets") ?: JSONArray()
        val examBullets = mutableListOf<String>()
        for (i in 0 until bulletsJson.length()) {
            val b = bulletsJson.optString(i).trim()
            if (b.isNotEmpty()) examBullets.add(b)
        }

        val compJson = obj.optJSONArray("comparisonItems") ?: JSONArray()
        val comparisons = mutableListOf<ComparisonPair>()
        for (i in 0 until compJson.length()) {
            val cObj = compJson.optJSONObject(i) ?: continue
            val term = cObj.optString("term").trim()
            val distinction = cObj.optString("distinction").trim()
            val clinicalNote = cObj.optString("clinicalNote").trim()
            if (term.isNotEmpty() && distinction.isNotEmpty()) {
                comparisons.add(
                    ComparisonPair(
                        term = term,
                        distinction = distinction,
                        clinicalNote = clinicalNote
                    )
                )
            }
        }

        return StudySummary(
            id = "sum_ai_${System.currentTimeMillis()}",
            title = title,
            subject = subject,
            plateCode = "AI-SUMMARY",
            readMinutes = 5,
            coreSummary = coreSummary,
            goldenPearl = goldenPearl,
            examBullets = if (examBullets.isEmpty()) listOf(coreSummary) else examBullets,
            comparisonItems = comparisons,
            isBookmarked = true,
            isCustomAi = true
        )
    }

    private fun parseQuizQuestionsJson(jsonText: String, fallbackTopic: String): List<QuizQuestion> {
        val cleaned = cleanJsonText(jsonText)
        val obj = JSONObject(cleaned)
        val qArray = obj.optJSONArray("questions") ?: JSONArray()
        val questions = mutableListOf<QuizQuestion>()

        for (i in 0 until qArray.length()) {
            val qObj = qArray.optJSONObject(i) ?: continue
            val subject = qObj.optString("subject").ifBlank { fallbackTopic }
            val isOsce = qObj.optBoolean("isEmergencyOsce", true)
            val vignette = qObj.optString("caseVignette").ifBlank { "حالة دراسية حول $fallbackTopic:" }
            val stem = qObj.optString("stem").ifBlank { qObj.optString("question") }
            val optsJson = qObj.optJSONArray("options") ?: JSONArray()
            val opts = mutableListOf<String>()
            for (j in 0 until optsJson.length()) {
                opts.add(optsJson.optString(j))
            }
            val correctIndex = qObj.optInt("correctIndex", 0).coerceIn(0, (opts.size - 1).coerceAtLeast(0))
            val explanation = qObj.optString("modelExplanation")
                .ifBlank { "📌 خلاصة علمية مركزة — إجابة نموذجية: راجع النقاط الأساسية للموضوع." }

            if (stem.isNotBlank() && opts.size >= 2) {
                questions.add(
                    QuizQuestion(
                        id = "q_ai_${System.currentTimeMillis()}_$i",
                        subject = subject,
                        isEmergencyOsce = isOsce,
                        caseVignette = vignette,
                        stem = stem,
                        options = opts,
                        correctIndex = correctIndex,
                        modelExplanation = explanation
                    )
                )
            }
        }

        if (questions.isEmpty()) {
            throw IllegalStateException("لم يتم توليد أسئلة كافية")
        }
        return questions
    }
}
