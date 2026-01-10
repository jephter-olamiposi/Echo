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

class EchoFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        const val TAG = "EchoFCM"
        const val SYNC_CHANNEL_ID = "echo_sync_notifications"
        const val SYNC_NOTIFICATION_ID = 100
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                SYNC_CHANNEL_ID,
                "Sync Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Clipboard sync notifications from other devices"
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "Refreshed token: $token")
        
        val intent = Intent("com.mac.desktop.FCM_TOKEN")
        intent.putExtra("token", token)
        sendBroadcast(intent)
        
        getSharedPreferences("echo_fcm", Context.MODE_PRIVATE)
            .edit()
            .putString("token", token)
            .apply()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}")

        // Handle data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            
            if (remoteMessage.data["type"] == "clipboard_sync") {
                // Start the clipboard service
                // ClipboardService.start(this)
                
                // Show a visible notification so user can tap to sync
                val title = remoteMessage.data["title"] ?: "Echo"
                val body = remoteMessage.data["body"] ?: "Tap to sync clipboard"
                
                showSyncNotification(title, body)
            }
        }
    }

    private fun showSyncNotification(title: String, body: String) {
        // Create intent to open MainActivity with sync flag
        val intent = Intent(this, MainActivity::class.java).apply {
            // SINGLE_TOP + CLEAR_TOP brings existing activity to front without recreating it
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("type", "clipboard_sync")
            putExtra("from_notification", true)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, SYNC_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(SYNC_NOTIFICATION_ID, notification)
    }
}

