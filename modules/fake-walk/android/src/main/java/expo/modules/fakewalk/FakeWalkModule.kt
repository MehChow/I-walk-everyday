package expo.modules.fakewalk

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.content.Intent
import android.provider.Settings
import android.net.Uri

class FakeWalkModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FakeWalk")

    AsyncFunction("getPrerequisites") Coroutine { -> withContext(Dispatchers.IO) { runtime().prerequisites() } }
    AsyncFunction("requestPermissions") Coroutine { ->
      val activity = appContext.currentActivity ?: error("Open the app to enable permissions.")
      PermissionBridge.request(activity)
      withContext(Dispatchers.IO) { runtime().prerequisites() }
    }
    AsyncFunction("getOverview") Coroutine { -> withContext(Dispatchers.IO) { runtime().overview() } }
    AsyncFunction("startWalk") Coroutine { steps: Int -> withContext(Dispatchers.IO) {
      runtime().engine.start(steps); runtime().overview()
    } }
    AsyncFunction("cancelWalk") Coroutine { id: String -> withContext(Dispatchers.IO) {
      check(runtime().engine.cancel(id)) { "This walk is already saving or has finished." }
      runtime().overview()
    } }
    AsyncFunction("retrySave") Coroutine { id: String -> withContext(Dispatchers.IO) {
      runtime().engine.retry(id); runtime().overview()
    } }
    AsyncFunction("openSettings") { kind: String ->
      val context = appContext.reactContext ?: error("Open the app first.")
      val intent = if (kind == "notifications") Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        .putExtra(Settings.EXTRA_CHANNEL_ID, WalkRuntime.CHANNEL)
      else Intent("android.health.connect.action.HEALTH_CONNECT_SETTINGS")
      val safeIntent = if (intent.resolveActivity(context.packageManager) != null) intent
        else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      safeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(safeIntent)
    }
  }
  private fun runtime() = WalkRuntime.get(appContext.reactContext ?: error("The app is not ready yet."))
}
