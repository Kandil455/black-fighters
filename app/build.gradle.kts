plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.secrets)
}

android {
    namespace = "site.blackfighters.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "site.blackfighters.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        create("debugConfig") {
            storeFile = file("${rootDir}/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debugConfig")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debugConfig")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

val defaultEnvExampleFile = rootProject.file(".env.example")
if (!defaultEnvExampleFile.exists()) {
    defaultEnvExampleFile.writeText("# Optional platform secrets\n")
}

secrets {
    propertiesFileName = ".env"
    defaultPropertiesFileName = ".env.example"
}

val rootEnvFile = rootProject.file(".env")
if (rootEnvFile.exists()) {
    val sanitizedLines = rootEnvFile.readLines().map { line ->
        val trimmed = line.trim()
        if (trimmed.isNotEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
            val key = trimmed.substringBefore("=").trim()
            val value = trimmed.substringAfter("=").trim()
            if (value.isEmpty() || value == "\"\"" || value == "''") {
                "$key=placeholder"
            } else {
                line
            }
        } else {
            line
        }
    }
    rootEnvFile.writeText(sanitizedLines.joinToString("\n") + "\n")
}

tasks.matching { it.name.startsWith("generate") && it.name.endsWith("BuildConfig") }.configureEach {
    doLast {
        outputs.files.files.forEach { dir ->
            dir.walkTopDown()
                .filter { it.isFile && it.name == "BuildConfig.java" }
                .forEach { bcFile ->
                    val content = bcFile.readText()
                    if (content.contains("= ;")) {
                        bcFile.writeText(content.replace("= ;", "= \"placeholder\";"))
                    }
                }
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.webkit)
}
