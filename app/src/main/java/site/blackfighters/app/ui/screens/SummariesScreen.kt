package site.blackfighters.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TextDecrease
import androidx.compose.material.icons.filled.TextIncrease
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.blackfighters.app.model.MainTab
import site.blackfighters.app.model.StudySummary
import site.blackfighters.app.viewmodel.AcademicUiState

@Composable
fun SummariesScreen(
    uiState: AcademicUiState,
    onOpenSummary: (String?) -> Unit,
    onToggleBookmark: (String) -> Unit,
    onAdjustFontScale: (Float) -> Unit,
    onGenerateAiSummary: (topic: String, subject: String) -> Unit,
    onStartQuizTab: () -> Unit
) {
    val activeSummary = uiState.summaries.find { it.id == uiState.selectedSummaryId }

    if (activeSummary != null) {
        BackHandler { onOpenSummary(null) }
        SummaryReaderView(
            summary = activeSummary,
            fontScale = uiState.readerFontScale,
            onBack = { onOpenSummary(null) },
            onToggleBookmark = { onToggleBookmark(activeSummary.id) },
            onAdjustFontScale = onAdjustFontScale,
            onStartQuiz = onStartQuizTab
        )
        return
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("الكل") }
    var showGenerateDialog by remember { mutableStateOf(false) }

    val filters = remember(uiState.summaries) {
        listOf("الكل", "المحفوظات") + uiState.summaries.map { it.subject }.distinct()
    }

    val filteredSummaries = remember(uiState.summaries, searchQuery, selectedFilter) {
        uiState.summaries.filter { s ->
            val matchesFilter = when (selectedFilter) {
                "الكل" -> true
                "المحفوظات" -> s.isBookmarked
                else -> s.subject == selectedFilter
            }
            val matchesQuery = searchQuery.isBlank() ||
                s.title.contains(searchQuery, ignoreCase = true) ||
                s.coreSummary.contains(searchQuery, ignoreCase = true) ||
                s.goldenPearl.contains(searchQuery, ignoreCase = true)
            matchesFilter && matchesQuery
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
            .testTag("summaries_screen")
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // Top Header + AI Summary Generator Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "الملخصات الدراسية",
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "لخّص أي درس أو محاضرة في مادتك بسهولة وبخط واضح",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = { showGenerateDialog = true },
                modifier = Modifier.testTag("open_ai_summary_dialog"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("تلخيص جديد")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (uiState.summaries.isNotEmpty()) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("ابحث في ملخصاتك...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("summary_search_input"),
                shape = RoundedCornerShape(14.dp)
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Subject Filter Pills
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 2.dp)
            ) {
                items(filters) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter) }
                    )
                }
            }
        }

        if (uiState.isAiLoading) {
            Spacer(modifier = Modifier.height(10.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.5.dp
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "جارٍ إعداد الملخص وتنظيم النقاط المهمة...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (filteredSummaries.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "لا توجد ملخصات مضافة بعد",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "يمكنك كتابة اسم أي درس أو لصق نص محاضرتك ليقوم التطبيق بتلخيصها في نقاط مرتبة وواضحة.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Button(
                        onClick = { showGenerateDialog = true },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("إنشاء ملخص جديد")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(filteredSummaries, key = { it.id }) { summary ->
                    ElevatedCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenSummary(summary.id) }
                            .testTag("summary_card_${summary.id}"),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.elevatedCardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = MaterialTheme.colorScheme.primaryContainer
                                    ) {
                                        Text(
                                            text = summary.subject,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                    }
                                    Text(
                                        text = "${summary.readMinutes} د قراءة",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                IconButton(
                                    onClick = { onToggleBookmark(summary.id) }
                                ) {
                                    Icon(
                                        imageVector = if (summary.isBookmarked) {
                                            Icons.Default.Bookmark
                                        } else {
                                            Icons.Default.BookmarkBorder
                                        },
                                        contentDescription = "حفظ الملخص",
                                        tint = if (summary.isBookmarked) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.onSurfaceVariant
                                        }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = summary.title,
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onSurface
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = summary.coreSummary,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f)
                            ) {
                                Text(
                                    text = summary.goldenPearl,
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showGenerateDialog) {
        var topicInput by remember { mutableStateOf("") }
        var subjectInput by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showGenerateDialog = false },
            title = {
                Text(
                    text = "إنشاء ملخص جديد",
                    style = MaterialTheme.typography.titleLarge
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "اكتب اسم الدرس أو الصق نص المحاضرة ليقوم الذكاء الاصطناعي بتلخيصها في نقاط مرتبة:",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedTextField(
                        value = subjectInput,
                        onValueChange = { subjectInput = it },
                        label = { Text("اسم المادة") },
                        placeholder = { Text("مثال: محاسبة، اقتصاد، إدارة، علوم...") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = topicInput,
                        onValueChange = { topicInput = it },
                        label = { Text("عنوان الموضوع أو نص الدرس") },
                        minLines = 3,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("ai_summary_topic_input")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (topicInput.isNotBlank()) {
                            onGenerateAiSummary(topicInput, subjectInput.ifBlank { "عام" })
                            showGenerateDialog = false
                        }
                    },
                    modifier = Modifier.testTag("confirm_generate_summary")
                ) {
                    Text("إنشاء الملخص")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showGenerateDialog = false }) {
                    Text("إلغاء")
                }
            }
        )
    }
}

@Composable
private fun SummaryReaderView(
    summary: StudySummary,
    fontScale: Float,
    onBack: () -> Unit,
    onToggleBookmark: () -> Unit,
    onAdjustFontScale: (Float) -> Unit,
    onStartQuiz: () -> Unit
) {
    val bodyFontSize = (16f * fontScale).sp
    val bodyLineHeight = (28f * fontScale).sp
    val titleFontSize = (21f * fontScale).sp

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .testTag("summary_reader_view")
    ) {
        // Reader Sticky Toolbar with Font Size Controls
        Surface(
            modifier = Modifier.fillMaxWidth(),
            tonalElevation = 3.dp,
            color = MaterialTheme.colorScheme.surface
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.testTag("reader_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "رجوع للملخصات"
                        )
                    }
                    Text(
                        text = summary.subject,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    FilledTonalButton(
                        onClick = { onAdjustFontScale(-0.1f) },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.testTag("font_decrease_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.TextDecrease,
                            contentDescription = "تصغير الخط",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("A-")
                    }
                    FilledTonalButton(
                        onClick = { onAdjustFontScale(0.1f) },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.testTag("font_increase_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.TextIncrease,
                            contentDescription = "تكبير الخط",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("A+")
                    }
                    IconButton(onClick = onToggleBookmark) {
                        Icon(
                            imageVector = if (summary.isBookmarked) {
                                Icons.Default.Bookmark
                            } else {
                                Icons.Default.BookmarkBorder
                            },
                            contentDescription = "حفظ",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 18.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = summary.title,
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontSize = titleFontSize,
                    lineHeight = (titleFontSize.value * 1.45f).sp
                ),
                color = MaterialTheme.colorScheme.onBackground
            )

            // Core Explanation Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = "الشرح الأساسي",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = summary.coreSummary,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontSize = bodyFontSize,
                            lineHeight = bodyLineHeight
                        ),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            // Highlight Box
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        width = 1.5.dp,
                        color = MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(18.dp)
                    ),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text(
                        text = summary.goldenPearl,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontSize = bodyFontSize,
                            lineHeight = bodyLineHeight,
                            fontWeight = FontWeight.SemiBold
                        ),
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            // Key Points
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "أهم نقاط الدرس للمراجعة",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    HorizontalDivider()
                    summary.examBullets.forEach { bullet ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier
                                    .padding(top = 4.dp)
                                    .size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = bullet,
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontSize = bodyFontSize,
                                    lineHeight = bodyLineHeight
                                ),
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Comparison / Definitions Cards
            if (summary.comparisonItems.isNotEmpty()) {
                Text(
                    text = "مفاهيم ومقارنات مهمة",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )

                summary.comparisonItems.forEach { item ->
                    ElevatedCard(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.elevatedCardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = item.term,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = item.distinction,
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontSize = bodyFontSize,
                                    lineHeight = bodyLineHeight
                                ),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (item.clinicalNote.isNotBlank()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.secondaryContainer
                                ) {
                                    Text(
                                        text = "ملاحظة: ${item.clinicalNote}",
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Action CTA to Test Knowledge
            Button(
                onClick = onStartQuiz,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("start_quiz_from_summary"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Quiz, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "اختبر نفسك في هذا الدرس الآن",
                    style = MaterialTheme.typography.labelLarge
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
