package com.example.ridealert.data.local

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SessionManager(context: Context) {

    private val sharedPreferences: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            "ridealert_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        Log.e("SessionManager", "EncryptedSharedPreferences failed, attempting recovery", e)
        try {
            // Delete corrupt preferences file from previous installs or broken keystore state
            context.deleteSharedPreferences("ridealert_secure_prefs")
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                "ridealert_secure_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (fallbackEx: Exception) {
            Log.e("SessionManager", "Falling back to standard SharedPreferences", fallbackEx)
            context.getSharedPreferences("ridealert_session_prefs", Context.MODE_PRIVATE)
        }
    }

    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString("auth_token", token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString("auth_token", null)
    }

    fun saveDriverId(driverId: String) {
        sharedPreferences.edit().putString("driver_id", driverId).apply()
    }

    fun getDriverId(): String? {
        return sharedPreferences.getString("driver_id", null)
    }

    fun clearSession() {
        sharedPreferences.edit().clear().apply()
    }
}
