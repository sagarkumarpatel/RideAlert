package com.example.ridealert.data.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.ridealert.data.ApiClient
import com.example.ridealert.data.FatigueEventRequest
import com.example.ridealert.data.local.AppDatabase

class FatigueSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val dao = database.fatigueEventDao()

        val unsyncedEvents = dao.getAllEvents()
        if (unsyncedEvents.isEmpty()) {
            return Result.success()
        }

        return try {
            val successfulIds = mutableListOf<Int>()
            for (event in unsyncedEvents) {
                val request = FatigueEventRequest(
                    timestamp = event.timestamp,
                    fatigueLevel = event.fatigueLevel,
                    primarySignal = event.primarySignal,
                    eyeClosureScore = event.eyeClosureScore,
                    latitude = event.latitude,
                    longitude = event.longitude
                )
                
                try {
                    ApiClient.instance.reportFatigueEvent(event.tripId, request)
                    successfulIds.add(event.id)
                } catch (e: Exception) {
                    Log.e("FatigueSyncWorker", "Failed to sync event ${event.id}", e)
                    // Continue trying others, but don't add to successful list
                }
            }

            if (successfulIds.isNotEmpty()) {
                dao.deleteEvents(successfulIds)
                Log.d("FatigueSyncWorker", "Successfully synced ${successfulIds.size} events")
            }

            // If we synced some but not all, return retry so it runs again later
            if (successfulIds.size < unsyncedEvents.size) {
                Result.retry()
            } else {
                Result.success()
            }
        } catch (e: Exception) {
            Log.e("FatigueSyncWorker", "Worker failed completely", e)
            Result.retry()
        }
    }
}
