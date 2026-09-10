package com.example.ridealert.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

// Models
data class TripCreateRequest(val driverId: String, val vehicleId: String, val deviceId: String)
data class TripCreateResponse(val tripId: String)

data class FatigueEventRequest(
    val timestamp: String,
    val fatigueLevel: String,
    val primarySignal: String = "VISION",
    val lightCondition: String = "DAYLIGHT",
    val eyeClosureScore: Double = 1.0,
    val driftScore: Double = 0.0
)
data class FatigueEventResponse(val id: String)

// API Interface
interface RideAlertApi {
    @POST("/api/trips")
    suspend fun startTrip(@Body request: TripCreateRequest): TripCreateResponse

    @PATCH("/api/trips/{tripId}/end")
    suspend fun endTrip(@Path("tripId") tripId: String)

    @POST("/api/trips/{tripId}/fatigue-events")
    suspend fun reportFatigueEvent(
        @Path("tripId") tripId: String,
        @Body request: FatigueEventRequest
    ): FatigueEventResponse
}

// Retrofit Client
object ApiClient {
    private const val BASE_URL = "http://172.16.149.95:3000" // Pointing to your local Node.js server

    val instance: RideAlertApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RideAlertApi::class.java)
    }
}
