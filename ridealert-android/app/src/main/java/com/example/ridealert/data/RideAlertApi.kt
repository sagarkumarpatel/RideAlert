package com.example.ridealert.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.GET
import retrofit2.http.Header

// Models
data class DriverLoginRequest(val driverId: String)
data class DriverLoginResponse(val token: String, val driverId: String, val name: String)

data class DriverProfile(
    val id: String,
    val name: String,
    val address: String?,
    val personalContact: String?,
    val parentContact: String?,
    val hasLicence: Boolean
)

data class DriverOverviewSummary(
    val fatigueFlags: Int,
    val criticalEvents: Int,
    val totalTrips: Int
)

data class DriverOverview(
    val summary: DriverOverviewSummary
)

data class TripCreateRequest(val driverId: String, val vehicleId: String, val deviceId: String)
data class TripCreateResponse(val tripId: String)

data class FatigueEventRequest(
    val timestamp: String,
    val fatigueLevel: String,
    val primarySignal: String = "VISION",
    val lightCondition: String = "DAYLIGHT",
    val eyeClosureScore: Double = 1.0,
    val driftScore: Double = 0.0,
    val latitude: Double? = null,
    val longitude: Double? = null
)
data class FatigueEventResponse(val id: String)

// API Interface
interface RideAlertApi {
    @POST("/api/auth/driver-login")
    suspend fun loginDriver(@Body request: DriverLoginRequest): DriverLoginResponse

    @GET("/api/drivers/me")
    suspend fun getDriverProfile(@Header("Authorization") token: String): DriverProfile

    @GET("/api/drivers/me/overview")
    suspend fun getDriverOverview(@Header("Authorization") token: String): DriverOverview

    @POST("/api/trips")
    suspend fun startTrip(
        @Header("Authorization") token: String, 
        @Body request: TripCreateRequest
    ): TripCreateResponse

    @PATCH("/api/trips/{tripId}/end")
    suspend fun endTrip(
        @Path("tripId") tripId: String,
        @Header("Authorization") token: String
    )

    @POST("/api/trips/{tripId}/fatigue-events")
    suspend fun reportFatigueEvent(
        @Path("tripId") tripId: String,
        @Header("Authorization") token: String,
        @Body request: FatigueEventRequest
    ): FatigueEventResponse
}

// Retrofit Client
object ApiClient {
    private const val BASE_URL = "http://10.143.104.151:3000" // Pointing to your local Node.js server

    val instance: RideAlertApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(RideAlertApi::class.java)
    }
}
