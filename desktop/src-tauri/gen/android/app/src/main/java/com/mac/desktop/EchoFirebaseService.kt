package com.mac.desktop

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Firebase Cloud Messaging Service for Echo
 * Handles push notifications for clipboard sync when app is in background
 */
class EchoFirebaseService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "EchoFCM"
        private const val CHANNEL_ID = "echo_clipboard_sync"
        private const val CHANNEL_NAME = "Clipboard Sync"
        
        // Store the latest token for retrieval from frontend
        @Volatile
        var fcmToken: String? = null
            private set
        
        // Callback for token updates
        var onTokenReceived: ((String) -> Unit)? = null
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM Token refreshed: ${token.take(20)}...")
        
        // Persist token immediately to SharedPreferences
        val prefs = getSharedPreferences("EchoPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token", token).apply()
        
        fcmToken = token
        onTokenReceived?.invoke(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "Message received from: ${message.from}")

        // Check if this is a clipboard sync notification
        val data = message.data
        if (data["type"] == "clipboard_sync") {
            Log.d(TAG, "Clipboard sync notification received")
            showSyncNotification(message)
        } else {
            // Handle other notification types
            message.notification?.let { notification ->
                showNotification(
                    title = notification.title ?: "Echo",
                    body = notification.body ?: "New clipboard content available"
                )
            }
        }
    }

    private fun showSyncNotification(message: RemoteMessage) {
        val notification = message.notification
        showNotification(
            title = notification?.title ?: "Echo Clipboard",
            body = notification?.body ?: "Tap to sync new clipboard content"
        )
    }

    private fun showNotification(title: String, body: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel for Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for clipboard sync"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Intent to open the app when notification is tapped
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("from_push", true)
            putExtra("action", "sync_clipboard")
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 250, 250, 250))
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
