package site.blackfighters.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import site.blackfighters.app.model.AiKeyPreference
import site.blackfighters.app.viewmodel.AcademicUiState

@Composable
fun SettingsScreen(
    uiState: AcademicUiState,
    onBack: () -> Unit,
    onSaveKey: (String, AiKeyPreference) -> Unit,
    onClearKey: () -> Unit,
    onTestKey: (String) -> Unit,
    onToggleDarkTheme: () -> Unit,
    onAdjustFontScale: (Float) -> Unit,
    onSendTestNotification: () -> Unit,
    onLogout: () -> Unit
) {
    BackHandler {
        onBack()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("settings_screen"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.testTag("settings_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "رجوع"
                        )
                    }
                    Column {
                        Text(
                            text = "إعدادات الحساب ومفتاح Gemini",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "إدارة مفتاح الذكاء الاصطناعي للمحاضرات، حسابك، والمظهر",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // 1. Authenticated Student Account Card
        item {
            ElevatedCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.elevatedCardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                            Column {
                                Text(
                                    text = uiState.profile.fullName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = uiState.profile.email,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = uiState.profile.authProvider,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Dedicated Personal Gemini API Key Settings Component
        item {
            UserGeminiKeySettingsCard(
                uiState = uiState,
                onSaveKey = onSaveKey,
                onClearKey = onClearKey,
                onTestKey = onTestKey
            )
        }

        // 3. Appearance & Reader Font Scale Settings
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "المظهر وحجم خط القراءة",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = if (uiState.darkTheme) Icons.Default.DarkMode else Icons.Default.LightMode,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Column {
                                Text(
                                    text = "الوضع الليلي المريح للعين",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                                Text(
                                    text = "تبديل ألوان الخلفية والبطاقات",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = uiState.darkTheme,
                            onCheckedChange = { onToggleDarkTheme() },
                            modifier = Modifier.testTag("settings_dark_mode_switch")
                        )
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "حجم خط المحاضرات والمذكرات",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = "المقياس الحالي: ${(uiState.readerFontScale * 100).toInt()}%",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilledTonalButton(
                                onClick = { onAdjustFontScale(-0.08f) },
                                modifier = Modifier.testTag("settings_font_decrease")
                            ) {
                                Text("A-")
                            }
                            FilledTonalButton(
                                onClick = { onAdjustFontScale(0.08f) },
                                modifier = Modifier.testTag("settings_font_increase")
                            ) {
                                Text("A+")
                            }
                        }
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Default.NotificationsActive,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Column {
                                Text(
                                    text = "إشعارات المذاكرة وتنبيهات الإدارة",
                                    style = MaterialTheme.typography.bodyLarge
                                )
                                Text(
                                    text = "اختبر وصول الإشعارات الفورية لجهازك",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        OutlinedButton(
                            onClick = onSendTestNotification,
                            modifier = Modifier.testTag("settings_test_notification_button")
                        ) {
                            Text("إرسال تنبيه")
                        }
                    }
                }
            }
        }

        // 4. Logout Button
        item {
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("settings_logout_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("تسجيل الخروج من الحساب")
            }
        }
    }
}

@Composable
fun UserGeminiKeySettingsCard(
    uiState: AcademicUiState,
    onSaveKey: (String, AiKeyPreference) -> Unit,
    onClearKey: () -> Unit,
    onTestKey: (String) -> Unit
) {
    var keyInput by remember(uiState.userGeminiKey) { mutableStateOf(uiState.userGeminiKey) }
    var selectedPreference by remember(uiState.keyPreference) { mutableStateOf(uiState.keyPreference) }
    var showKeyText by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("user_gemini_key_settings_card"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            1.5.dp,
            if (uiState.isAiReady) {
                MaterialTheme.colorScheme.primary.copy(alpha = 0.55f)
            } else {
                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.65f)
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Key,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Column {
                        Text(
                            text = "مفتاح Gemini API الشخصي (أولوية المحاضرات)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = uiState.activeKeyModeLabel,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Text(
                text = "عند إدخال مفتاح Gemini الخاص بك، يعطيه التطبيق الأولوية القصوى لتفريغ المحاضرات الصوتية والنصية وتلخيصها بسرعة، مع استمرار عمل التطبيق تلقائياً بمفتاح المنصة في حال عدم إضافته.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            OutlinedTextField(
                value = keyInput,
                onValueChange = { keyInput = it },
                label = { Text("مفتاح Gemini API الشخصي (يبدأ بـ AIza)") },
                placeholder = { Text("AIzaSy...") },
                singleLine = true,
                visualTransformation = if (showKeyText) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                trailingIcon = {
                    IconButton(onClick = { showKeyText = !showKeyText }) {
                        Icon(
                            imageVector = if (showKeyText) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (showKeyText) "إخفاء المفتاح" else "إظهار المفتاح"
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("settings_gemini_key_input"),
                shape = RoundedCornerShape(14.dp)
            )

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { selectedPreference = AiKeyPreference.AUTO_FALLBACK }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = selectedPreference == AiKeyPreference.AUTO_FALLBACK,
                        onClick = { selectedPreference = AiKeyPreference.AUTO_FALLBACK }
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "أولوية لمفتاحي الشخصي + تشغيل تلقائي بالمنصة (موصى به)",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "يستخدم مفتاحك أولاً، ويعمل تلقائياً بمفتاح المسؤول إذا تُرك فارغاً.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { selectedPreference = AiKeyPreference.USER_KEY_ONLY }
                        .padding(vertical = 4.dp),
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
                            text = "يشترط استخدام مفتاحك الخاص فقط لتفريغ وتلخيص المحاضرات.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            if (!uiState.keyTestResultMessage.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer
                ) {
                    Text(
                        text = uiState.keyTestResultMessage,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { onSaveKey(keyInput, selectedPreference) },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("settings_save_key_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("حفظ وتفعيل")
                }

                OutlinedButton(
                    onClick = { onTestKey(keyInput) },
                    enabled = !uiState.isTestingKey && keyInput.isNotBlank(),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("settings_test_key_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (uiState.isTestingKey) "جاري الفحص..." else "فحص المفتاح")
                }

                if (uiState.userGeminiKey.isNotBlank()) {
                    TextButton(
                        onClick = {
                            keyInput = ""
                            onClearKey()
                        },
                        modifier = Modifier.testTag("settings_clear_key_button")
                    ) {
                        Text("مسح")
                    }
                }
            }
        }
    }
}
