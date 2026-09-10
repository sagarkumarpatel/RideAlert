package com.example.ridealert.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "fatigue_events")
data class FatigueEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val tripId: String,
    val timestamp: String,
    val fatigueLevel: String,
    val primarySignal: String,
    val eyeClosureScore: Double
)
