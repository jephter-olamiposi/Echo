package com.mac.desktop

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : TauriActivity() {
    
    companion object {
        private const val TAG = "EchoMain"
        private const val NOTIFICATION_PERMISSION_CODE = 1001
        
        @JvmStatic
        var sharedText: String? = null
        
        @JvmStatic
        var fcmToken: String? = null
            private set
        
        @JvmStatic
        var openedFromPush: Boolean = false
            private set
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        requestNotificationPermission()
        fetchFcmToken()
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }
    
    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        webView.addJavascriptInterface(EchoBridge(), "EchoBridge")
    }
    
    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_CODE
                )
            }
        }
    }
    
    private fun fetchFcmToken() {
        // Try to get from SharedPreferences first (fastest)
        val prefs = getSharedPreferences("EchoPrefs", android.content.Context.MODE_PRIVATE)
        val cachedToken = prefs.getString("fcm_token", null)
        
        if (cachedToken != null) {
            fcmToken = cachedToken
            Log.d(TAG, "FCM Token loaded from cache")
        }

        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "Fetching FCM token failed", task.exception)
                return@addOnCompleteListener
            }
            val newToken = task.result
            
            // Update cache if changed
            if (newToken != cachedToken) {
                prefs.edit().putString("fcm_token", newToken).apply()
                fcmToken = newToken
                Log.d(TAG, "FCM Token updated from network")
            }
        }
    }
    
    private fun handleIntent(intent: Intent) {
        if (intent.getBooleanExtra("from_push", false)) {
            openedFromPush = true
            Log.d(TAG, "Opened from push notification")
        }
        
        if (intent.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            intent.getStringExtra(Intent.EXTRA_TEXT)?.let { text ->
                try {
                    val clipboard = getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                    val clip = android.content.ClipData.newPlainText("Shared to Echo", text)
                    clipboard.setPrimaryClip(clip)
                    android.widget.Toast.makeText(this, "Copied to Echo", android.widget.Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to write to clipboard", e)
                }
            }
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == NOTIFICATION_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Notification permission granted")
            }
        }
    }
    
    inner class EchoBridge {
        @JavascriptInterface
        fun getFcmToken(): String? {
             if (fcmToken != null) return fcmToken
             
             // Fallback to SharedPreferences if memory variable is null (e.g. process death)
             val prefs = getSharedPreferences("EchoPrefs", android.content.Context.MODE_PRIVATE)
             return prefs.getString("fcm_token", null)
        }
        
        @JavascriptInterface
        fun wasOpenedFromPush(): Boolean {
            val result = openedFromPush
            openedFromPush = false
            return result
        }
    }
}

