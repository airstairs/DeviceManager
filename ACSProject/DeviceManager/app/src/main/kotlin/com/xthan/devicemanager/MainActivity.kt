package com.xthan.devicemanager

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File

class MainActivity : AppCompatActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val FILE_CHOOSER_RESULT_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        val webV: WebView = findViewById(R.id.myWebView)
        webV.settings.javaScriptEnabled = true
        webV.settings.allowFileAccess = true
        webV.settings.domStorageEnabled = true
        webV.settings.useWideViewPort = true
        webV.settings.loadWithOverviewMode = true

        // Register the JavaScript Interface bridge for exporting
        webV.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        // Handle File Importing via <input type="file">
        webV.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent()
                try {
                    if (intent != null) {
                        startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE)
                    }
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(this@MainActivity, "Cannot open file chooser", Toast.LENGTH_SHORT).show()
                    return false
                }
                return true
            }
        }

        webV.loadUrl("file:///android_asset/index.html")
    }

    // Bridge class to handle saving export files natively from JavaScript
    class WebAppInterface(private val activity: AppCompatActivity) {
        @JavascriptInterface
        fun exportData(jsonData: String) {
            try {
                val fileName = "devicemanager_export.dme"
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "text/plain")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }

                val resolver = activity.contentResolver
                val uri = resolver.insert(MediaStore.Files.getContentUri("external"), contentValues)

                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { outputStream ->
                        outputStream.write(jsonData.toByteArray())
                    }
                    activity.runOnUiThread {
                        Toast.makeText(activity, "Successfully exported to Downloads/$fileName", Toast.LENGTH_LONG).show()
                    }
                } else {
                    throw Exception("Failed to create file record")
                }
            } catch (e: Exception) {
                activity.runOnUiThread {
                    Toast.makeText(activity, "Export failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback == null) return
            val results = if (resultCode == Activity.RESULT_OK) {
                data?.dataString?.let { arrayOf(Uri.parse(it)) }
            } else {
                null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }
}
