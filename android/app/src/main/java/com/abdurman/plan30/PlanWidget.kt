package com.abdurman.plan30

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

class PlanWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        Thread { renderAll(context, manager, appWidgetIds) }.start()
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_MARK -> {
                val taskId = intent.getStringExtra(EXTRA_TASK_ID)
                val code = Prefs.code(context)
                val pending = goAsync()
                Thread {
                    try {
                        if (code != null && taskId != null) Api.mark(code, taskId)
                        refreshAll(context)
                    } finally {
                        pending.finish()
                    }
                }.start()
            }
            ACTION_REFRESH -> {
                val pending = goAsync()
                Thread {
                    try { refreshAll(context) } finally { pending.finish() }
                }.start()
            }
            else -> super.onReceive(context, intent)
        }
    }

    companion object {
        const val ACTION_MARK = "com.abdurman.plan30.MARK"
        const val ACTION_REFRESH = "com.abdurman.plan30.REFRESH"
        const val EXTRA_TASK_ID = "task_id"

        private val ROWS = intArrayOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4)
        private val TITLES = intArrayOf(R.id.title1, R.id.title2, R.id.title3, R.id.title4)
        private val BUTTONS = intArrayOf(R.id.btn1, R.id.btn2, R.id.btn3, R.id.btn4)

        // Called from the app after the code changes, and from the widget after each tap.
        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, PlanWidget::class.java))
            if (ids.isNotEmpty()) renderAll(context, manager, ids)
        }

        private fun renderAll(context: Context, manager: AppWidgetManager, ids: IntArray) {
            val code = Prefs.code(context)
            val state: JSONObject? = if (code != null) Api.getState(code) else null
            for (id in ids) {
                manager.updateAppWidget(id, buildViews(context, code, state))
            }
        }

        private fun buildViews(context: Context, code: String?, state: JSONObject?): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_plan)

            views.setOnClickPendingIntent(
                R.id.header,
                PendingIntent.getActivity(
                    context, 2, Intent(context, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            )
            views.setOnClickPendingIntent(R.id.refresh, broadcast(context, ACTION_REFRESH, null, 1))

            if (code == null) {
                views.setTextViewText(R.id.summary, "افتح التطبيق وأدخل رمز الويدجت")
                hideRows(views)
                return views
            }
            if (state == null) {
                views.setTextViewText(R.id.summary, "تعذّر التحديث. اضغط تحديث")
                hideRows(views)
                return views
            }

            views.setTextViewText(R.id.summary, state.optString("summary", ""))
            val tasks = state.optJSONArray("tasks")
            val count = tasks?.length() ?: 0
            if (count == 0) {
                views.setTextViewText(R.id.summary, state.optString("summary", "") + " · لا مهام الآن")
            }
            for (i in ROWS.indices) {
                if (tasks != null && i < count) {
                    val task = tasks.getJSONObject(i)
                    views.setViewVisibility(ROWS[i], View.VISIBLE)
                    views.setTextViewText(TITLES[i], task.optString("at") + "  " + task.optString("label"))
                    views.setOnClickPendingIntent(
                        BUTTONS[i],
                        broadcast(context, ACTION_MARK, task.optString("id"), 10 + i)
                    )
                } else {
                    views.setViewVisibility(ROWS[i], View.GONE)
                }
            }
            return views
        }

        private fun hideRows(views: RemoteViews) {
            for (row in ROWS) views.setViewVisibility(row, View.GONE)
        }

        private fun broadcast(context: Context, action: String, taskId: String?, requestCode: Int): PendingIntent {
            val intent = Intent(context, PlanWidget::class.java).setAction(action)
            if (taskId != null) intent.putExtra(EXTRA_TASK_ID, taskId)
            return PendingIntent.getBroadcast(
                context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
