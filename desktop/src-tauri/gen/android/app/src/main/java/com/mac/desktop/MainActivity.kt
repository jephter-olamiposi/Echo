package com.mac.desktop

import android.content.Intent
import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
    
    companion object {
        @JvmStatic
        var sharedText: String? = null
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }
    
    private fun handleIntent(intent: Intent) {
        if (intent.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            intent.getStringExtra(Intent.EXTRA_TEXT)?.let { text ->

                try {
                    val clipboard = getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                    val clip = android.content.ClipData.newPlainText("Shared to Echo", text)
                    clipboard.setPrimaryClip(clip)
                    android.widget.Toast.makeText(this, "Copied shared text to Echo", android.widget.Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    android.util.Log.e("EchoShare", "Failed to write to clipboard", e)
                }
            }
        }
    }
}
