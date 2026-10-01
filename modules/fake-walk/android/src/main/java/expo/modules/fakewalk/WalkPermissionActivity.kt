package expo.modules.fakewalk

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

object PermissionBridge {
  private val lock = Mutex()
  private var pending: CompletableDeferred<Unit>? = null
  suspend fun request(activity: Activity) = lock.withLock {
    val result = CompletableDeferred<Unit>()
    pending = result
    try {
      withContext(Dispatchers.Main) { activity.startActivity(Intent(activity, WalkPermissionActivity::class.java)) }
      withTimeout(180_000L) { result.await() }
    } finally { pending = null }
  }
  fun complete() { pending?.complete(Unit) }
  fun fail(error: Throwable) { pending?.completeExceptionally(error) }
}

class WalkPermissionActivity : ComponentActivity() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
    PermissionBridge.complete(); finish()
  }
  private val health = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
    requestNotification()
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.decorView.setBackgroundColor(android.graphics.Color.rgb(16, 23, 22))
    if (savedInstanceState != null) return
    scope.launch {
      try {
        val runtime = WalkRuntime.get(applicationContext)
        if (!runtime.healthAvailable) error("Health Connect is unavailable on this device.")
        if (runtime.healthClient.permissionController.getGrantedPermissions().contains(WalkRuntime.WRITE_STEPS)) requestNotification()
        else health.launch(setOf(WalkRuntime.WRITE_STEPS))
      } catch (error: Exception) { PermissionBridge.fail(error); finish() }
    }
  }
  private fun requestNotification() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
      PermissionBridge.complete(); finish()
    } else notifications.launch(Manifest.permission.POST_NOTIFICATIONS)
  }
  override fun onDestroy() { scope.cancel(); super.onDestroy() }
}

class PermissionRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val padding = (24 * resources.displayMetrics.density).toInt()
    val text = android.widget.TextView(this).apply {
      setPadding(padding, padding, padding, padding); textSize = 18f
      setTextColor(android.graphics.Color.rgb(237, 244, 240))
      text = "I Walk Everyday\n\nHealth Connect and your privacy\n\nThis experimental app writes synthetic step counts you choose to Health Connect. These records are marked as manual entries, not sensor measurements.\n\nWe request permission to write steps, and to show a local reminder after saving. We do not read your health records.\n\nWalk targets and outcomes are stored on this device. No account, server, analytics, or remote notifications are used.\n\nYou can revoke access or remove the app’s records in Health Connect settings. Uninstalling removes local walk history; records already saved in Health Connect are managed separately."
    }
    val scroll = android.widget.ScrollView(this).apply {
      setBackgroundColor(android.graphics.Color.rgb(16, 23, 22)); addView(text)
    }
    setContentView(scroll)
  }
}
