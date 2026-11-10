package site.blackfighters.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import site.blackfighters.app.model.MainTab
import site.blackfighters.app.ui.screens.AiTutorAndPortalScreen
import site.blackfighters.app.ui.screens.AuthScreen
import site.blackfighters.app.ui.screens.DashboardScreen
import site.blackfighters.app.ui.screens.FlashcardsScreen
import site.blackfighters.app.ui.screens.GeminiKeySettingsDialog
import site.blackfighters.app.ui.screens.LecturesScreen
import site.blackfighters.app.ui.screens.NotificationsCenterDialog
import site.blackfighters.app.ui.screens.QuizzesScreen
import site.blackfighters.app.ui.screens.SettingsScreen
import site.blackfighters.app.ui.screens.SummariesScreen
import site.blackfighters.app.ui.theme.BlackFightersTheme
import site.blackfighters.app.viewmodel.AcademicViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val academicViewModel: AcademicViewModel = viewModel()
            val uiState by academicViewModel.uiState.collectAsState()

            BlackFightersTheme(darkTheme = uiState.darkTheme) {
                if (!uiState.profile.isLoggedIn) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.background)
                            .windowInsetsPadding(WindowInsets.safeDrawing)
                    ) {
                        AuthScreen(
                            darkTheme = uiState.darkTheme,
                            onToggleTheme = academicViewModel::toggleDarkTheme,
                            onStandardLogin = academicViewModel::loginWithCredentials,
                            onGoogleLogin = academicViewModel::loginWithGoogle
                        )
                    }
                } else {
                    MainAcademicShell(
                        viewModel = academicViewModel
                    )
                }
            }
        }
    }
}

@Composable
fun MainAcademicShell(
    viewModel: AcademicViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ -> }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    BackHandler(enabled = uiState.currentTab != MainTab.HOME) {
        viewModel.selectTab(MainTab.HOME)
    }

    if (uiState.showKeySettingsDialog) {
        GeminiKeySettingsDialog(
            uiState = uiState,
            onDismiss = { viewModel.toggleKeySettingsDialog(false) },
            onSaveKey = viewModel::saveUserGeminiKey,
            onClearKey = viewModel::clearUserGeminiKey,
            onTestKey = viewModel::testUserGeminiKey
        )
    }

    if (uiState.showNotificationsDialog) {
        NotificationsCenterDialog(
            notifications = uiState.notifications,
            onDismiss = { viewModel.toggleNotificationsDialog(false) },
            onMarkAllRead = viewModel::markAllNotificationsRead,
            onSendStudyReminder = viewModel::triggerStudyReminderNotification,
            onSyncAdminNotifications = viewModel::syncAdminBroadcastNotifications
        )
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("main_scaffold"),
        topBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 2.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(WindowInsets.safeDrawing.onlyTop())
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.primary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.School,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "IIIAK · Black Fighters",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "المستوى ${uiState.profile.level} · ${uiState.activeKeyModeLabel}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = { viewModel.toggleKeySettingsDialog(true) },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(
                                        if (uiState.hasValidUserKey) {
                                            MaterialTheme.colorScheme.primaryContainer
                                        } else {
                                            MaterialTheme.colorScheme.surfaceVariant
                                        }
                                    )
                                    .size(38.dp)
                                    .testTag("open_key_settings_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Key,
                                    contentDescription = "إعدادات مفتاح Gemini",
                                    tint = if (uiState.hasValidUserKey) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            IconButton(
                                onClick = { viewModel.toggleNotificationsDialog(true) },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .size(38.dp)
                                    .testTag("open_notifications_button")
                            ) {
                                BadgedBox(
                                    badge = {
                                        if (uiState.unreadNotificationsCount > 0) {
                                            Badge {
                                                Text(
                                                    text = uiState.unreadNotificationsCount.toString(),
                                                    fontSize = 10.sp
                                                )
                                            }
                                        }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Notifications,
                                        contentDescription = "الإشعارات",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            IconButton(
                                onClick = viewModel::toggleDarkTheme,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .size(38.dp)
                                    .testTag("top_theme_toggle")
                            ) {
                                Icon(
                                    imageVector = if (uiState.darkTheme) {
                                        Icons.Default.LightMode
                                    } else {
                                        Icons.Default.DarkMode
                                    },
                                    contentDescription = "تبديل الثيم",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            IconButton(
                                onClick = { viewModel.toggleSettingsScreen(!uiState.showSettingsScreen) },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(
                                        if (uiState.showSettingsScreen) {
                                            MaterialTheme.colorScheme.primaryContainer
                                        } else {
                                            MaterialTheme.colorScheme.surfaceVariant
                                        }
                                    )
                                    .size(38.dp)
                                    .testTag("open_settings_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Settings,
                                    contentDescription = "الإعدادات",
                                    tint = if (uiState.showSettingsScreen) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            IconButton(
                                onClick = viewModel::logout,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .size(38.dp)
                                    .testTag("logout_button")
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.Logout,
                                    contentDescription = "تسجيل الخروج",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    AnimatedVisibility(visible = uiState.statusBanner != null) {
                        uiState.statusBanner?.let { banner ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 4.dp)
                                    .clickable { viewModel.dismissBanner() },
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.primaryContainer
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = banner,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "إغلاق",
                                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 4.dp
            ) {
                NavigationBarItem(
                    selected = !uiState.showSettingsScreen && uiState.currentTab == MainTab.HOME,
                    onClick = { viewModel.selectTab(MainTab.HOME) },
                    icon = { Icon(Icons.Default.Home, contentDescription = "الرئيسية") },
                    label = { Text("الرئيسية", fontSize = 10.sp) },
                    modifier = Modifier.testTag("nav_tab_home")
                )
                NavigationBarItem(
                    selected = !uiState.showSettingsScreen && uiState.currentTab == MainTab.LECTURES,
                    onClick = { viewModel.selectTab(MainTab.LECTURES) },
                    icon = { Icon(Icons.Default.GraphicEq, contentDescription = "المحاضرات") },
                    label = { Text("المحاضرات", fontSize = 10.sp) },
                    modifier = Modifier.testTag("nav_tab_lectures")
                )
                NavigationBarItem(
                    selected = !uiState.showSettingsScreen && uiState.currentTab == MainTab.SUMMARIES,
                    onClick = { viewModel.selectTab(MainTab.SUMMARIES) },
                    icon = { Icon(Icons.Default.MenuBook, contentDescription = "الملخصات") },
                    label = { Text("الملخصات", fontSize = 10.sp) },
                    modifier = Modifier.testTag("nav_tab_summaries")
                )
                NavigationBarItem(
                    selected = !uiState.showSettingsScreen && uiState.currentTab == MainTab.QUIZZES,
                    onClick = { viewModel.selectTab(MainTab.QUIZZES) },
                    icon = { Icon(Icons.Default.Quiz, contentDescription = "الاختبارات") },
                    label = { Text("الاختبارات", fontSize = 10.sp) },
                    modifier = Modifier.testTag("nav_tab_quizzes")
                )
                NavigationBarItem(
                    selected = !uiState.showSettingsScreen && uiState.currentTab == MainTab.FLASHCARDS,
                    onClick = { viewModel.selectTab(MainTab.FLASHCARDS) },
                    icon = { Icon(Icons.Default.Style, contentDescription = "البطاقات") },
                    label = { Text("البطاقات", fontSize = 10.sp) },
                    modifier = Modifier.testTag("nav_tab_flashcards")
                )
                NavigationBarItem(
                    selected = !uiState.showSettingsScreen && uiState.currentTab == MainTab.AI_TUTOR,
                    onClick = { viewModel.selectTab(MainTab.AI_TUTOR) },
                    icon = { Icon(Icons.Default.AutoAwesome, contentDescription = "المساعد الذكي") },
                    label = { Text("المساعد", fontSize = 10.sp) },
                    modifier = Modifier.testTag("nav_tab_tutor")
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            if (uiState.showSettingsScreen) {
                SettingsScreen(
                    uiState = uiState,
                    onBack = { viewModel.toggleSettingsScreen(false) },
                    onSaveKey = viewModel::saveUserGeminiKey,
                    onClearKey = viewModel::clearUserGeminiKey,
                    onTestKey = viewModel::testUserGeminiKey,
                    onToggleDarkTheme = viewModel::toggleDarkTheme,
                    onAdjustFontScale = viewModel::adjustFontScale,
                    onSendTestNotification = viewModel::triggerStudyReminderNotification,
                    onLogout = viewModel::logout
                )
            } else {
                when (uiState.currentTab) {
                    MainTab.HOME -> DashboardScreen(
                        uiState = uiState,
                        onSelectTab = viewModel::selectTab,
                        onOpenSummary = viewModel::openSummary,
                        onCompleteMission = viewModel::completeMission,
                        onTogglePomodoro = viewModel::togglePomodoro,
                        onResetPomodoro = viewModel::resetPomodoro
                    )

                    MainTab.LECTURES -> LecturesScreen(
                        uiState = uiState,
                        onSelectLecture = viewModel::openLecture,
                        onAdjustFontScale = viewModel::adjustFontScale,
                        onOpenKeySettings = { viewModel.toggleKeySettingsDialog(true) },
                        onTranscribeText = viewModel::transcribeLectureFromText,
                        onTranscribeAudioUri = viewModel::transcribeLectureFromAudioUri,
                        onConvertToSummary = viewModel::convertLectureToSummary,
                        onGenerateQuizFromLecture = viewModel::generateQuizFromLecture
                    )

                    MainTab.SUMMARIES -> SummariesScreen(
                        uiState = uiState,
                        onOpenSummary = viewModel::openSummary,
                        onToggleBookmark = viewModel::toggleBookmark,
                        onAdjustFontScale = viewModel::adjustFontScale,
                        onGenerateAiSummary = viewModel::generateAiSummary,
                        onStartQuizTab = { viewModel.selectTab(MainTab.QUIZZES) }
                    )

                    MainTab.QUIZZES -> QuizzesScreen(
                        uiState = uiState,
                        onRecordAnswer = viewModel::recordQuizAnswer,
                        onGenerateAiQuiz = viewModel::generateAiQuiz
                    )

                    MainTab.FLASHCARDS -> FlashcardsScreen(
                        uiState = uiState,
                        onRateCard = viewModel::rateFlashcard,
                        onAddCard = viewModel::addCustomFlashcard
                    )

                    MainTab.AI_TUTOR -> AiTutorAndPortalScreen(
                        uiState = uiState,
                        onSendQuestion = viewModel::sendTutorQuestion,
                        onToggleCloudPortal = viewModel::toggleCloudPortal
                    )
                }
            }
        }
    }
}

@Composable
private fun WindowInsets.onlyTop(): WindowInsets {
    return this.only(WindowInsetsSides.Top)
}
