package com.example.ridealert.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface FatigueEventDao {
    @Insert
    suspend fun insertEvent(event: FatigueEventEntity)

    @Query("SELECT * FROM fatigue_events")
    suspend fun getAllEvents(): List<FatigueEventEntity>

    @Query("DELETE FROM fatigue_events WHERE id IN (:ids)")
    suspend fun deleteEvents(ids: List<Int>)
}
