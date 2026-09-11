package com.example.ridealert

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable data object Login : NavKey

@Serializable data class Main(val driverId: String) : NavKey
