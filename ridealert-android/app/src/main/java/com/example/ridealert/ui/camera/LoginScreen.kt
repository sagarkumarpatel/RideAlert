package com.example.ridealert.ui.camera

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.ridealert.data.ApiClient
import com.example.ridealert.data.DriverLoginRequest
import com.example.ridealert.data.local.SessionManager
import kotlinx.coroutines.launch
import retrofit2.HttpException

@Composable
fun LoginScreen(onLoginSuccess: (String) -> Unit) {
    var driverId by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.DirectionsCar,
            contentDescription = "App Logo",
            modifier = Modifier.size(72.dp).padding(bottom = 16.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Text(
            text = "RideAlert Fleet",
            style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        OutlinedTextField(
            value = driverId,
            onValueChange = { 
                driverId = it
                errorMessage = null // Clear error on typing
            },
            label = { Text("Driver ID") },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.secondary,
                focusedLabelColor = MaterialTheme.colorScheme.primary
            ),
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            singleLine = true,
            isError = errorMessage != null
        )

        if (errorMessage != null) {
            Text(
                text = errorMessage!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        Button(
            onClick = {
                if (driverId.isNotBlank()) {
                    isLoading = true
                    errorMessage = null
                    
                    coroutineScope.launch {
                        try {
                            val response = ApiClient.instance.loginDriver(DriverLoginRequest(driverId))
                            // Save token
                            val sessionManager = SessionManager(context)
                            sessionManager.saveAuthToken(response.token)
                            sessionManager.saveDriverId(response.driverId)
                            
                            isLoading = false
                            onLoginSuccess(response.driverId)
                        } catch (e: Exception) {
                            isLoading = false
                            if (e is HttpException && (e.code() == 401 || e.code() == 404)) {
                                errorMessage = "No matching Driver ID found. Please contact your Fleet Manager."
                            } else {
                                errorMessage = "Login failed: ${e.message}"
                            }
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(50),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ),
            enabled = !isLoading && driverId.isNotBlank()
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(28.dp))
            } else {
                Text(
                    text = "Login",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, fontSize = 18.sp)
                )
            }
        }
    }
}
