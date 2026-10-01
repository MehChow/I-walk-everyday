package expo.modules.fakewalk

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONObject

class SessionDatabase(context: Context) : SQLiteOpenHelper(context, "walks.db", null, 1), SessionStore {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE sessions (id TEXT PRIMARY KEY, status TEXT NOT NULL, started_at INTEGER NOT NULL, payload TEXT NOT NULL)")
    db.execSQL("CREATE UNIQUE INDEX one_active_walk ON sessions ((1)) WHERE status IN ('running', 'publishing')")
  }
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}
  @Synchronized override fun <T> transaction(block: () -> T): T {
    val db = writableDatabase
    db.beginTransaction()
    try { return block().also { db.setTransactionSuccessful() } } finally { db.endTransaction() }
  }
  @Synchronized override fun get(id: String): WalkSession? = readableDatabase.rawQuery(
    "SELECT payload FROM sessions WHERE id = ?", arrayOf(id)
  ).use { if (it.moveToFirst()) decode(it.getString(0)) else null }
  @Synchronized override fun all(): List<WalkSession> = readableDatabase.rawQuery(
    "SELECT payload FROM sessions ORDER BY started_at DESC, id DESC", null
  ).use { cursor -> buildList { while (cursor.moveToNext()) add(decode(cursor.getString(0))) } }
  @Synchronized override fun put(session: WalkSession) {
    val values = ContentValues().apply {
      put("id", session.id); put("status", session.status); put("started_at", session.startedAt)
      put("payload", JSONObject().apply {
        put("id", session.id); put("steps", session.steps); put("startedAt", session.startedAt); put("finishAt", session.finishAt)
        put("startedElapsed", session.startedElapsed); put("bootCount", session.bootCount); put("status", session.status)
        put("updatedAt", session.updatedAt); put("recordId", session.recordId ?: JSONObject.NULL)
        put("errorCode", session.errorCode ?: JSONObject.NULL); put("errorMessage", session.errorMessage ?: JSONObject.NULL)
        put("notification", session.notification); put("stoppedElapsed", session.stoppedElapsed ?: JSONObject.NULL)
      }.toString())
    }
    val db = writableDatabase
    if (db.update("sessions", values, "id = ?", arrayOf(session.id)) == 0) db.insertOrThrow("sessions", null, values)
  }
  @Synchronized override fun prune() {
    transaction {
      all().filter { it.status in listOf("completed", "cancelled", "failed") }.drop(30)
        .filterNot { it.status == "completed" && it.notification == "pending" }
        .forEach { writableDatabase.delete("sessions", "id = ?", arrayOf(it.id)) }
    }
  }
  private fun decode(payload: String): WalkSession {
    val j = JSONObject(payload)
    fun nullable(key: String) = if (j.isNull(key)) null else j.getString(key)
    return WalkSession(j.getString("id"), j.getInt("steps"), j.getLong("startedAt"), j.getLong("finishAt"),
      j.getLong("startedElapsed"), j.getInt("bootCount"), j.getString("status"), j.getLong("updatedAt"),
      nullable("recordId"), nullable("errorCode"), nullable("errorMessage"), j.getString("notification"),
      if (j.isNull("stoppedElapsed")) null else j.getLong("stoppedElapsed"))
  }
}
