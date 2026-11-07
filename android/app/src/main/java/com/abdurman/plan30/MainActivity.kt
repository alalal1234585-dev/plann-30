package com.abdurman.plan30

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import androidx.browser.customtabs.CustomTabsIntent

// Opens the plan site in a Chrome Custom Tab, so the page, its service worker
// and its web push notifications work the same as in Chrome.
class MainActivity : Activity() {
    private val siteUrl = "https://leafy-baklava-130180.netlify.app/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
            .launchUrl(this, Uri.parse(siteUrl))
    }
}
