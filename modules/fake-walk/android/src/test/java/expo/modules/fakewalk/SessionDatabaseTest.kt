package expo.modules.fakewalk

import android.database.sqlite.SQLiteConstraintException
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], manifest = Config.NONE)
class SessionDatabaseTest {
  private lateinit var db: SessionDatabase
  @Before fun setup() {
    val context = RuntimeEnvironment.getApplication()
    context.deleteDatabase("walks.db")
    db = SessionDatabase(context)
  }
  @After fun close() { db.close() }
  private fun session(id: String, start: Long = 1000L, status: String = "running") =
    WalkSession(id, 50, start, start + 36000, 100, 1, status, notification = "sent")

  @Test fun sessionSurvivesDatabaseReopening() {
    val expected = session("persisted").copy(status = "publishing", errorCode = "SAVE_DELAYED", errorMessage = "retry")
    db.put(expected); db.close()
    db = SessionDatabase(RuntimeEnvironment.getApplication())
    assertEquals(expected, db.get("persisted"))
  }
  @Test fun singleActiveConstraintDoesNotReplaceExistingWalk() {
    db.put(session("original"))
    assertThrows(SQLiteConstraintException::class.java) { db.put(session("second")) }
    assertEquals("original", db.all().single().id)
  }
  @Test fun pruningKeepsThirtyNewestOutcomesAndActiveWalk() {
    for (i in 1..35) db.put(session("history-$i", i.toLong(), "cancelled"))
    db.put(session("active", 40)); db.prune()
    assertEquals(31, db.all().size)
    assertNotNull(db.get("active")); assertNull(db.get("history-5")); assertNotNull(db.get("history-6"))
  }
  @Test fun failedTransactionLeavesNoPartiallyPersistedSession() {
    assertThrows(IllegalStateException::class.java) {
      db.transaction { db.put(session("rolled-back")); error("rollback") }
    }
    assertTrue(db.all().isEmpty())
  }
}
