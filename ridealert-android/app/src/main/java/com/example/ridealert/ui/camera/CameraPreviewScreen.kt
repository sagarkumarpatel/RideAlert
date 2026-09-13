package com.example.ridealert.ui.camera

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import android.view.ViewGroup
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.activity.result.IntentSenderRequest
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.compose.ui.draw.scale
import com.example.ridealert.detection.EyeStateTracker
import com.example.ridealert.detection.FatigueStateMachine
import com.example.ridealert.detection.FatigueLevel
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import androidx.compose.animation.core.animateFloat

@Composable
fun CameraPreviewScreen(driverId: String) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasPermissions by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasPermissions = permissions[Manifest.permission.CAMERA] == true && 
                         permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }

    // --- Add state for tracking fatigue ---
    val fatigueStateMachine = remember { FatigueStateMachine() }
    val eyeStateTracker = remember { EyeStateTracker() }
    var currentFatigueState by remember { mutableStateOf(FatigueLevel.NORMAL) }
    var latestEyeState by remember { mutableStateOf<com.example.ridealert.detection.EyeStateResult?>(null) }
    var showCriticalOverlay by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()
    val activeTripIdState = remember { mutableStateOf<String?>(null) }
    val activeTripId = activeTripIdState.value
    
    val sessionManager = remember { com.example.ridealert.data.local.SessionManager(context) }
    
    var mediaPlayer: android.media.MediaPlayer? by remember { mutableStateOf(null) }
    val driftDetector = remember { com.example.ridealert.detection.DriftPatternDetector(context) }
    val fusedLocationClient = remember { com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context) }
    val currentLocationState = remember { mutableStateOf<android.location.Location?>(null) }
    
    val settingResultRequest = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartIntentSenderForResult()
    ) { activityResult ->
        if (activityResult.resultCode == android.app.Activity.RESULT_OK) {
            Log.d("CameraPreview", "User enabled location settings")
        } else {
            Log.e("CameraPreview", "User denied location settings")
        }
    }

    LaunchedEffect(hasPermissions) {
        if (hasPermissions) {
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                    if (loc != null && currentLocationState.value == null) {
                        currentLocationState.value = loc
                        Log.d("CameraPreview", "Got last known location immediately")
                    }
                }
            } catch (e: SecurityException) {
                Log.e("CameraPreview", "Missing permission for lastLocation", e)
            }

            val locationRequest = com.google.android.gms.location.LocationRequest.Builder(
                com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY, 5000
            ).setMinUpdateIntervalMillis(2000).build()
            
            val builder = com.google.android.gms.location.LocationSettingsRequest.Builder()
                .addLocationRequest(locationRequest)
            
            val client = com.google.android.gms.location.LocationServices.getSettingsClient(context)
            client.checkLocationSettings(builder.build()).addOnFailureListener { exception ->
                if (exception is com.google.android.gms.common.api.ResolvableApiException) {
                    try {
                        val intentSenderRequest = IntentSenderRequest.Builder(exception.resolution).build()
                        settingResultRequest.launch(intentSenderRequest)
                    } catch (sendEx: Exception) {
                        Log.e("CameraPreview", "Failed to launch resolution", sendEx)
                    }
                }
            }
        }
    }
    
    // Actively update location
    DisposableEffect(hasPermissions) {
        var locationCallback: com.google.android.gms.location.LocationCallback? = null
        if (hasPermissions) {
            try {
                val locationRequest = com.google.android.gms.location.LocationRequest.Builder(
                    com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY, 5000
                ).setMinUpdateIntervalMillis(2000).build()
                
                locationCallback = object : com.google.android.gms.location.LocationCallback() {
                    override fun onLocationResult(locationResult: com.google.android.gms.location.LocationResult) {
                        currentLocationState.value = locationResult.lastLocation
                        Log.d("CameraPreview", "Updated Location: ${currentLocationState.value?.latitude}, ${currentLocationState.value?.longitude}")
                    }
                }
                
                fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    android.os.Looper.getMainLooper()
                )
            } catch (e: SecurityException) {
                Log.e("CameraPreview", "Location permission missing", e)
            }
        }
        
        onDispose {
            locationCallback?.let {
                fusedLocationClient.removeLocationUpdates(it)
            }
        }
    }
    
    var showEmergencyOverlay by remember { mutableStateOf(false) }
    var emergencyMediaPlayer: android.media.MediaPlayer? by remember { mutableStateOf(null) }

    DisposableEffect(lifecycleOwner) {
        driftDetector.onDriftDetected = { isWarning ->
            fatigueStateMachine.reportMotionPattern(isWarning)
            
            // --- Immediate Alarm, Vibration, and Toast for Shake/Fall ---
            android.widget.Toast.makeText(context, "Emergency: Rapid Motion / Fall Detected!", android.widget.Toast.LENGTH_LONG).show()
            
            showEmergencyOverlay = true
            
            try {
                val uri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
                emergencyMediaPlayer?.release()
                emergencyMediaPlayer = android.media.MediaPlayer.create(context, uri)
                emergencyMediaPlayer?.isLooping = true
                emergencyMediaPlayer?.start()
            } catch (e: Exception) {
                Log.e("CameraPreview", "Failed to play emergency alarm", e)
            }
            
            val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
            val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern, 0))
            } else {
                vibrator.vibrate(pattern, 0)
            }

            // Insert MOTION event locally and sync via Retrofit immediately
            val currentTripId = activeTripIdState.value
            if (currentTripId != null) {
                coroutineScope.launch {
                    val token = sessionManager.getAuthToken() ?: ""
                    try {
                        com.example.ridealert.data.ApiClient.instance.reportFatigueEvent(
                            tripId = currentTripId,
                            token = "Bearer $token",
                            request = com.example.ridealert.data.FatigueEventRequest(
                                timestamp = System.currentTimeMillis().toString(),
                                fatigueLevel = FatigueLevel.CRITICAL.name,
                                primarySignal = "MOTION",
                                latitude = currentLocationState.value?.latitude,
                                longitude = currentLocationState.value?.longitude
                            )
                        )
                        Log.d("CameraPreview", "Emergency event synced immediately via Retrofit")
                    } catch (e: Exception) {
                        Log.e("CameraPreview", "Failed immediate sync via Retrofit", e)
                    }

                    try {
                        val db = com.example.ridealert.data.local.AppDatabase.getDatabase(context)
                        db.fatigueEventDao().insertEvent(
                            com.example.ridealert.data.local.FatigueEventEntity(
                                tripId = currentTripId,
                                timestamp = System.currentTimeMillis().toString(),
                                fatigueLevel = FatigueLevel.CRITICAL.name,
                                primarySignal = "MOTION",
                                eyeClosureScore = 0.0,
                                latitude = currentLocationState.value?.latitude,
                                longitude = currentLocationState.value?.longitude
                            )
                        )
                        val workRequest = androidx.work.OneTimeWorkRequestBuilder<com.example.ridealert.data.worker.FatigueSyncWorker>()
                            .setConstraints(
                                androidx.work.Constraints.Builder()
                                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                                    .build()
                            ).build()
                        androidx.work.WorkManager.getInstance(context).enqueue(workRequest)
                        Log.d("CameraPreview", "Saved MOTION event locally!")
                    } catch (e: Exception) {
                        Log.e("CameraPreview", "Failed to save MOTION event", e)
                    }
                }
            }
        }
        driftDetector.start()
        
        onDispose {
            driftDetector.stop()
            mediaPlayer?.release()
            emergencyMediaPlayer?.release()
        }
    }
    
    // Trip lifecycle management
    var isStartingTrip by remember { mutableStateOf(false) }
    var isStoppingTrip by remember { mutableStateOf(false) }
    
    // Auto-stop trip if navigating away while trip is active
    DisposableEffect(Unit) {
        onDispose {
            val currentTripId = activeTripIdState.value
            if (currentTripId != null && !isStoppingTrip) {
                // Prevent multiple calls
                activeTripIdState.value = null
                kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                    try {
                        val token = sessionManager.getAuthToken() ?: ""
                        com.example.ridealert.data.ApiClient.instance.endTrip(currentTripId, "Bearer $token")
                        Log.d("CameraPreview", "Auto-ended Trip on dispose: $currentTripId")
                    } catch (e: Exception) {
                        Log.e("CameraPreview", "Failed to auto-end trip on dispose", e)
                    }
                }
            }
        }
    }
    
    fun startTrip() {
        if (isStartingTrip) return
        isStartingTrip = true
        coroutineScope.launch {
            try {
                val token = sessionManager.getAuthToken() ?: ""
                val response = com.example.ridealert.data.ApiClient.instance.startTrip(
                    token = "Bearer $token",
                    request = com.example.ridealert.data.TripCreateRequest(
                        driverId = driverId,
                        vehicleId = "mock-vehicle-456",
                        deviceId = "mock-device-789"
                    )
                )
                activeTripIdState.value = response.tripId
                Log.d("CameraPreview", "Started Trip: ${response.tripId}")
            } catch (e: Exception) {
                Log.e("CameraPreview", "Failed to start trip", e)
            } finally {
                isStartingTrip = false
            }
        }
    }
    
    fun stopTrip() {
        if (isStoppingTrip || activeTripId == null) return
        isStoppingTrip = true
        coroutineScope.launch {
            try {
                val token = sessionManager.getAuthToken() ?: ""
                com.example.ridealert.data.ApiClient.instance.endTrip(activeTripId!!, "Bearer $token")
                Log.d("CameraPreview", "Ended Trip: $activeTripId")
            } catch (e: Exception) {
                Log.e("CameraPreview", "Failed to end trip", e)
            } finally {
                activeTripIdState.value = null
                fatigueStateMachine.reset()
                currentFatigueState = FatigueLevel.NORMAL
                showCriticalOverlay = false
                showEmergencyOverlay = false
                
                mediaPlayer?.stop()
                mediaPlayer?.release()
                mediaPlayer = null
                
                emergencyMediaPlayer?.stop()
                emergencyMediaPlayer?.release()
                emergencyMediaPlayer = null
                
                val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
                vibrator.cancel()
                isStoppingTrip = false
            }
        }
    }
    
    LaunchedEffect(fatigueStateMachine) {
        fatigueStateMachine.onStateChanged = { _, newState ->
            currentFatigueState = newState
            
            // --- Audio & Haptic Alerts ---
            val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
            if (newState == FatigueLevel.CRITICAL) {
                showCriticalOverlay = true
                try {
                    val uri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
                    mediaPlayer?.release()
                    mediaPlayer = android.media.MediaPlayer.create(context, uri)
                    mediaPlayer?.isLooping = true
                    mediaPlayer?.start()
                } catch (e: Exception) {
                    Log.e("CameraPreview", "Failed to play alarm", e)
                }
                
                val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern, 0))
                } else {
                    vibrator.vibrate(pattern, 0)
                }
            } else if (newState == FatigueLevel.NORMAL) {
                showCriticalOverlay = false
                mediaPlayer?.stop()
                mediaPlayer?.release()
                mediaPlayer = null
                vibrator.cancel()
            }
            
            // --- Offline Sync & Storage ---
            val currentTripId = activeTripIdState.value
            if ((newState == FatigueLevel.WARNING || newState == FatigueLevel.CRITICAL) && currentTripId != null) {
                coroutineScope.launch {
                    try {
                        val token = sessionManager.getAuthToken() ?: ""
                        com.example.ridealert.data.ApiClient.instance.reportFatigueEvent(
                            tripId = currentTripId,
                            token = "Bearer $token",
                            request = com.example.ridealert.data.FatigueEventRequest(
                                timestamp = System.currentTimeMillis().toString(),
                                fatigueLevel = newState.name,
                                primarySignal = "FACIAL",
                                eyeClosureScore = 1.0,
                                latitude = currentLocationState.value?.latitude,
                                longitude = currentLocationState.value?.longitude
                            )
                        )
                        Log.d("CameraPreview", "Facial event synced immediately via Retrofit")
                    } catch (e: Exception) {
                        Log.e("CameraPreview", "Failed immediate sync for facial event", e)
                    }

                    try {
                        val db = com.example.ridealert.data.local.AppDatabase.getDatabase(context)
                        val entity = com.example.ridealert.data.local.FatigueEventEntity(
                            tripId = currentTripId,
                            timestamp = System.currentTimeMillis().toString(),
                            fatigueLevel = newState.name,
                            primarySignal = "FACIAL",
                            eyeClosureScore = 1.0,
                            latitude = currentLocationState.value?.latitude,
                            longitude = currentLocationState.value?.longitude
                        )
                        db.fatigueEventDao().insertEvent(entity)
                        
                        val workRequest = androidx.work.OneTimeWorkRequestBuilder<com.example.ridealert.data.worker.FatigueSyncWorker>()
                            .setConstraints(
                                androidx.work.Constraints.Builder()
                                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                                    .build()
                            ).build()
                        
                        androidx.work.WorkManager.getInstance(context).enqueue(workRequest)
                        
                        Log.d("CameraPreview", "Successfully saved $newState event locally and enqueued sync worker!")
                    } catch (e: Exception) {
                        Log.e("CameraPreview", "Failed to save event locally", e)
                    }
                }
            }
        }
    }
    // ----------------------------------------

    LaunchedEffect(Unit) {
        if (!hasPermissions) {
            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
    }

    if (hasPermissions) {
        Box(modifier = Modifier.fillMaxSize()) {
            if (activeTripId != null) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        val previewView = PreviewView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            scaleType = PreviewView.ScaleType.FILL_CENTER
                        }

                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()

                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }

                            // Set up ImageAnalysis for ML Kit (Eye Tracking)
                            val imageAnalysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()
                            
                            imageAnalysis.setAnalyzer(Executors.newSingleThreadExecutor()) { imageProxy ->
                                if (activeTripIdState.value == null) {
                                    imageProxy.close()
                                    return@setAnalyzer
                                }
                                
                                // --- Connect ImageProxy to ML Kit InputImage ---
                                @OptIn(ExperimentalGetImage::class)
                                val mediaImage = imageProxy.image
                                if (mediaImage != null) {
                                    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                                    eyeStateTracker.processFrame(image) { result ->
                                        latestEyeState = result
                                        fatigueStateMachine.reportVisionEvent(result.isMicrosleep, result.isWarning)
                                        
                                        // Auto-dismiss critical overlay if eyes are opened
                                        if (!result.isEyesClosed && showCriticalOverlay) {
                                            fatigueStateMachine.reset()
                                            showCriticalOverlay = false
                                            mediaPlayer?.stop()
                                            mediaPlayer?.release()
                                            mediaPlayer = null
                                        }
                                        
                                        // Important: Must close the proxy after ML Kit finishes processing
                                        imageProxy.close()
                                    }
                                } else {
                                    imageProxy.close()
                                }
                            }

                            // We use the front camera for driver monitoring
                            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    cameraSelector,
                                    preview,
                                    imageAnalysis
                                )
                            } catch (e: Exception) {
                                Log.e("CameraPreview", "Use case binding failed", e)
                            }
                        }, ContextCompat.getMainExecutor(ctx))

                        previewView
                    }
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Camera paused.\nTap 'Start Driving' to begin monitoring.", color = Color.White, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
            }
            
            // Overlay UI - Update based on fatigue state
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // TOP: Alerts Banner
                val state = latestEyeState
                val showWarningBanner = (state != null && activeTripId != null && (state.isWarning || state.isMicrosleep || state.isEyesClosed))
                
                androidx.compose.animation.AnimatedVisibility(
                    visible = showWarningBanner,
                    enter = androidx.compose.animation.slideInVertically(initialOffsetY = { -40 }) + androidx.compose.animation.fadeIn(),
                    exit = androidx.compose.animation.slideOutVertically(targetOffsetY = { -40 }) + androidx.compose.animation.fadeOut()
                ) {
                    if (state != null) {
                        val isUrgent = state.isMicrosleep
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    color = if (isUrgent) MaterialTheme.colorScheme.error.copy(alpha = 0.8f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f),
                                    shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
                                )
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (isUrgent) "Micro-sleep Warning!" else "Eye-closure detected",
                                color = if (isUrgent) MaterialTheme.colorScheme.onError else MaterialTheme.colorScheme.primary,
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.weight(1f))
                
                // BOTTOM: Driving Controls
                if (activeTripId != null) {
                    val statusText = when (currentFatigueState) {
                        FatigueLevel.NORMAL -> "Driver Monitoring Active"
                        FatigueLevel.WARNING -> "WARNING: Drowsiness Detected"
                        FatigueLevel.CRITICAL -> "WAKE UP!"
                    }
                    val textColor = when (currentFatigueState) {
                        FatigueLevel.NORMAL -> MaterialTheme.colorScheme.primary
                        FatigueLevel.WARNING -> Color(0xFFFFA500)
                        FatigueLevel.CRITICAL -> MaterialTheme.colorScheme.error
                    }
    
                    Text(
                        text = statusText,
                        color = textColor,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold),
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                    
                    val infiniteTransition = androidx.compose.animation.core.rememberInfiniteTransition()
                    val scale by infiniteTransition.animateFloat(
                        initialValue = 1f,
                        targetValue = 1.05f,
                        animationSpec = androidx.compose.animation.core.infiniteRepeatable(
                            animation = androidx.compose.animation.core.tween(1000),
                            repeatMode = androidx.compose.animation.core.RepeatMode.Reverse
                        )
                    )

                    Button(
                        onClick = { stopTrip() }, 
                        enabled = !isStoppingTrip, 
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .scale(scale),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        if (isStoppingTrip) {
                            androidx.compose.material3.CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onError)
                        } else {
                            Text(
                                text = "Stop Driving", 
                                color = MaterialTheme.colorScheme.onError,
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                            )
                        }
                    }
                } else {
                    Button(
                        onClick = { startTrip() }, 
                        enabled = !isStartingTrip,
                        modifier = Modifier.fillMaxWidth().height(64.dp),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        if (isStartingTrip) {
                            androidx.compose.material3.CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                        } else {
                            Text(
                                text = "Start Driving",
                                color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                            )
                        }
                    }
                }
            }
            
            // Critical Red Banner Overlay
            androidx.compose.animation.AnimatedVisibility(
                visible = showCriticalOverlay,
                enter = androidx.compose.animation.fadeIn(),
                exit = androidx.compose.animation.fadeOut()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.9f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "WAKE UP!\nDROWSINESS DETECTED!",
                            color = MaterialTheme.colorScheme.onError,
                            style = MaterialTheme.typography.displayMedium.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(16.dp)
                        )
                        Spacer(modifier = Modifier.height(32.dp))
                        Button(
                            onClick = { 
                                fatigueStateMachine.reset()
                                showCriticalOverlay = false
                                mediaPlayer?.stop()
                                mediaPlayer?.release()
                                mediaPlayer = null
                            },
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                            modifier = Modifier.height(56.dp).padding(horizontal = 32.dp),
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.onError)
                        ) {
                            Text("DISMISS ALARM", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.titleLarge.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold))
                        }
                    }
                }
            }

            // Motion/Fall Emergency Red Banner Overlay
            androidx.compose.animation.AnimatedVisibility(
                visible = showEmergencyOverlay,
                enter = androidx.compose.animation.fadeIn(),
                exit = androidx.compose.animation.fadeOut()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.9f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "EMERGENCY!\nMOTION DETECTED!",
                            color = MaterialTheme.colorScheme.onError,
                            style = MaterialTheme.typography.displayMedium.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(16.dp)
                        )
                        Spacer(modifier = Modifier.height(32.dp))
                        Button(
                            onClick = { 
                                showEmergencyOverlay = false
                                emergencyMediaPlayer?.stop()
                                emergencyMediaPlayer?.release()
                                emergencyMediaPlayer = null
                                
                                val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
                                vibrator.cancel()
                            },
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                            modifier = Modifier.height(56.dp).padding(horizontal = 32.dp),
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.onError)
                        ) {
                            Text("DISMISS ALARM", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.titleLarge.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold))
                        }
                    }
                }
            }
        }

    } else {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Camera and Location permissions are required for fatigue detection.")
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) }) {
                Text("Grant Permissions")
            }
        }
    }
}
