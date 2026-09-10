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
fun CameraPreviewScreen() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    // --- Add state for tracking fatigue ---
    val fatigueStateMachine = remember { FatigueStateMachine() }
    val eyeStateTracker = remember { EyeStateTracker() }
    var currentFatigueState by remember { mutableStateOf(FatigueLevel.NORMAL) }
    val coroutineScope = rememberCoroutineScope()
    var activeTripId by remember { mutableStateOf<String?>(null) }
    
    // Auto-start a trip for demo purposes
    LaunchedEffect(Unit) {
        try {
            // Use mock IDs matching the DB requirements
            val response = com.example.ridealert.data.ApiClient.instance.startTrip(
                com.example.ridealert.data.TripCreateRequest(
                    driverId = "mock-driver-123",
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
            
            // Send alert to the Node.js backend if state is dangerous
            if ((newState == FatigueLevel.WARNING || newState == FatigueLevel.CRITICAL) && activeTripId != null) {
                coroutineScope.launch {
                    try {
                        val request = com.example.ridealert.data.FatigueEventRequest(
                            timestamp = java.time.Instant.now().toString(),
                            fatigueLevel = newState.name,
                            primarySignal = "VISION",
                            eyeClosureScore = 1.0
                        )
                        com.example.ridealert.data.ApiClient.instance.reportFatigueEvent(activeTripId!!, request)
                        Log.d("CameraPreview", "Successfully synced $newState event to backend!")
                    } catch (e: Exception) {
                        Log.e("CameraPreview", "Failed to sync event to backend", e)
                    }
                }
            }
        }
    }
    // ----------------------------------------

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    if (hasCameraPermission) {
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
            Text("Camera permission is required for fatigue detection.")
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                Text("Grant Permission")
            }
        }
    }
}
