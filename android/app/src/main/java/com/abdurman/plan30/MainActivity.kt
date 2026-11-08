package com.abdurman.plan30

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.browser.customtabs.CustomTabsIntent

// First screen: enter the widget sync code, then open the plan in a Chrome Custom Tab.
class MainActivity : Activity() {
    private val siteUrl = "https://leafy-baklava-130180.netlify.app/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val input = findViewById<EditText>(R.id.codeInput)
        input.setText(Prefs.code(this) ?: "")

        findViewById<Button>(R.id.saveBtn).setOnClickListener {
            val code = input.text.toString().trim().uppercase()
            if (code.length != 6) {
                Toast.makeText(this, "الرمز يتكون من 6 أحرف", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            Prefs.saveCode(this, code)
            PlanWidget.refreshAll(this)
            CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
                .launchUrl(this, Uri.parse(siteUrl))
        }
    }
}
