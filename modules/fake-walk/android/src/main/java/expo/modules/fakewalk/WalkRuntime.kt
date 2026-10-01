package expo.modules.fakewalk

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.SystemClock
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.work.*
import java.time.Instant
import java.time.ZoneId
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class WalkRuntime private constructor(private val context: Context) {
  val store = SessionDatabase(context)
  private val notificationManager = context.getSystemService(NotificationManager::class.java)
  val healthAvailable get() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
  val healthClient by lazy { HealthConnectClient.getOrCreate(context) }
  init { notificationManager.createNotificationChannel(NotificationChannel(CHANNEL, "Walk completions", NotificationManager.IMPORTANCE_DEFAULT)) }
  fun notificationsGranted() = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED &&
    NotificationManagerCompat.from(context).areNotificationsEnabled() &&
    notificationManager.getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
  suspend fun prerequisites(): Map<String, Boolean> {
    val granted = if (healthAvailable) healthClient.permissionController.getGrantedPermissions().contains(WRITE_STEPS) else false
    return mapOf("healthAvailable" to healthAvailable, "stepsGranted" to granted, "notificationsGranted" to notificationsGranted())
  }
  val engine = WalkEngine(store,
    object : WalkClock {
      override fun now() = System.currentTimeMillis()
      override fun elapsed() = SystemClock.elapsedRealtime()
      override fun bootCount() = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    },
    object : WalkPermissions { override suspend fun granted() = prerequisites().values.all { it } },
    object : StepPublisher {
      override suspend fun publish(session: WalkSession): String {
        val start = Instant.ofEpochMilli(session.startedAt); val end = Instant.ofEpochMilli(session.finishAt)
        val zone = ZoneId.systemDefault()
        val record = StepsRecord(startTime = start, endTime = end, count = session.steps.toLong(),
          startZoneOffset = zone.rules.getOffset(start), endZoneOffset = zone.rules.getOffset(end),
          metadata = Metadata.manualEntry(clientRecordId = "walk-${session.id}", clientRecordVersion = 1L))
        return healthClient.insertRecords(listOf(record)).recordIdsList.single()
      }
    },
    object : WalkScheduler {
      override suspend fun schedule(session: WalkSession, delayMs: Long) = withContext(Dispatchers.IO) {
        val request = OneTimeWorkRequestBuilder<SaveWalkWorker>()
          .setInputData(Data.Builder().putString("sessionId", session.id).build())
          .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
          .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(context).enqueueUniqueWork(workName(session.id), ExistingWorkPolicy.KEEP, request).result.get()
        Unit
      }
      override fun cancel(id: String) { WorkManager.getInstance(context).cancelUniqueWork(workName(id)) }
    },
    object : WalkNotifier {
      override fun post(session: WalkSession): String {
        if (!notificationsGranted()) return "denied"
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return "failed"
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        intent.putExtra("walkSessionId", session.id)
        val tap = PendingIntent.getActivity(context, session.id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, CHANNEL).setSmallIcon(R.drawable.ic_walk)
          .setContentTitle("Your walk is complete")
          .setContentText("${java.text.NumberFormat.getIntegerInstance().format(session.steps)} steps saved to Health Connect.")
          .setContentIntent(tap).setAutoCancel(true).setOnlyAlertOnce(true).build()
        NotificationManagerCompat.from(context).notify(session.id, 1, notification)
        return "sent"
      }
    },
  )
  suspend fun overview(): Map<String, Any?> {
    engine.recover()
    val rows = store.all()
    val active = rows.firstOrNull { it.status == "running" || it.status == "publishing" }
    val history = rows.filter { it.status != "running" && it.status != "publishing" }.take(30)
    return mapOf("active" to active?.let(::snapshot), "latest" to history.firstOrNull()?.let(::snapshot), "history" to history.map(::snapshot))
  }
  private fun snapshot(s: WalkSession): Map<String, Any?> = mapOf(
    "id" to s.id, "steps" to s.steps, "startedAt" to s.startedAt, "finishAt" to s.finishAt,
    "elapsedMs" to engine.elapsed(s), "status" to s.status, "recordId" to s.recordId,
    "errorCode" to s.errorCode, "errorMessage" to s.errorMessage, "notification" to s.notification,
  )
  companion object {
    const val CHANNEL = "walk-complete"
    val WRITE_STEPS = HealthPermission.getWritePermission(StepsRecord::class)
    private fun workName(id: String) = "save-walk-$id"
    @Volatile private var instance: WalkRuntime? = null
    fun get(context: Context): WalkRuntime = instance ?: synchronized(this) {
      instance ?: WalkRuntime(context.applicationContext).also { instance = it }
    }
  }
}

class SaveWalkWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val id = inputData.getString("sessionId") ?: return@withContext Result.failure()
    try {
      when (WalkRuntime.get(applicationContext).engine.publish(id)) {
        Publication.DONE -> Result.success()
        Publication.RETRY -> Result.retry()
        Publication.FAILED -> Result.failure()
      }
    } catch (error: kotlinx.coroutines.CancellationException) { throw error }
    catch (_: Exception) { Result.retry() }
  }
}
