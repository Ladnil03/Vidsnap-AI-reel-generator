# ProGuard rules for VidSnap.AI Release Build

# Flutter Engine
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Preserve Flutter generated plugins
-keep class io.flutter.plugins.GeneratedPluginRegistrant { *; }

# Native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve serialized models and JSON reflection if any
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !static !transient <methods>;
    !private <methods>;
    <init>();
}

# Video player & media codecs
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**
