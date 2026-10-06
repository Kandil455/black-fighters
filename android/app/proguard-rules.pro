# Black Fighters — Production ProGuard Obfuscation & Security Rules

# Protect Capacitor Core & Plugins
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class site.blackfighters.app.** { *; }

# Keep JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods and classes
-keepclasseswithmembernames class * {
    native <methods>;
}

# Obfuscate all internal classes and methods
-repackageclasses ''
-allowaccessmodification

# Hide sensitive details
-dontskipnonpubliclibraryclasses
-dontskipnonpubliclibraryclassmembers
