package expo.modules.fakewalk

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class WalkEngineTest {
  private class MemoryStore : SessionStore {
    val rows = linkedMapOf<String, WalkSession>()
    override fun <T> transaction(block: () -> T): T = synchronized(this) { block() }
    override fun get(id: String) = rows[id]
    override fun put(session: WalkSession) { rows[session.id] = session }
    override fun all() = rows.values.sortedByDescending { it.startedAt }
    override fun prune() {}
  }
  private class Clock : WalkClock {
    var wall = 1_800_000_000_000L; var mono = 10_000L
    override fun now() = wall
    override fun elapsed() = mono
    override fun bootCount() = 1
    fun advance(ms: Long) { wall += ms; mono += ms }
  }
  private class Fixture {
    val store = MemoryStore(); val clock = Clock()
    var allowed = true; var transientFailure = false; var afterWriteFailure = false
    var notifications = 0; var schedulingFailure = false
    var entered: CompletableDeferred<Unit>? = null; var release: CompletableDeferred<Unit>? = null
    val records = linkedMapOf<String, Int>(); val delays = mutableListOf<Long>()
    val engine = WalkEngine(store, clock,
      object : WalkPermissions { override suspend fun granted() = allowed },
      object : StepPublisher {
        override suspend fun publish(session: WalkSession): String {
          entered?.complete(Unit); release?.await()
          if (transientFailure) throw java.io.IOException("temporary")
          records[session.id] = session.steps
          if (afterWriteFailure) throw java.io.IOException("reply lost")
          return "health-${session.id}"
        }
      },
      object : WalkScheduler {
        override suspend fun schedule(session: WalkSession, delayMs: Long) {
          if (schedulingFailure) throw java.io.IOException("enqueue failed")
          delays.add(delayMs)
        }
        override fun cancel(id: String) {}
      },
      object : WalkNotifier { override fun post(session: WalkSession): String { notifications++; return "sent" } },
    )
  }

  @Test fun persistsBeforeReturningAndSchedulesFixedPace() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50)
    assertEquals(36_000L, s.finishAt - s.startedAt)
    assertEquals(s, f.store.get(s.id)); assertEquals(listOf(36_000L), f.delays)
  }
  @Test fun rejectsInvalidTargets() = runBlocking {
    for (steps in listOf(49, 10001)) {
      try { Fixture().engine.start(steps); fail("invalid target accepted") } catch (_: IllegalArgumentException) {}
    }
  }
  @Test fun doesNotStartWithoutPermissions() = runBlocking {
    val f = Fixture(); f.allowed = false
    try { f.engine.start(50); fail("started without permissions") } catch (_: SecurityException) {}
    assertTrue(f.store.all().isEmpty())
  }
  @Test fun preventsSecondActiveSession() = runBlocking {
    val f = Fixture(); f.engine.start(50)
    try { f.engine.start(100); fail("second active walk accepted") } catch (_: IllegalStateException) {}
    assertEquals(1, f.store.all().size)
  }
  @Test fun cancellationPreventsPublication() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50)
    assertTrue(f.engine.cancel(s.id)); f.clock.advance(40_000)
    f.engine.publish(s.id)
    assertTrue(f.records.isEmpty()); assertEquals(0, f.notifications)
    assertEquals("cancelled", f.store.get(s.id)?.status)
  }
  @Test(timeout = 5000) fun cannotCancelOncePublicationBegins() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.advance(36_000)
    f.entered = CompletableDeferred(); f.release = CompletableDeferred()
    val result = async { f.engine.publish(s.id) }
    f.entered!!.await(); assertFalse(f.engine.cancel(s.id))
    f.release!!.complete(Unit); assertEquals(Publication.DONE, result.await())
  }
  @Test fun duplicateExecutionWritesOnceAndNotifiesOnce() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.advance(36_000)
    f.engine.publish(s.id); f.engine.publish(s.id)
    assertEquals(mapOf(s.id to 50), f.records); assertEquals(1, f.notifications)
    assertEquals("completed", f.store.get(s.id)?.status)
  }
  @Test fun workerNeverPublishesBeforeDeadline() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.advance(35_999)
    assertEquals(Publication.RETRY, f.engine.publish(s.id)); assertTrue(f.records.isEmpty())
  }
  @Test fun transientFailureKeepsSessionRetryableWithoutFalseCompletion() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.advance(36_000); f.transientFailure = true
    assertEquals(Publication.RETRY, f.engine.publish(s.id)); assertEquals(0, f.notifications)
    f.transientFailure = false; assertEquals(Publication.DONE, f.engine.publish(s.id))
  }
  @Test fun retryUsesSameIdentityWhenWriteReplyIsLost() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.advance(36_000); f.afterWriteFailure = true
    assertEquals(Publication.RETRY, f.engine.publish(s.id))
    f.afterWriteFailure = false; f.engine.publish(s.id)
    assertEquals(1, f.records.size); assertEquals(1, f.notifications)
  }
  @Test fun revokedPermissionFailsWithoutSavingAndCanBeRetried() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.advance(36_000); f.allowed = false
    assertEquals(Publication.FAILED, f.engine.publish(s.id)); assertTrue(f.records.isEmpty())
    assertEquals("failed", f.store.get(s.id)?.status)
    f.allowed = true; f.engine.retry(s.id); f.engine.publish(s.id)
    assertEquals(mapOf(s.id to 50), f.records)
  }
  @Test fun clockChangeDoesNotAccelerateProgress() = runBlocking {
    val f = Fixture(); val s = f.engine.start(50); f.clock.mono += 18_000; f.clock.wall += 3_600_000
    assertEquals(18_000L, f.engine.elapsed(s))
  }
  @Test fun enqueueFailureIsVisibleInsteadOfAnUnscheduledActiveWalk() = runBlocking {
    val f = Fixture(); f.schedulingFailure = true
    try { f.engine.start(50); fail("enqueue failure hidden") } catch (_: java.io.IOException) {}
    assertEquals("failed", f.store.all().single().status)
  }
}
