package com.abdurman.plan30

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.TimeZone

object Api {
    const val BASE = "https://leafy-baklava-130180.netlify.app/api"

    // Minutes ahead of UTC for the phone's current zone (the server needs it to know "today").
    private fun tzMinutes(): Int = TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000

    fun getState(code: String): JSONObject? {
        val conn = URL("$BASE?code=$code&tz=${tzMinutes()}").openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
        return try {
            if (conn.responseCode != 200) null
            else JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
        } catch (e: Exception) {
            null
        } finally {
            conn.disconnect()
        }
    }

    fun mark(code: String, taskId: String): Boolean {
        val conn = URL(BASE).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
        conn.setRequestProperty("Content-Type", "application/json")
        val body = JSONObject()
            .put("action", "mark")
            .put("code", code)
            .put("id", taskId)
            .put("tzOffset", tzMinutes())
            .toString()
        return try {
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            conn.responseCode == 200
        } catch (e: Exception) {
            false
        } finally {
            conn.disconnect()
        }
    }
}
