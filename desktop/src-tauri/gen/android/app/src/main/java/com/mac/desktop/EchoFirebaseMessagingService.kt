package com.mac.desktop

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

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
                val title = remoteMessage.data["title"] ?: "Echo"
                val body = remoteMessage.data["body"] ?: "Tap to sync clipboard"
                
                // Try to auto-sync in background
                tryBackgroundSync { success ->
                    if (!success) {
                        // If background sync failed, show notification for manual tap
                        showSyncNotification(title, body)
                    } else {
                        // Show a brief "synced" notification
                        showSyncedNotification()
                    }
                }
            }
        }
    }

    private fun tryBackgroundSync(callback: (Boolean) -> Unit) {
        val prefs = getSharedPreferences("echo_auth", Context.MODE_PRIVATE)
        val token = prefs.getString("jwt_token", null)
        val apiUrl = prefs.getString("api_url", "https://echo-backend-bkbw.onrender.com")
        
        if (token == null) {
            Log.d(TAG, "No auth token, cannot background sync")
            callback(false)
            return
        }

        thread {
            try {
                val url = URL("$apiUrl/history?limit=1")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val jsonArray = JSONArray(response)
                    
                    if (jsonArray.length() > 0) {
                        val latest = jsonArray.getJSONObject(0)
                        val content = latest.optString("content", "")
                        
                        if (content.isNotEmpty()) {
                            // Copy to clipboard on main thread
                            Handler(Looper.getMainLooper()).post {
                                try {
                                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Echo Sync", content)
                                    clipboard.setPrimaryClip(clip)
                                    Log.d(TAG, "Background sync: copied to clipboard")
                                    callback(true)
                                } catch (e: Exception) {
                                    Log.e(TAG, "Failed to copy to clipboard: ${e.message}")
                                    callback(false)
                                }
                            }
                            return@thread
                        }
                    }
                }
                callback(false)
            } catch (e: Exception) {
                Log.e(TAG, "Background sync failed: ${e.message}")
                callback(false)
            }
        }
    }

    private fun showSyncedNotification() {
        val notification = NotificationCompat.Builder(this, SYNC_CHANNEL_ID)
            .setContentTitle("Echo")
            .setContentText("Clipboard synced ✓")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setAutoCancel(true)
            .setTimeoutAfter(3000) // Auto-dismiss after 3 seconds
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(SYNC_NOTIFICATION_ID, notification)
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

