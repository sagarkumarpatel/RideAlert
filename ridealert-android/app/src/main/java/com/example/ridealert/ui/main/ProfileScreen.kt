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
import com.example.ridealert.data.DriverProfile
import com.example.ridealert.data.local.SessionManager
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen() {
    val context = LocalContext.current
    var profile by remember { mutableStateOf<DriverProfile?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val sessionManager = SessionManager(context)
        val token = sessionManager.getAuthToken()
        if (token != null) {
            try {
                profile = ApiClient.instance.getDriverProfile("Bearer $token")
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
            Text("Error loading profile: $error", color = MaterialTheme.colorScheme.error)
        }
        return
    }

    profile?.let { p ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text(
                text = "Driver Profile", 
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold), 
                modifier = Modifier.padding(bottom = 24.dp, top = 16.dp),
                color = MaterialTheme.colorScheme.onBackground
            )
            
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    ProfileItem(label = "Driver ID", value = p.id)
                    ProfileItem(label = "Name", value = p.name)
                    ProfileItem(label = "Address", value = p.address ?: "N/A")
                    ProfileItem(label = "Personal Contact", value = p.personalContact ?: "N/A")
                    ProfileItem(label = "Parent Contact", value = p.parentContact ?: "N/A")
                    ProfileItem(label = "Licence Status", value = if (p.hasLicence) "Valid" else "Invalid/Missing")
                }
            }
        }
    }
}

@Composable
fun ProfileItem(label: String, value: String) {
    Column(modifier = Modifier.padding(bottom = 16.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
        Text(text = value, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
    }
}
