package com.example.ridealert.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
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
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
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
            Text(
                text = "Driver Activity", 
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold), 
                modifier = Modifier.padding(bottom = 24.dp, top = 16.dp),
                color = MaterialTheme.colorScheme.onBackground
            )
            
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(text = "Overview Stats", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 16.dp), color = MaterialTheme.colorScheme.primary)
                    StatItem(label = "Total Trips", value = o.summary.totalTrips.toString())
                    StatItem(label = "Fatigue Flags", value = o.summary.fatigueFlags.toString())
                    StatItem(label = "Critical Events", value = o.summary.criticalEvents.toString())
                }
            }
            
            Text(text = "Recent Alerts will appear here...", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.secondary)
        }
    }
}

@Composable
fun StatItem(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.secondary)
        Text(text = value, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
    }
}
