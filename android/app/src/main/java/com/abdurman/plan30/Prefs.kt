package com.abdurman.plan30

import android.content.Context

object Prefs {
    private const val NAME = "plan30"
    private const val KEY_CODE = "code"

    fun code(ctx: Context): String? =
        ctx.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString(KEY_CODE, null)?.takeIf { it.length == 6 }

    fun saveCode(ctx: Context, code: String) {
        ctx.getSharedPreferences(NAME, Context.MODE_PRIVATE).edit().putString(KEY_CODE, code).apply()
    }
}
