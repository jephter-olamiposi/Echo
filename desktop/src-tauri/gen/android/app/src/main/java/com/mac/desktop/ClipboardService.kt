package com.mac.desktop

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import android.app.Service
import android.os.IBinder
import android.content.SharedPreferences

class ClipboardService : Service() {
    private var clipboardManager: android.content.ClipboardManager? = null
    private var lastClipContent: String? = null
    private val prefs: SharedPreferences by lazy {
        getSharedPreferences("echo_clipboard_service", Context.MODE_PRIVATE)
    }

    companion object {
        const val CHANNEL_ID = "echo_clipboard_sync"
        const val NOTIFICATION_ID = 1

        fun start(context: Context) {
            val intent = Intent(context, ClipboardService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        setupClipboardListener()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Clipboard Sync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Echo running to sync clipboard"
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): android.app.Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Echo")
            .setContentText("Clipboard sync is active")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun setupClipboardListener() {
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
        lastClipContent = clipboardManager?.primaryClip?.getItemAt(0)?.text?.toString()

        clipboardManager?.addPrimaryClipChangedListener {
            val clip = clipboardManager?.primaryClip
            val content = clip?.getItemAt(0)?.text?.toString()

            if (content != null && content != lastClipContent && content.isNotBlank()) {
                lastClipContent = content
                prefs.edit().putString("last_clip", content).apply()
                prefs.edit().putLong("last_clip_time", System.currentTimeMillis()).apply()
                android.util.Log.d("EchoService", "Clipboard changed in background: ${content.take(50)}...")
                
                // Broadcast to MainActivity so it can sync when app resumes
                val intent = Intent("com.mac.desktop.CLIPBOARD_CHANGE")
                intent.putExtra("content", content)
                sendBroadcast(intent)
            }
        }
    }
}
