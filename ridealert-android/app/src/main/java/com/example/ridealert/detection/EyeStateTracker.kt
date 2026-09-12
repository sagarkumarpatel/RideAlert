package com.example.ridealert.detection

import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

data class EyeStateResult(
    val isEyesClosed: Boolean,
    val isMicrosleep: Boolean,
    val isWarning: Boolean,
    val leftEyeOpen: Float,
    val rightEyeOpen: Float
)

class EyeStateTracker {
    private val options = FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .build()

    private val detector = FaceDetection.getClient(options)
    
    // Configurable thresholds
    private val blinkThreshold = 0.3f
    private val microsleepThresholdMs = 2000L // 2 seconds

    private var closedEyeStartTime: Long = 0
    private var isCurrentlyClosed = false

    /**
     * Process an image frame for eye closure.
     * Returns EyeStateResult containing current eye probabilities and event flags.
     */
    fun processFrame(image: InputImage, onResult: (result: EyeStateResult) -> Unit) {
        detector.process(image)
            .addOnSuccessListener { faces ->
                if (faces.isEmpty()) {
                    // No face detected, might be looking away or camera covered
                    onResult(EyeStateResult(false, false, false, 1.0f, 1.0f))
                    return@addOnSuccessListener
                }

                val face = faces.first()
                val leftEyeOpen = face.leftEyeOpenProbability ?: 1.0f
                val rightEyeOpen = face.rightEyeOpenProbability ?: 1.0f

                val areEyesClosed = leftEyeOpen < blinkThreshold && rightEyeOpen < blinkThreshold

                if (areEyesClosed) {
                    if (!isCurrentlyClosed) {
                        // Just closed
                        isCurrentlyClosed = true
                        closedEyeStartTime = System.currentTimeMillis()
                        onResult(EyeStateResult(true, false, false, leftEyeOpen, rightEyeOpen))
                    } else {
                        // Still closed, check duration
                        val duration = System.currentTimeMillis() - closedEyeStartTime
                        if (duration >= microsleepThresholdMs) {
                            Log.w("EyeStateTracker", "CRITICAL: Microsleep detected! Duration: $duration ms")
                            onResult(EyeStateResult(true, true, false, leftEyeOpen, rightEyeOpen)) // Critical event
                            // Reset to prevent spamming
                            closedEyeStartTime = System.currentTimeMillis()
                        } else if (duration >= 1000L) {
                            // Warning: Eyes closed for > 1 second
                            onResult(EyeStateResult(true, false, true, leftEyeOpen, rightEyeOpen))
                        } else {
                           onResult(EyeStateResult(true, false, false, leftEyeOpen, rightEyeOpen))
                        }
                    }
                } else {
                    if (isCurrentlyClosed) {
                        isCurrentlyClosed = false
                        closedEyeStartTime = 0
                    }
                    onResult(EyeStateResult(false, false, false, leftEyeOpen, rightEyeOpen))
                }
            }
            .addOnFailureListener { e ->
                Log.e("EyeStateTracker", "Face detection failed", e)
                onResult(EyeStateResult(false, false, false, 1.0f, 1.0f))
            }
    }
}
