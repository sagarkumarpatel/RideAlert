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
import androidx.compose.foundation.layout.*
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
import com.example.ridealert.detection.EyeStateTracker
import com.example.ridealert.detection.FatigueStateMachine
import com.example.ridealert.detection.FatigueLevel
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

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
    val coroutineScope = rememberCoroutineScope()
    var activeTripId by remember { mutableStateOf<String?>(null) }
    
    var mediaPlayer: android.media.MediaPlayer? by remember { mutableStateOf(null) }
    val driftDetector = remember { com.example.ridealert.detection.DriftPatternDetector(context) }
    val fusedLocationClient = remember { com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context) }
    var currentLocation by remember { mutableStateOf<android.location.Location?>(null) }
    
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
                        currentLocation = locationResult.lastLocation
                        Log.d("CameraPreview", "Updated Location: ${currentLocation?.latitude}, ${currentLocation?.longitude}")
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
    
    DisposableEffect(lifecycleOwner) {
        driftDetector.onDriftDetected = { isWarning ->
            fatigueStateMachine.reportMotionPattern(isWarning)
            
            // Insert MOTION event locally and sync
            if (activeTripId != null) {
                coroutineScope.launch {
                    try {
                        val db = com.example.ridealert.data.local.AppDatabase.getDatabase(context)
                        db.fatigueEventDao().insertEvent(
                            com.example.ridealert.data.local.FatigueEventEntity(
                                tripId = activeTripId!!,
                                timestamp = System.currentTimeMillis().toString(),
                                fatigueLevel = FatigueLevel.WARNING.name,
                                primarySignal = "MOTION",
                                eyeClosureScore = 0.0,
                                latitude = currentLocation?.latitude,
                                longitude = currentLocation?.longitude
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
        }
    }
    
    // Auto-start a trip for demo purposes
    LaunchedEffect(Unit) {
        try {
            // Use mock IDs matching the DB requirements
            val response = com.example.ridealert.data.ApiClient.instance.startTrip(
                com.example.ridealert.data.TripCreateRequest(
                    driverId = driverId,
                    vehicleId = "mock-vehicle-456",
                    deviceId = "mock-device-789"
                )
            )
            activeTripId = response.tripId
            Log.d("CameraPreview", "Started Trip: ${response.tripId}")
        } catch (e: Exception) {
            Log.e("CameraPreview", "Failed to start demo trip. Make sure the Node server is running on the correct IP.", e)
            // For emulator testing, you might need to change BASE_URL to your laptop's local IP if testing on a physical phone.
        }
    }
    
    LaunchedEffect(fatigueStateMachine) {
        fatigueStateMachine.onStateChanged = { _, newState ->
            currentFatigueState = newState
            
            // --- Audio & Haptic Alerts ---
            val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
            if (newState == FatigueLevel.CRITICAL) {
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
                mediaPlayer?.stop()
                mediaPlayer?.release()
                mediaPlayer = null
                vibrator.cancel()
            }
            
            // --- Offline Sync & Storage ---
            if ((newState == FatigueLevel.WARNING || newState == FatigueLevel.CRITICAL) && activeTripId != null) {
                coroutineScope.launch {
                    try {
                        val db = com.example.ridealert.data.local.AppDatabase.getDatabase(context)
                        val entity = com.example.ridealert.data.local.FatigueEventEntity(
                            tripId = activeTripId!!,
                            timestamp = System.currentTimeMillis().toString(),
                            fatigueLevel = newState.name,
                            primarySignal = "VISION",
                            eyeClosureScore = 1.0,
                            latitude = currentLocation?.latitude,
                            longitude = currentLocation?.longitude
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
                            // --- Connect ImageProxy to ML Kit InputImage ---
                            @OptIn(ExperimentalGetImage::class)
                            val mediaImage = imageProxy.image
                            if (mediaImage != null) {
                                val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                                eyeStateTracker.processFrame(image) { isMicrosleep, isWarning ->
                                    fatigueStateMachine.reportVisionEvent(isMicrosleep, isWarning)
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
            
            // Overlay UI - Update based on fatigue state
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val statusText = when (currentFatigueState) {
                    FatigueLevel.NORMAL -> "Driver Monitoring Active"
                    FatigueLevel.WARNING -> "WARNING: Drowsiness Detected"
                    FatigueLevel.CRITICAL -> "WAKE UP!"
                }
                val textColor = when (currentFatigueState) {
                    FatigueLevel.NORMAL -> Color.Green
                    FatigueLevel.WARNING -> Color.Yellow
                    FatigueLevel.CRITICAL -> Color.Red
                }

                Text(
                    text = statusText,
                    color = textColor,
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
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
