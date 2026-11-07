package com.abdurman.plan30

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.browser.trusted.TwaLauncher

// Opens the plan site full screen in a trusted web activity (Chrome engine),
// so the page, its service worker and its push notifications behave as on the web.
class MainActivity : ComponentActivity() {
    private val siteUrl = "https://leafy-baklava-130180.netlify.app/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        TwaLauncher(this).launch(Uri.parse(siteUrl))
    }
}
