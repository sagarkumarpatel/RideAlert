package com.example.ridealert.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.ridealert.data.ApiClient
import com.example.ridealert.data.DriverOverview
import com.example.ridealert.data.local.SessionManager

@Composable
fun ActivityScreen() {
    val context = LocalContext.current
    var overview by remember { mutableStateOf<DriverOverview?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val sessionManager = SessionManager(context)
        val token = sessionManager.getAuthToken()
        if (token != null) {
            try {
                overview = ApiClient.instance.getDriverOverview("Bearer $token")
            } catch (e: Exception) {
                error = e.message
            } finally {
                isLoading = false
            }
        } else {
            error = "Not authenticated"
            isLoading = false
        }
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (error != null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text("Error loading activity: $error", color = MaterialTheme.colorScheme.error)
        }
        return
    }

    overview?.let { o ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text(text = "Driver Activity", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(bottom = 24.dp))
            
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Total Trips: ${o.summary.totalTrips}", style = MaterialTheme.typography.bodyLarge)
                    Text(text = "Fatigue Flags: ${o.summary.fatigueFlags}", style = MaterialTheme.typography.bodyLarge)
                    Text(text = "Critical Events: ${o.summary.criticalEvents}", style = MaterialTheme.typography.bodyLarge)
                }
            }
            
            Text(text = "Recent Alerts will appear here...", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
