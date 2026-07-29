// Standalone JVM module for the parts of the run-capture layer that carry no Android
// dependency. Keeping the journal, the upload queue and the anomaly checks free of the
// Android framework is what allows them to be unit tested without a device or emulator.
pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositories { mavenCentral() }
}
rootProject.name = "runningup-running-core"
