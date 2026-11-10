package site.blackfighters.app.ui.screens

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Flip
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilledTonalButton
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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import site.blackfighters.app.BuildConfig
import site.blackfighters.app.security.StudentAppSecurityGuard
import site.blackfighters.app.viewmodel.AcademicUiState

@Composable
fun FlashcardsScreen(
    uiState: AcademicUiState,
    onRateCard: (cardId: String, quality: Int) -> Unit,
    onAddCard: (subject: String, front: String, back: String, pearl: String) -> Unit
) {
    val cards = uiState.flashcards
    var currentIndex by remember { mutableIntStateOf(0) }
    var isFlipped by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }

    val safeIndex = if (cards.isEmpty()) 0 else currentIndex.coerceIn(0, cards.lastIndex)
    val currentCard = cards.getOrNull(safeIndex)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
            .testTag("flashcards_screen")
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "بطاقات المراجعة",
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "سؤال وجواب لحفظ ومراجعة أهم النقاط في مادتك",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(
                onClick = { showAddDialog = true },
                modifier = Modifier.testTag("add_flashcard_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("بطاقة جديدة")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (currentCard == null) {
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
                        text = "لا توجد بطاقات مضافة بعد",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "أضف بطاقات سؤال وجواب خاصة بمادتك لمراجعتها في أي وقت بسهولة.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Button(
                        onClick = { showAddDialog = true },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("إضافة بطاقة جديدة")
                    }
                }
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer
                ) {
                    Text(
                        text = "${currentCard.subject} · البطاقة ${safeIndex + 1} من ${cards.size}",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
                Text(
                    text = "المراجعة: ${currentCard.nextIntervalLabel}",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Interactive Flip Card
            ElevatedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(
                        width = 1.5.dp,
                        color = if (isFlipped) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                        },
                        shape = RoundedCornerShape(24.dp)
                    )
                    .clickable { isFlipped = !isFlipped }
                    .testTag("flashcard_active_card"),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.elevatedCardColors(
                    containerColor = if (isFlipped) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surface
                    }
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isFlipped) "الإجابة" else "السؤال",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Flip,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isFlipped) "وجه السؤال" else "اقلب البطاقة",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        if (!isFlipped) {
                            Text(
                                text = currentCard.frontQuestion,
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (currentCard.frontHint.isNotBlank()) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant
                                ) {
                                    Text(
                                        text = "تلميح: ${currentCard.frontHint}",
                                        modifier = Modifier.padding(12.dp),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        } else {
                            Text(
                                text = currentCard.backAnswer,
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            HorizontalDivider()
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)
                            ) {
                                Text(
                                    text = "ملاحظة: ${currentCard.memoryPearl}",
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }

                    Text(
                        text = if (!isFlipped) {
                            "اضغط على البطاقة لإظهار الإجابة"
                        } else {
                            "اختر مدى سهولة تذكرك للمعلومة:"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Interval Rating Buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FsrsRatingButton(
                    modifier = Modifier.weight(1f),
                    title = "صعب",
                    interval = "10 د",
                    tag = "fsrs_rate_1",
                    onClick = {
                        onRateCard(currentCard.id, 1)
                        isFlipped = false
                        currentIndex = (safeIndex + 1) % cards.size
                    }
                )
                FsrsRatingButton(
                    modifier = Modifier.weight(1f),
                    title = "متوسط",
                    interval = "1 يوم",
                    tag = "fsrs_rate_2",
                    onClick = {
                        onRateCard(currentCard.id, 2)
                        isFlipped = false
                        currentIndex = (safeIndex + 1) % cards.size
                    }
                )
                FsrsRatingButton(
                    modifier = Modifier.weight(1f),
                    title = "جيد",
                    interval = "3 أيام",
                    tag = "fsrs_rate_3",
                    onClick = {
                        onRateCard(currentCard.id, 3)
                        isFlipped = false
                        currentIndex = (safeIndex + 1) % cards.size
                    }
                )
                FsrsRatingButton(
                    modifier = Modifier.weight(1f),
                    title = "ممتاز",
                    interval = "7 أيام",
                    tag = "fsrs_rate_4",
                    isPrimary = true,
                    onClick = {
                        onRateCard(currentCard.id, 4)
                        isFlipped = false
                        currentIndex = (safeIndex + 1) % cards.size
                    }
                )
            }
        }
    }

    if (showAddDialog) {
        var subject by remember { mutableStateOf("") }
        var front by remember { mutableStateOf("") }
        var back by remember { mutableStateOf("") }
        var pearl by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("إضافة بطاقة مراجعة جديدة") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = subject,
                        onValueChange = { subject = it },
                        label = { Text("اسم المادة") },
                        placeholder = { Text("مثال: محاسبة، إدارة، علوم...") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = front,
                        onValueChange = { front = it },
                        label = { Text("السؤال") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("new_card_front")
                    )
                    OutlinedTextField(
                        value = back,
                        onValueChange = { back = it },
                        label = { Text("الإجابة") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("new_card_back")
                    )
                    OutlinedTextField(
                        value = pearl,
                        onValueChange = { pearl = it },
                        label = { Text("ملاحظة سريعة (اختياري)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (front.isNotBlank() && back.isNotBlank()) {
                            onAddCard(subject.ifBlank { "عام" }, front, back, pearl)
                            showAddDialog = false
                        }
                    },
                    modifier = Modifier.testTag("confirm_add_flashcard")
                ) {
                    Text("إضافة البطاقة")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showAddDialog = false }) {
                    Text("إلغاء")
                }
            }
        )
    }
}

@Composable
private fun FsrsRatingButton(
    modifier: Modifier = Modifier,
    title: String,
    interval: String,
    tag: String,
    isPrimary: Boolean = false,
    onClick: () -> Unit
) {
    if (isPrimary) {
        Button(
            onClick = onClick,
            modifier = modifier
                .height(58.dp)
                .testTag(tag),
            shape = RoundedCornerShape(14.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = title, style = MaterialTheme.typography.labelLarge)
                Text(text = interval, style = MaterialTheme.typography.bodySmall)
            }
        }
    } else {
        FilledTonalButton(
            onClick = onClick,
            modifier = modifier
                .height(58.dp)
                .testTag(tag),
            shape = RoundedCornerShape(14.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = title, style = MaterialTheme.typography.labelLarge)
                Text(text = interval, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AiTutorAndPortalScreen(
    uiState: AcademicUiState,
    onSendQuestion: (String) -> Unit,
    onToggleCloudPortal: (Boolean) -> Unit
) {
    if (uiState.showCloudPortal) {
        BackHandler { onToggleCloudPortal(false) }
        val portalUrl = "https://blackfighters.site"
        Column(modifier = Modifier.fillMaxSize()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 3.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { onToggleCloudPortal(false) },
                            modifier = Modifier.testTag("close_cloud_portal_button")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "رجوع للتطبيق"
                            )
                        }
                        Text(
                            text = "الموقع الإلكتروني",
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }
            }
            AndroidView(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("lite_cloud_webview"),
                factory = { context ->
                    WebView(context).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            loadsImagesAutomatically = true
                            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                            useWideViewPort = true
                            loadWithOverviewMode = true
                            userAgentString = "$userAgentString BlackFightersStudentApp/1.0"
                        }
                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): Boolean {
                                val targetUrl = request?.url?.toString().orEmpty()
                                if (!StudentAppSecurityGuard.isUrlSafeForStudentApp(targetUrl)) {
                                    return true // Strictly block admin or unauthorized URLs
                                }
                                return false
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                if (url != null && !StudentAppSecurityGuard.isUrlSafeForStudentApp(url)) {
                                    view?.loadUrl(portalUrl)
                                    return
                                }
                                // Automatically activate Lite performance mode on Android WebView
                                view?.evaluateJavascript(
                                    "document.documentElement.setAttribute('data-tier','lite');" +
                                        "document.documentElement.setAttribute('data-performance','saver');",
                                    null
                                )
                            }
                        }
                        if (StudentAppSecurityGuard.isUrlSafeForStudentApp(portalUrl)) {
                            loadUrl(portalUrl)
                        }
                    }
                }
            )
        }
        return
    }

    var inputQuestion by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
            .testTag("ai_tutor_screen")
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "المساعد الذكي",
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = "اسأل في أي مادة أو موضوع تدرسه وسيتم شرحه لك ببساطة",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            OutlinedButton(
                onClick = { onToggleCloudPortal(true) },
                modifier = Modifier.testTag("open_cloud_portal_button"),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Language, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("موقع الويب")
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Chat Messages List
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            items(uiState.aiMessages, key = { it.id }) { msg ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (msg.senderIsUser) Arrangement.Start else Arrangement.End
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth(0.92f),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (msg.senderIsUser) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.surface
                            }
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = if (msg.senderIsUser) "أنت" else "المساعد الذكي",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = msg.text,
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (msg.senderIsUser) {
                                    MaterialTheme.colorScheme.onPrimaryContainer
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                }
                            )
                        }
                    }
                }
            }

            if (uiState.isAiLoading) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "جارٍ كتابة الإجابة...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        // Input Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = inputQuestion,
                onValueChange = { inputQuestion = it },
                placeholder = { Text("اكتب سؤالك في أي مادة تدرسها...") },
                modifier = Modifier
                    .weight(1f)
                    .testTag("tutor_question_input"),
                shape = RoundedCornerShape(16.dp),
                singleLine = true
            )
            Button(
                onClick = {
                    if (inputQuestion.isNotBlank()) {
                        onSendQuestion(inputQuestion)
                        inputQuestion = ""
                    }
                },
                modifier = Modifier
                    .height(54.dp)
                    .testTag("send_tutor_question_button"),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = "إرسال"
                )
            }
        }
    }
}
