package site.blackfighters.app.ui.screens

import android.accounts.AccountManager
import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun AuthScreen(
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onStandardLogin: (name: String, email: String) -> Unit,
    onGoogleLogin: (name: String, email: String) -> Unit = { name, email -> onStandardLogin(name, email) }
) {
    var isRegisterMode by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    var showGoogleAuthDialog by remember { mutableStateOf(false) }
    var googleNameInput by remember { mutableStateOf("") }
    var googleEmailInput by remember { mutableStateOf("") }
    var googleDialogError by remember { mutableStateOf<String?>(null) }
    var showWalkthroughVideo by remember { mutableStateOf(false) }

    if (showWalkthroughVideo) {
        WalkthroughVideoDialog(
            onDismiss = { showWalkthroughVideo = false }
        )
    }

    val googleAccountPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val pickedEmail = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)?.trim().orEmpty()
            if (pickedEmail.isNotEmpty()) {
                val derivedName = pickedEmail.substringBefore("@")
                    .replace(".", " ")
                    .replace("_", " ")
                    .trim()
                    .ifBlank { "طالب Google" }
                onGoogleLogin(derivedName, pickedEmail)
                return@rememberLauncherForActivityResult
            }
        }
        // Fallback if emulator/device has no OS Google account configured
        showGoogleAuthDialog = true
    }

    if (showGoogleAuthDialog) {
        AlertDialog(
            onDismissRequest = {
                showGoogleAuthDialog = false
                googleDialogError = null
            },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    GoogleBadgeIcon()
                    Column {
                        Text(
                            text = if (isRegisterMode) "إنشاء حساب باستخدام Google" else "تسجيل الدخول باستخدام Google",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "حساب Google الأكاديمي السريع",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "أدخل بريد Gmail الخاص بك للمتابعة الفورية أو إنشاء حسابك الأكاديمي على المنصة:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    OutlinedTextField(
                        value = googleNameInput,
                        onValueChange = {
                            googleNameInput = it
                            googleDialogError = null
                        },
                        label = { Text("الاسم الكامل (اختياري)") },
                        placeholder = { Text("مثال: أحمد محمد") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("google_name_input"),
                        shape = RoundedCornerShape(12.dp)
                    )

                    OutlinedTextField(
                        value = googleEmailInput,
                        onValueChange = {
                            googleEmailInput = it
                            googleDialogError = null
                        },
                        label = { Text("بريد Google الإلكتروني") },
                        placeholder = { Text("name@gmail.com") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("google_email_input"),
                        shape = RoundedCornerShape(12.dp)
                    )

                    if (googleDialogError != null) {
                        Text(
                            text = googleDialogError!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))

                    Text(
                        text = "أو اختر حساب Google جاهزاً للمتابعة السريعة:",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onGoogleLogin("طالب جامعي", "student@gmail.com")
                                showGoogleAuthDialog = false
                            }
                            .testTag("google_quick_account_card"),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                GoogleBadgeIcon()
                                Column {
                                    Text(
                                        text = "طالب جامعي",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "student@gmail.com",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val cleanEmail = googleEmailInput.trim()
                        if (cleanEmail.isEmpty() || !cleanEmail.contains("@")) {
                            googleDialogError = "يرجى إدخال بريد إلكتروني صحيح (مثل example@gmail.com)"
                        } else {
                            val cleanName = googleNameInput.trim().ifBlank {
                                cleanEmail.substringBefore("@").replace(".", " ")
                            }
                            showGoogleAuthDialog = false
                            onGoogleLogin(cleanName, cleanEmail)
                        }
                    },
                    modifier = Modifier.testTag("confirm_google_login_button")
                ) {
                    Text(if (isRegisterMode) "إنشاء الحساب والمتابعة" else "متابعة بحساب Google")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showGoogleAuthDialog = false
                        googleDialogError = null
                    }
                ) {
                    Text("إلغاء")
                }
            }
        )
    }

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .testTag("auth_screen"),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 540.dp)
            ) {
                // Top Header & Theme Switcher
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(
                                    Brush.linearGradient(
                                        listOf(
                                            MaterialTheme.colorScheme.primary,
                                            MaterialTheme.colorScheme.secondary
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.School,
                                contentDescription = "شعار المنصة",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(26.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Black Fighters",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                            Text(
                                text = "منصة المذاكرة وتنظيم المحاضرات",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    IconButton(
                        onClick = onToggleTheme,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .testTag("auth_theme_toggle")
                    ) {
                        Icon(
                            imageVector = if (darkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "تبديل المظهر",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(22.dp))

                // Hero Banner Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "مذاكرة أسهل وتنظيم ذكي لكل موادك",
                            style = MaterialTheme.typography.headlineSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "فرّغ محاضراتك الصوتية والنصية، ولخّص دروسك، واختبر نفسك في أي مادة تدرسها بواجهة بسيطة وسريعة.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FeatureBadge(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.MenuBook,
                                label = "تفريغ وملخصات"
                            )
                            FeatureBadge(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.Quiz,
                                label = "اختبارات ذكية"
                            )
                            FeatureBadge(
                                modifier = Modifier.weight(1f),
                                icon = Icons.Default.AutoAwesome,
                                label = "مفتاح Gemini"
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { showWalkthroughVideo = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                                .testTag("open_walkthrough_video_auth_button"),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            Text(
                                text = "🎬 شاهد فيديو شرح المنصة بالصوت والأنيميشن (5 دقائق)",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Standard & Google Login / Register Form
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilledTonalButton(
                                onClick = {
                                    isRegisterMode = false
                                    errorMessage = null
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("tab_sign_in"),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = if (!isRegisterMode) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    }
                                )
                            ) {
                                Text("تسجيل الدخول")
                            }
                            FilledTonalButton(
                                onClick = {
                                    isRegisterMode = true
                                    errorMessage = null
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("tab_register"),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = if (isRegisterMode) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    }
                                )
                            ) {
                                Text("إنشاء حساب جديد")
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Prominent Google Sign-In / Sign-Up Button
                        OutlinedButton(
                            onClick = {
                                runCatching {
                                    @Suppress("DEPRECATION")
                                    val intent = AccountManager.newChooseAccountIntent(
                                        null,
                                        null,
                                        arrayOf("com.google"),
                                        null,
                                        null,
                                        null,
                                        null
                                    )
                                    googleAccountPickerLauncher.launch(intent)
                                }.onFailure {
                                    showGoogleAuthDialog = true
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("google_sign_in_button"),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.55f))
                        ) {
                            GoogleBadgeIcon()
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = if (isRegisterMode) {
                                    "إنشاء حساب سريع باستخدام Google"
                                } else {
                                    "تسجيل الدخول السريع باستخدام Google"
                                },
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f))
                            Text(
                                text = "أو عبر البريد الإلكتروني",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            HorizontalDivider(modifier = Modifier.weight(1f))
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (isRegisterMode) {
                            OutlinedTextField(
                                value = fullName,
                                onValueChange = {
                                    fullName = it
                                    errorMessage = null
                                },
                                label = { Text("الاسم الكامل") },
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null)
                                },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("input_full_name"),
                                shape = RoundedCornerShape(14.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                        }

                        OutlinedTextField(
                            value = email,
                            onValueChange = {
                                email = it
                                errorMessage = null
                            },
                            label = { Text("البريد الإلكتروني") },
                            leadingIcon = {
                                Icon(Icons.Default.School, contentDescription = null)
                            },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_email"),
                            shape = RoundedCornerShape(14.dp)
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = password,
                            onValueChange = {
                                password = it
                                errorMessage = null
                            },
                            label = { Text("كلمة المرور") },
                            leadingIcon = {
                                Icon(Icons.Default.Lock, contentDescription = null)
                            },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("input_password"),
                            shape = RoundedCornerShape(14.dp)
                        )

                        if (errorMessage != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = errorMessage!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                if (email.isBlank() || password.isBlank()) {
                                    errorMessage = "يرجى إدخال البريد الإلكتروني وكلمة المرور"
                                } else {
                                    onStandardLogin(fullName, email)
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .testTag("submit_auth_button"),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text(
                                text = if (isRegisterMode) "إنشاء الحساب والدخول" else "تسجيل الدخول",
                                style = MaterialTheme.typography.labelLarge
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedButton(
                            onClick = { onStandardLogin("طالب زائر", "guest@student.edu") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .testTag("guest_login_button"),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text("الدخول السريع كطالب زائر")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GoogleBadgeIcon() {
    Box(
        modifier = Modifier
            .size(26.dp)
            .clip(CircleShape)
            .background(Color(0xFF4285F4)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "G",
            color = Color.White,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 14.sp
        )
    }
}

@Composable
private fun FeatureBadge(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
