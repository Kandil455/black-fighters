package site.blackfighters.app.ui.screens

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import site.blackfighters.app.viewmodel.AcademicUiState

@Composable
fun QuizzesScreen(
    uiState: AcademicUiState,
    onRecordAnswer: (questionId: String, isCorrect: Boolean) -> Unit,
    onGenerateAiQuiz: (topic: String) -> Unit
) {
    var modeFilter by remember { mutableStateOf("الكل") }
    var currentIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableStateOf<Int?>(null) }
    var correctCount by remember { mutableIntStateOf(0) }
    var answeredCount by remember { mutableIntStateOf(0) }
    var showAiQuizDialog by remember { mutableStateOf(false) }

    val modes = listOf(
        "الكل (${uiState.quizzes.size})",
        "أخطائي للمراجعة (${uiState.mistakeVaultIds.size})"
    )

    val activeQuestions = remember(uiState.quizzes, uiState.mistakeVaultIds, modeFilter) {
        when {
            modeFilter.startsWith("أخطائي") -> uiState.quizzes.filter { it.id in uiState.mistakeVaultIds }
            else -> uiState.quizzes
        }
    }

    val safeIndex = if (activeQuestions.isEmpty()) 0 else currentIndex.coerceIn(0, activeQuestions.lastIndex)
    val currentQuestion = activeQuestions.getOrNull(safeIndex)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
            .testTag("quizzes_screen")
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // Header + AI Quiz Generator
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "الاختبارات والتدريب",
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "اختبر نفسك في أي مادة أو موضوع تذاكره مع شرح الإجابة الصحيحة",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = { showAiQuizDialog = true },
                modifier = Modifier.testTag("open_ai_quiz_dialog"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("اختبار جديد")
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (uiState.quizzes.isNotEmpty()) {
            // Filter Chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 2.dp)
            ) {
                items(modes) { label ->
                    FilterChip(
                        selected = modeFilter.substringBefore(" ") == label.substringBefore(" "),
                        onClick = {
                            modeFilter = label
                            currentIndex = 0
                            selectedOption = null
                        },
                        label = { Text(label) }
                    )
                }
            }
        }

        if (uiState.isAiLoading) {
            Spacer(modifier = Modifier.height(8.dp))
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
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.5.dp)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "جارٍ إعداد أسئلة الاختبار مع الشرح...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (currentQuestion == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(48.dp)
                        )
                        Text(
                            text = if (uiState.quizzes.isEmpty()) {
                                "لا توجد أسئلة مضافة بعد"
                            } else {
                                "لا توجد أخطاء مسجلة حالياً!"
                            },
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = if (uiState.quizzes.isEmpty()) {
                                "اكتب اسم أي درس أو موضوع تذاكره ليقوم التطبيق بإنشاء اختبار تفاعلي مع شرح الإجابات."
                            } else {
                                "جميع إجاباتك السابقة صحيحة. يمكنك العودة لكل الأسئلة أو إنشاء اختبار جديد."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Button(
                            onClick = { showAiQuizDialog = true },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("إنشاء اختبار جديد")
                        }
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Progress & Score Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "السؤال ${safeIndex + 1} من ${activeQuestions.size} · ${currentQuestion.subject}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "النتيجة: $correctCount / $answeredCount",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                }

                LinearProgressIndicator(
                    progress = { (safeIndex + 1).toFloat() / activeQuestions.size.coerceAtLeast(1) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(6.dp))
                )

                // Question Card
                ElevatedCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.elevatedCardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        if (currentQuestion.caseVignette.isNotBlank()) {
                            Text(
                                text = currentQuestion.caseVignette,
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        Text(
                            text = currentQuestion.stem,
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Options List
                currentQuestion.options.forEachIndexed { idx, optionText ->
                    val isAnswered = selectedOption != null
                    val isSelected = selectedOption == idx
                    val isCorrectOption = idx == currentQuestion.correctIndex

                    val containerColor = when {
                        !isAnswered -> MaterialTheme.colorScheme.surface
                        isCorrectOption -> MaterialTheme.colorScheme.primaryContainer
                        isSelected -> MaterialTheme.colorScheme.error.copy(alpha = 0.14f)
                        else -> MaterialTheme.colorScheme.surface
                    }

                    val borderColor = when {
                        !isAnswered -> MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                        isCorrectOption -> MaterialTheme.colorScheme.primary
                        isSelected -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.5.dp, borderColor, RoundedCornerShape(16.dp))
                            .clickable(enabled = !isAnswered) {
                                selectedOption = idx
                                answeredCount++
                                val right = idx == currentQuestion.correctIndex
                                if (right) correctCount++
                                onRecordAnswer(currentQuestion.id, right)
                            }
                            .testTag("quiz_option_$idx"),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = containerColor)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${idx + 1}",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = optionText,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = if (isAnswered && isCorrectOption) FontWeight.Bold else FontWeight.Normal,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                            if (isAnswered && isCorrectOption) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "إجابة صحيحة",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            } else if (isAnswered && isSelected) {
                                Icon(
                                    imageVector = Icons.Default.Cancel,
                                    contentDescription = "إجابة خاطئة",
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }

                // Model Explanation Card (Shown immediately after selecting an option)
                if (selectedOption != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(
                                1.5.dp,
                                MaterialTheme.colorScheme.primary,
                                RoundedCornerShape(18.dp)
                            )
                            .testTag("quiz_explanation_card"),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Text(
                                text = currentQuestion.modelExplanation,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                selectedOption = null
                                currentIndex = (safeIndex + 1) % activeQuestions.size
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("next_question_button"),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text("السؤال التالي")
                        }
                        OutlinedButton(
                            onClick = { selectedOption = null },
                            modifier = Modifier.height(50.dp),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "إعادة المحاولة")
                        }
                    }
                }
            }
        }
    }

    if (showAiQuizDialog) {
        var quizTopic by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showAiQuizDialog = false },
            title = { Text("إنشاء اختبار جديد") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("اكتب اسم الدرس أو الموضوع في مادتك لإنشاء أسئلة اختيار من متعدد مع شرح الإجابات:")
                    OutlinedTextField(
                        value = quizTopic,
                        onValueChange = { quizTopic = it },
                        label = { Text("عنوان الدرس أو الموضوع") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("ai_quiz_topic_input")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (quizTopic.isNotBlank()) {
                            onGenerateAiQuiz(quizTopic)
                            showAiQuizDialog = false
                        }
                    },
                    modifier = Modifier.testTag("confirm_generate_quiz")
                ) {
                    Text("إنشاء الأسئلة")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showAiQuizDialog = false }) {
                    Text("إلغاء")
                }
            }
        )
    }
}
