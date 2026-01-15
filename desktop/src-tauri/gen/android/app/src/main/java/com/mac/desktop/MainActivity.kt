package com.mac.desktop

import android.content.BroadcastReceiver
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
    private var clipboardManager: ClipboardManager? = null
    private var lastClipContent: String? = null
    private var fcmToken: String? = null
    private var openedFromPush: Boolean = false

    private val tokenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.getStringExtra("token")?.let { token ->
                fcmToken = token
                notifyFcmToken(token)
            }
        }
    }

    private val clipboardReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.getStringExtra("content")?.let { content ->
                if (content != lastClipContent) {
                    lastClipContent = content
                    notifyClipboardChange(content)
                    android.util.Log.d("Echo", "Received clipboard change from background service")
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        
        val prefs = getSharedPreferences("echo_fcm", Context.MODE_PRIVATE)
        fcmToken = prefs.getString("token", null)
        android.util.Log.d("Echo", "Loaded FCM token from prefs: ${if (fcmToken != null) "found" else "null"}")
        
        // Proactively fetch FCM token if not cached
        if (fcmToken == null) {
            com.google.firebase.messaging.FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    android.util.Log.d("Echo", "Fetched new FCM token")
                    fcmToken = token
                    prefs.edit().putString("token", token).apply()
                    notifyFcmToken(token)
                }
                .addOnFailureListener { e ->
                    android.util.Log.e("Echo", "Failed to fetch FCM token", e)
                }
        }
        
        if (intent?.hasExtra("google.message_id") == true) {
            openedFromPush = true
        }
        
        setupClipboardListener()
        setupJavaScriptBridge()
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }
    
    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            registerReceiver(tokenReceiver, IntentFilter("com.mac.desktop.FCM_TOKEN"), RECEIVER_NOT_EXPORTED)
            registerReceiver(clipboardReceiver, IntentFilter("com.mac.desktop.CLIPBOARD_CHANGE"), RECEIVER_NOT_EXPORTED)
        } else {
             registerReceiver(tokenReceiver, IntentFilter("com.mac.desktop.FCM_TOKEN"))
             registerReceiver(clipboardReceiver, IntentFilter("com.mac.desktop.CLIPBOARD_CHANGE"))
        }
    }
    
    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(tokenReceiver)
            unregisterReceiver(clipboardReceiver)
        } catch (e: Exception) {
            android.util.Log.w("Echo", "Failed to unregister receivers", e)
        }
    }
    
    private fun handleIntent(intent: Intent?) {
        if (intent?.action == Intent.ACTION_SEND && "text/plain" == intent.type) {
            intent.getStringExtra(Intent.EXTRA_TEXT)?.let { sharedText ->
                lastClipContent = sharedText
                notifyClipboardChange(sharedText)
            }
        }
        
        // Handle Push Notification tap (FCM)
        val isPush = intent?.getBooleanExtra("from_notification", false) == true ||
                     intent?.hasExtra("google.message_id") == true ||
                     intent?.getStringExtra("type") == "clipboard_sync"

        if (isPush) {
            openedFromPush = true
            android.util.Log.d("Echo", "App opened from push notification")
            
            // Immediately dispatch event to JS (for warm starts)
            dispatchSyncEvent()
        }
    }

    private fun setupClipboardListener() {
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        
        clipboardManager?.addPrimaryClipChangedListener {
            val clip = clipboardManager?.primaryClip
            val content = clip?.getItemAt(0)?.text?.toString()
            
            if (content != null && content != lastClipContent && content.isNotBlank()) {
                lastClipContent = content
                notifyClipboardChange(content)
            }
        }
    }

    private fun setupJavaScriptBridge() {
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        var attempts = 0
        val maxAttempts = 20
        val delayMs = 250L
        
        val trySetup = object : Runnable {
            override fun run() {
                val webView = findWebView()
                if (webView != null) {
                    try {
                        webView.addJavascriptInterface(EchoBridge(this@MainActivity), "EchoBridge")
                        android.util.Log.d("Echo", "JS bridge setup complete")
                        
                        // Dispatch event to notify JS that bridge is ready
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new Event('EchoBridgeReady'));",
                            null
                        )
                    } catch (e: Exception) {
                        android.util.Log.e("Echo", "Failed to setup JS bridge", e)
                    }
                } else if (attempts < maxAttempts) {
                    attempts++
                    handler.postDelayed(this, delayMs)
                } else {
                    android.util.Log.w("Echo", "WebView not found for JS bridge after max attempts")
                }
            }
        }
        
        handler.post(trySetup)
    }
    
    private fun notifyFcmToken(token: String) {
        runOnUiThread {
            try {
                val webView = findWebView()
                webView?.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('fcm-token', { detail: '$token' }));",
                    null
                )
            } catch (e: Exception) {
                android.util.Log.e("Echo", "Failed to notify FCM token", e)
            }
        }
    }

    private fun findWebView(): WebView? {
        return try {
            val decorView = window.decorView
            findWebViewRecursive(decorView as android.view.ViewGroup)
        } catch (e: Exception) {
            null
        }
    }

    private fun findWebViewRecursive(viewGroup: android.view.ViewGroup): WebView? {
        for (i in 0 until viewGroup.childCount) {
            val child = viewGroup.getChildAt(i)
            if (child is WebView) {
                return child
            } else if (child is android.view.ViewGroup) {
                val found = findWebViewRecursive(child)
                if (found != null) return found
            }
        }
        return null
    }

    private fun notifyClipboardChange(content: String) {
        runOnUiThread {
            try {
                val webView = findWebView()
                val escaped = content
                    .replace("\\", "\\\\")
                    .replace("'", "\\'")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                
                webView?.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('native-clipboard-change', { detail: '$escaped' }));",
                    null
                )
                android.util.Log.d("Echo", "Clipboard change dispatched to JS")
            } catch (e: Exception) {
                android.util.Log.e("Echo", "Failed to notify clipboard change", e)
            }
        }
    }

    private fun dispatchSyncEvent() {
        runOnUiThread {
            try {
                // Retry mechanism for WebView readiness
                val handler = android.os.Handler(android.os.Looper.getMainLooper())
                var attempts = 0
                val maxAttempts = 10
                val delayMs = 200L
                
                val checkAndDispatch = object : Runnable {
                    override fun run() {
                        val webView = findWebView()
                        if (webView != null) {
                            webView.evaluateJavascript(
                                "typeof window !== 'undefined' && window.dispatchEvent ? 'ready' : 'not-ready';"
                            ) { result ->
                                if (result?.contains("ready") == true) {
                                    webView.evaluateJavascript(
                                        "window.dispatchEvent(new Event('echo-sync-trigger'));",
                                        null
                                    )
                                    android.util.Log.d("Echo", "Sync trigger dispatched to JS")
                                } else if (attempts < maxAttempts) {
                                    attempts++
                                    handler.postDelayed(this, delayMs)
                                } else {
                                    android.util.Log.w("Echo", "WebView not ready after max attempts")
                                }
                            }
                        } else if (attempts < maxAttempts) {
                            attempts++
                            handler.postDelayed(this, delayMs)
                        } else {
                            android.util.Log.w("Echo", "WebView not found after max attempts")
                        }
                    }
                }
                
                handler.post(checkAndDispatch)
            } catch (e: Exception) {
                android.util.Log.e("Echo", "Failed to dispatch sync event", e)
            }
        }
    }

    class EchoBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun getFcmToken(): String? = activity.fcmToken

        @JavascriptInterface
        fun wasOpenedFromPush(): Boolean {
            // Return the current state without auto-clearing
            return activity.openedFromPush
        }

        @JavascriptInterface
        fun clearOpenedFromPush() {
            // Explicit clear - call this after handling the push
            activity.openedFromPush = false
            android.util.Log.d("Echo", "Cleared openedFromPush flag")
        }

        @JavascriptInterface
        fun getLastClipboardContent(): String? = activity.lastClipContent

        @JavascriptInterface
        fun saveAuthToken(token: String) {
            // Save to SharedPreferences for background sync access
            activity.getSharedPreferences("echo_auth", Context.MODE_PRIVATE)
                .edit()
                .putString("jwt_token", token)
                .putString("api_url", "https://echo-backend-bkbw.onrender.com")
                .apply()
            android.util.Log.d("Echo", "Auth token saved to SharedPreferences for background sync")
        }

        @JavascriptInterface
        fun clearAuthToken() {
            activity.getSharedPreferences("echo_auth", Context.MODE_PRIVATE)
                .edit()
                .clear()
                .apply()
            android.util.Log.d("Echo", "Auth token cleared from SharedPreferences")
        }

        @JavascriptInterface
        fun getDeviceModel(): String {
            val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
            val model = Build.MODEL
            // If model already starts with manufacturer, just return model
            return if (model.startsWith(manufacturer, ignoreCase = true)) {
                model
            } else {
                "$manufacturer $model"
            }
        }
    }
}
