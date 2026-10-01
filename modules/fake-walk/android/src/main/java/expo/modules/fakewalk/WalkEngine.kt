package expo.modules.fakewalk

import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class WalkSession(
  val id: String, val steps: Int, val startedAt: Long, val finishAt: Long,
  val startedElapsed: Long, val bootCount: Int, val status: String = "running",
  val updatedAt: Long = startedAt, val recordId: String? = null,
  val errorCode: String? = null, val errorMessage: String? = null,
  val notification: String = "pending", val stoppedElapsed: Long? = null,
)

interface SessionStore {
  fun <T> transaction(block: () -> T): T
  fun get(id: String): WalkSession?
  fun put(session: WalkSession)
  fun all(): List<WalkSession>
  fun prune()
}
interface WalkClock { fun now(): Long; fun elapsed(): Long; fun bootCount(): Int }
interface WalkPermissions { suspend fun granted(): Boolean }
interface StepPublisher { suspend fun publish(session: WalkSession): String }
interface WalkScheduler { suspend fun schedule(session: WalkSession, delayMs: Long); fun cancel(id: String) }
interface WalkNotifier { fun post(session: WalkSession): String }
enum class Publication { DONE, RETRY, FAILED }

class WalkEngine(
  val store: SessionStore, val clock: WalkClock, val permissions: WalkPermissions,
  val publisher: StepPublisher, val scheduler: WalkScheduler, val notifier: WalkNotifier,
) {
  private val publicationLock = Mutex()

  private fun active(): WalkSession? = store.all().firstOrNull { it.status == "running" || it.status == "publishing" }

  suspend fun start(steps: Int): WalkSession = publicationLock.withLock {
    require(steps in 50..10000) { "Choose a whole number from 50 to 10,000 steps." }
    if (!permissions.granted()) throw SecurityException("Allow step saving and notifications before starting.")
    val session = store.transaction {
      check(active() == null) { "A walk is already in progress." }
      val now = clock.now()
      WalkSession(UUID.randomUUID().toString(), steps, now, now + steps * 720L, clock.elapsed(), clock.bootCount())
        .also { store.put(it) }
    }
    try {
      scheduler.schedule(session, (session.steps * 720L - elapsed(session)).coerceAtLeast(0))
    } catch (error: Exception) {
      store.put(session.copy(status = "failed", updatedAt = clock.now(), errorCode = "SCHEDULING_FAILED",
        errorMessage = "This walk could not be scheduled. Try saving again."))
      throw error
    }
    store.prune()
    session
  }

  fun cancel(id: String): Boolean {
    val cancelled = store.transaction {
      val session = store.get(id) ?: return@transaction false
      if (session.status != "running") return@transaction false
      store.put(session.copy(status = "cancelled", updatedAt = clock.now(), stoppedElapsed = elapsed(session)))
      true
    }
    if (cancelled) { scheduler.cancel(id); store.prune() }
    return cancelled
  }

  suspend fun retry(id: String) = publicationLock.withLock {
    if (!permissions.granted()) throw SecurityException("Enable step saving and notifications, then retry.")
    val session = store.transaction {
      check(active() == null) { "Finish your current walk before retrying." }
      val failed = store.get(id) ?: error("This walk is no longer in history.")
      check(failed.status == "failed") { "Only an unsaved walk can be retried." }
      failed.copy(status = "running", errorCode = null, errorMessage = null, updatedAt = clock.now())
        .also { store.put(it) }
    }
    try {
      scheduler.schedule(session, (session.steps * 720L - elapsed(session)).coerceAtLeast(0))
    } catch (error: Exception) {
      store.put(session.copy(status = "failed", updatedAt = clock.now(), errorCode = "SCHEDULING_FAILED",
        errorMessage = "This walk could not be scheduled. Try saving again."))
      throw error
    }
  }

  suspend fun publish(id: String): Publication = publicationLock.withLock {
    val initial = store.get(id) ?: return@withLock Publication.DONE
    if (initial.status == "completed") {
      notifyCompleted(initial)
      return@withLock Publication.DONE
    }
    if (initial.status != "running" && initial.status != "publishing") return@withLock Publication.DONE
    if (elapsed(initial) < initial.steps * 720L) return@withLock Publication.RETRY
    val session = store.transaction {
      val current = store.get(id) ?: return@transaction null
      if (current.status != "running" && current.status != "publishing") return@transaction null
      current.copy(status = "publishing", updatedAt = clock.now()).also { store.put(it) }
    } ?: return@withLock Publication.DONE
    try {
      if (!permissions.granted()) throw SecurityException("Step saving or notification permission was removed. Enable permissions, then retry.")
      if (session.finishAt > clock.now()) throw IllegalArgumentException("Your phone's time changed. Restore the correct time, then retry saving.")
      val recordId = publisher.publish(session)
      val completed = session.copy(status = "completed", updatedAt = clock.now(), recordId = recordId,
        errorCode = null, errorMessage = null, stoppedElapsed = session.steps * 720L)
      store.put(completed)
      notifyCompleted(completed)
      store.prune()
      Publication.DONE
    } catch (error: CancellationException) {
      throw error
    } catch (error: SecurityException) {
      fail(session, "PERMISSION_REQUIRED", error.message ?: "Enable permissions, then retry saving.")
      Publication.FAILED
    } catch (error: IllegalArgumentException) {
      fail(session, "INVALID_RECORD", error.message ?: "Health Connect could not save this walk. Please retry.")
      Publication.FAILED
    } catch (_: Exception) {
      store.put(session.copy(errorCode = "SAVE_DELAYED", errorMessage = "Saving is delayed. We’ll keep trying.", updatedAt = clock.now()))
      Publication.RETRY
    }
  }

  private fun fail(session: WalkSession, code: String, message: String) {
    store.put(session.copy(status = "failed", updatedAt = clock.now(), errorCode = code,
      errorMessage = message, stoppedElapsed = elapsed(session)))
    store.prune()
  }

  private fun notifyCompleted(session: WalkSession) {
    if (session.notification != "pending") return
    val result = try { notifier.post(session) } catch (_: Exception) { "failed" }
    store.put(session.copy(notification = result))
  }

  suspend fun recover() {
    // Re-enqueue durable sessions if the process stopped between persistence and scheduling.
    store.all().filter { it.status == "running" || it.status == "publishing" ||
      (it.status == "completed" && it.notification == "pending") }.forEach {
      scheduler.schedule(it, (it.steps * 720L - elapsed(it)).coerceAtLeast(0))
    }
  }

  fun elapsed(session: WalkSession): Long {
    session.stoppedElapsed?.let { return it }
    val delta = if (session.bootCount == clock.bootCount()) clock.elapsed() - session.startedElapsed
      else clock.now() - session.startedAt
    return delta.coerceIn(0L, session.steps * 720L)
  }
}
