package com.example.ridealert.ui.camera

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

    Box(modifier = Modifier.fillMaxSize()) {
        com.example.ridealert.ui.main.AnimatedMeshBackground()

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
                modifier = Modifier
                    .size(72.dp)
                    .padding(bottom = 16.dp),
                tint = Color.White
            )

            Text(
                text = "RideAlert Fleet",
                style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                color = Color.White,
                modifier = Modifier.padding(bottom = 32.dp)
            )

            OutlinedTextField(
                value = driverId,
                onValueChange = { 
                    driverId = it
                    errorMessage = null // Clear error on typing
                },
                label = { Text("Driver ID", color = Color.LightGray) },
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.White,
                    unfocusedBorderColor = com.example.ridealert.theme.GlassBorder,
                    focusedLabelColor = Color.White,
                    unfocusedContainerColor = com.example.ridealert.theme.GlassSurfaceDark,
                    focusedContainerColor = com.example.ridealert.theme.GlassSurfaceDark,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
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
                                val trimmedDriverId = driverId.trim()
                                val response = ApiClient.instance.loginDriver(DriverLoginRequest(trimmedDriverId))
                                // Save token
                                val sessionManager = SessionManager(context)
                                sessionManager.saveAuthToken(response.token)
                                sessionManager.saveDriverId(response.driverId)
                                
                                isLoading = false
                                onLoginSuccess(response.driverId)
                            } catch (e: Exception) {
                                isLoading = false
                                android.util.Log.e("LoginScreen", "Login failed", e)
                                if (e is HttpException) {
                                    if (e.code() == 401 || e.code() == 404) {
                                        errorMessage = "No matching Driver ID found. Please contact your Fleet Manager."
                                    } else {
                                        errorMessage = "Server error (${e.code()}). Please try again."
                                    }
                                } else if (e is java.net.SocketTimeoutException) {
                                    errorMessage = "Server connection timed out. The server was waking up, please try again."
                                } else if (e is java.net.UnknownHostException) {
                                    errorMessage = "No internet connection. Please check your network."
                                } else if (e is java.io.IOException) {
                                    errorMessage = "Network error: Unable to reach server. Please try again."
                                } else {
                                    val msg = e.localizedMessage ?: e.message ?: e.javaClass.simpleName
                                    errorMessage = "Login failed: $msg"
                                }
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .border(
                        1.dp,
                        com.example.ridealert.theme.GlassBorder,
                        RoundedCornerShape(50)
                    ),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(
                    containerColor = com.example.ridealert.theme.GlassSurfaceLight,
                    contentColor = Color.Black
                ),
                enabled = !isLoading && driverId.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(28.dp))
                } else {
                    Text(
                        text = "Login",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    )
                }
            }
        }
    }
}
