plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.abdurman.plan30"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.abdurman.plan30"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    // One fixed signing key for every build, so each new APK installs over the previous one.
    signingConfigs {
        create("plan30") {
            storeFile = file("../signing/plan30.jks")
            storePassword = "plan30pass"
            keyAlias = "plan30"
            keyPassword = "plan30pass"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("plan30")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("plan30")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.browser:browser:1.8.0")
}
