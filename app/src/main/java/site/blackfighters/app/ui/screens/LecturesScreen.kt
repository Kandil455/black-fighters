package site.blackfighters.app.ui.screens

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.blackfighters.app.model.AiKeyPreference
import site.blackfighters.app.model.AppNotificationItem
import site.blackfighters.app.model.LectureItem
import site.blackfighters.app.viewmodel.AcademicUiState

@Composable
fun LecturesScreen(
    uiState: AcademicUiState,
    onSelectLecture: (String?) -> Unit,
    onAdjustFontScale: (Float) -> Unit,
    onOpenKeySettings: () -> Unit,
    onTranscribeText: (title: String, subject: String, rawText: String) -> Unit,
    onTranscribeAudioUri: (uri: Uri, title: String, subject: String) -> Unit,
    onConvertToSummary: (LectureItem) -> Unit,
    onGenerateQuizFromLecture: (LectureItem) -> Unit
) {
    val selectedLecture = remember(uiState.selectedLectureId, uiState.lectures) {
        uiState.lectures.find { it.id == uiState.selectedLectureId }
    }

    if (selectedLecture != null) {
        BackHandler {
            onSelectLecture(null)
        }
        LectureDetailReaderView(
            lecture = selectedLecture,
            fontScale = uiState.readerFontScale,
            isAiBusy = uiState.isAiLoading,
            onBack = { onSelectLecture(null) },
            onAdjustFontScale = onAdjustFontScale,
            onConvertToSummary = { onConvertToSummary(selectedLecture) },
            onGenerateQuiz = { onGenerateQuizFromLecture(selectedLecture) }
        )
        return
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedSubject by remember { mutableStateOf("الكل") }
    var showTextTranscribeDialog by remember { mutableStateOf(false) }
    var showAudioMetadataDialog by remember { mutableStateOf(false) }
    var pendingAudioUri by remember { mutableStateOf<Uri?>(null) }

    var lectureTitleInput by remember { mutableStateOf("") }
    var lectureSubjectInput by remember { mutableStateOf("") }
    var lectureRawTextInput by remember { mutableStateOf("") }

    val audioPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) {
            pendingAudioUri = uri
            showAudioMetadataDialog = true
        }
    }

    val subjects = remember(uiState.lectures) {
        listOf("الكل") + uiState.lectures.map { it.subject }.distinct()
    }

    val filteredLectures = remember(
        uiState.lectures,
        searchQuery,
        selectedSubject
    ) {
        uiState.lectures.filter { item ->
            val matchesSubject =
                selectedSubject == "الكل" || item.subject == selectedSubject
            val q = searchQuery.trim()
            val matchesQuery = q.isEmpty() ||
                item.title.contains(q, ignoreCase = true) ||
                item.goldenTakeaway.contains(q, ignoreCase = true) ||
                item.subject.contains(q, ignoreCase = true) ||
                item.restoredTerms.any { it.contains(q, ignoreCase = true) }
            matchesSubject && matchesQuery
        }
    }

    if (showTextTranscribeDialog) {
        AlertDialog(
            onDismissRequest = { showTextTranscribeDialog = false },
            title = {
                Text(
                    text = "تفريغ وتنظيم نص محاضرة",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "الصق نص المحاضرة أو الملاحظات ليقوم الذكاء الاصطناعي بترتيبها في فقرات واضحة ومنظمة.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedTextField(
                        value = lectureTitleInput,
                        onValueChange = { lectureTitleInput = it },
                        label = { Text("عنوان المحاضرة") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("lecture_title_input")
                    )
                    OutlinedTextField(
                        value = lectureSubjectInput,
                        onValueChange = { lectureSubjectInput = it },
                        label = { Text("اسم المادة") },
                        placeholder = { Text("مثال: محاسبة، إدارة، قانون، علوم...") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("lecture_subject_input")
                    )
                    OutlinedTextField(
                        value = lectureRawTextInput,
                        onValueChange = { lectureRawTextInput = it },
                        label = { Text("نص المحاضرة أو الملاحظات") },
                        minLines = 5,
                        maxLines = 8,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("lecture_raw_text_input")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onTranscribeText(lectureTitleInput, lectureSubjectInput, lectureRawTextInput)
                        lectureTitleInput = ""
                        lectureRawTextInput = ""
                        showTextTranscribeDialog = false
                    },
                    modifier = Modifier.testTag("confirm_transcribe_text_button")
                ) {
                    Text("تفريغ وتنظيم الآن")
                }
            },
            dismissButton = {
                TextButton(onClick = { showTextTranscribeDialog = false }) {
                    Text("إلغاء")
                }
            }
        )
    }

    if (showAudioMetadataDialog && pendingAudioUri != null) {
        AlertDialog(
            onDismissRequest = {
                showAudioMetadataDialog = false
                pendingAudioUri = null
            },
            title = {
                Text(
                    text = "تفريغ ملف صوتي للمحاضرة",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "تم اختيار الملف الصوتي بنجاح. أدخل عنوان المحاضرة واسم المادة لبدء التفريغ والتنظيم.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedTextField(
                        value = lectureTitleInput,
                        onValueChange = { lectureTitleInput = it },
                        label = { Text("عنوان المحاضرة الصوتية") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("audio_lecture_title_input")
                    )
                    OutlinedTextField(
                        value = lectureSubjectInput,
                        onValueChange = { lectureSubjectInput = it },
                        label = { Text("اسم المادة") },
                        placeholder = { Text("مثال: محاسبة، إدارة، قانون، علوم...") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("audio_lecture_subject_input")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val targetUri = pendingAudioUri
                        if (targetUri != null) {
                            onTranscribeAudioUri(targetUri, lectureTitleInput, lectureSubjectInput)
                        }
                        lectureTitleInput = ""
                        showAudioMetadataDialog = false
                        pendingAudioUri = null
                    },
                    modifier = Modifier.testTag("confirm_transcribe_audio_button")
                ) {
                    Text("بدء التفريغ الصوتي")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showAudioMetadataDialog = false
                        pendingAudioUri = null
                    }
                ) {
                    Text("إلغاء")
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("lectures_list"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f)
                ),
                border = BorderStroke(
                    1.dp,
                    if (uiState.isAiReady) {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                    } else {
                        MaterialTheme.colorScheme.tertiary.copy(alpha = 0.6f)
                    }
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "المحاضرات وتفريغها بالذكاء الاصطناعي",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "حالة المفتاح: ${uiState.activeKeyModeLabel}",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (uiState.isAiReady) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.tertiary
                                }
                            )
                        }
                        OutlinedButton(
                            onClick = onOpenKeySettings,
                            modifier = Modifier.testTag("lectures_key_settings_button")
                        ) {
                            Text("مفتاح Gemini")
                        }
                    }

                    Text(
                        text = "ارفع تسجيلاً صوتياً للمحاضرة أو الصق نصها لتحويله إلى شرح منظم في فقرات واضحة وسهلة القراءة.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                if (!uiState.isAiReady) {
                                    onOpenKeySettings()
                                } else {
                                    audioPickerLauncher.launch(arrayOf("audio/*"))
                                }
                            },
                            enabled = !uiState.isAiLoading,
                            modifier = Modifier
                                .weight(1f)
                                .testTag("pick_audio_lecture_button")
                        ) {
                            if (uiState.isAiLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier
                                        .width(16.dp)
                                        .height(16.dp),
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text("رفع ملف صوتي")
                        }

                        OutlinedButton(
                            onClick = {
                                if (!uiState.isAiReady) {
                                    onOpenKeySettings()
                                } else {
                                    showTextTranscribeDialog = true
                                }
                            },
                            enabled = !uiState.isAiLoading,
                            modifier = Modifier
                                .weight(1f)
                                .testTag("open_text_lecture_button")
                        ) {
                            Text("لصق نص محاضرة")
                        }
                    }
                }
            }
        }

        if (uiState.lectures.isNotEmpty()) {
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    label = { Text("ابحث في محاضراتك...") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("lectures_search_input")
                )
            }

            item {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(subjects) { subject ->
                        val selected = subject == selectedSubject
                        FilterChip(
                            selected = selected,
                            onClick = { selectedSubject = subject },
                            label = { Text(subject) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.22f),
                                selectedLabelColor = MaterialTheme.colorScheme.primary
                            ),
                            modifier = Modifier.testTag("lecture_subject_chip_$subject")
                        )
                    }
                }
            }
        }

        if (filteredLectures.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "لا توجد محاضرات مضافة حتى الآن",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "اضغط على «رفع ملف صوتي» أو «لصق نص محاضرة» بالأعلى لتفريغ محاضرتك وتنظيمها فوراً.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(filteredLectures, key = { it.id }) { lecture ->
                LectureListCard(
                    lecture = lecture,
                    onClick = { onSelectLecture(lecture.id) },
                    onConvertToSummary = { onConvertToSummary(lecture) }
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LectureListCard(
    lecture: LectureItem,
    onClick: () -> Unit,
    onConvertToSummary: () -> Unit
) {
    val previewParagraph = lecture.sections.firstOrNull()?.paragraphs?.firstOrNull()
        ?: lecture.goldenTakeaway

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .testTag("lecture_item_${lecture.id}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
                ) {
                    Text(
                        text = lecture.subject,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
                Text(
                    text = "${lecture.sourceType} • ${lecture.durationLabel}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Text(
                text = lecture.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = previewParagraph,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 23.sp
            )

            if (lecture.restoredTerms.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    lecture.restoredTerms.take(4).forEach { term ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer
                        ) {
                            Text(
                                text = term,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${lecture.sections.size} محاور مفرغة بوضوح",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(
                        onClick = onConvertToSummary,
                        modifier = Modifier.testTag("convert_lecture_summary_${lecture.id}")
                    ) {
                        Text("تحويل لمذكرة")
                    }
                    Button(
                        onClick = onClick,
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                        modifier = Modifier.testTag("open_lecture_btn_${lecture.id}")
                    ) {
                        Text("قراءة التفريغ")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LectureDetailReaderView(
    lecture: LectureItem,
    fontScale: Float,
    isAiBusy: Boolean,
    onBack: () -> Unit,
    onAdjustFontScale: (Float) -> Unit,
    onConvertToSummary: () -> Unit,
    onGenerateQuiz: () -> Unit
) {
    val bodyFontSize = (15.5f * fontScale).sp
    val bodyLineHeight = (28f * fontScale).sp
    val headingFontSize = (18f * fontScale).sp

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("lecture_detail_reader"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.testTag("back_to_lectures_button")
                ) {
                    Text("→ رجوع للمحاضرات")
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { onAdjustFontScale(-0.08f) },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.testTag("lecture_font_decrease")
                    ) {
                        Text("A-")
                    }
                    OutlinedButton(
                        onClick = { onAdjustFontScale(0.08f) },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.testTag("lecture_font_increase")
                    ) {
                        Text("A+")
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "${lecture.subject} • ${lecture.durationLabel} • ${lecture.sourceType}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = lecture.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    if (lecture.restoredTerms.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "المصطلحات والمفاهيم الأساسية في المحاضرة:",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.Bold
                        )
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            lecture.restoredTerms.forEach { term ->
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.secondaryContainer
                                ) {
                                    Text(
                                        text = term,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        items(lecture.sections) { section ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.22f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = section.heading,
                            fontSize = headingFontSize,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.weight(1f)
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Text(
                                text = section.timestamp,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    section.paragraphs.forEach { paragraph ->
                        Text(
                            text = paragraph,
                            fontSize = bodyFontSize,
                            lineHeight = bodyLineHeight,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.45f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "⭐ الخلاصة الذهبية للمحاضرة",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = lecture.goldenTakeaway,
                        fontSize = bodyFontSize,
                        lineHeight = bodyLineHeight,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = onConvertToSummary,
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp)
                        .testTag("lecture_to_summary_button")
                ) {
                    Text("📘 تحويل لمذكرة شاملة")
                }

                Button(
                    onClick = onGenerateQuiz,
                    enabled = !isAiBusy,
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp)
                        .testTag("lecture_to_quiz_button"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text("🎯 اختبار في المحاضرة")
                }
            }
        }
    }
}

@Composable
fun GeminiKeySettingsDialog(
    uiState: AcademicUiState,
    onDismiss: () -> Unit,
    onSaveKey: (String, AiKeyPreference) -> Unit,
    onClearKey: () -> Unit,
    onTestKey: (String) -> Unit
) {
    var keyInput by remember(uiState.userGeminiKey) { mutableStateOf(uiState.userGeminiKey) }
    var selectedPreference by remember(uiState.keyPreference) { mutableStateOf(uiState.keyPreference) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "إعدادات مفتاح Gemini الذكي 🔑",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = if (uiState.hasAdminPlatformKey) {
                                "✅ مفتاح المنصة التلقائي متوفر: يعمل التطبيق تلقائياً، ويمكنك أيضاً وضع مفتاحك الشخصي لسرعة وأولوية خاصة بك."
                            } else {
                                "ℹ️ يرجى وضع مفتاح Gemini الشخصي الخاص بك (يبدأ بـ AIza) لتفعيل تفريغ المحاضرات وتلخيصها."
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                OutlinedTextField(
                    value = keyInput,
                    onValueChange = { keyInput = it },
                    label = { Text("مفتاح Gemini API الشخصي (اختياري مع الوضع التلقائي)") },
                    placeholder = { Text("AIzaSy...") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("gemini_api_key_input")
                )

                Text(
                    text = "نظام تشغيل الذكاء الاصطناعي:",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedPreference = AiKeyPreference.AUTO_FALLBACK },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = selectedPreference == AiKeyPreference.AUTO_FALLBACK,
                        onClick = { selectedPreference = AiKeyPreference.AUTO_FALLBACK }
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "وضع تلقائي ذكي (موصى به)",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "يستخدم مفتاحك الشخصي إن وُجد، أو يعمل تلقائياً بمفتاح المنصة.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedPreference = AiKeyPreference.USER_KEY_ONLY },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = selectedPreference == AiKeyPreference.USER_KEY_ONLY,
                        onClick = { selectedPreference = AiKeyPreference.USER_KEY_ONLY }
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "استخدام مفتاحي الشخصي فقط",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "يشترط إدخال مفتاحك الخاص قبل تفريغ أو تلخيص أي محاضرة.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (!uiState.keyTestResultMessage.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer
                    ) {
                        Text(
                            text = uiState.keyTestResultMessage,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { onTestKey(keyInput) },
                        enabled = !uiState.isTestingKey && keyInput.isNotBlank(),
                        modifier = Modifier
                            .weight(1f)
                            .testTag("test_gemini_key_button")
                    ) {
                        Text(if (uiState.isTestingKey) "جاري الفحص..." else "فحص المفتاح")
                    }
                    if (uiState.userGeminiKey.isNotBlank()) {
                        TextButton(
                            onClick = {
                                keyInput = ""
                                onClearKey()
                            },
                            modifier = Modifier.testTag("clear_gemini_key_button")
                        ) {
                            Text("مسح المفتاح")
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSaveKey(keyInput, selectedPreference)
                    onDismiss()
                },
                modifier = Modifier.testTag("save_gemini_key_button")
            ) {
                Text("حفظ الإعدادات")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("إغلاق")
            }
        }
    )
}

@Composable
fun NotificationsCenterDialog(
    notifications: List<AppNotificationItem>,
    onDismiss: () -> Unit,
    onMarkAllRead: () -> Unit,
    onSendStudyReminder: () -> Unit,
    onSyncAdminNotifications: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "مركز الإشعارات والتنبيهات 🔔",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                TextButton(
                    onClick = onMarkAllRead,
                    modifier = Modifier.testTag("mark_notifications_read_button")
                ) {
                    Text("قراءة الكل")
                }
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onSyncAdminNotifications,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("sync_admin_notifications_button")
                    ) {
                        Text("🔄 إشعارات الإدارة", style = MaterialTheme.typography.labelMedium)
                    }
                    OutlinedButton(
                        onClick = onSendStudyReminder,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("send_study_reminder_button")
                    ) {
                        Text("⏰ تذكير مذاكرة", style = MaterialTheme.typography.labelMedium)
                    }
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(320.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(notifications, key = { it.id }) { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (!item.isRead) {
                                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f)
                                } else {
                                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                }
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = item.categoryLabel,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = item.timeLabel,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Text(
                                    text = item.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = item.message,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    lineHeight = 20.sp
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                modifier = Modifier.testTag("close_notifications_dialog_button")
            ) {
                Text("تم")
            }
        }
    )
}
