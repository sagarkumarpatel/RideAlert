package com.example.ridealert.detection

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlin.math.abs
import kotlin.math.sqrt

class DriftPatternDetector(context: Context) : SensorEventListener {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private val gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

    // Configuration thresholds
    private val sharpCorrectionThreshold = 2.0f // Lowered for easier testing
    private val shakeAccelerationThreshold = 15.0f // m/s^2 (Standard gravity is 9.8)

    private var lastGyroX = 0f
    private var lastGyroY = 0f
    private var lastEventTime = 0L
    
    // Callback for drift events
    var onDriftDetected: ((isWarning: Boolean) -> Unit)? = null

    fun start() {
        accelerometer?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        gyroscope?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
    }

    fun stop() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        val now = System.currentTimeMillis()
        // Debounce to prevent flooding the backend with events every millisecond
        if (now - lastEventTime < 2000) return

        if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            val x = event.values[0]
            val y = event.values[1]

            val deltaX = abs(x - lastGyroX)
            val deltaY = abs(y - lastGyroY)

            if (deltaX > sharpCorrectionThreshold || deltaY > sharpCorrectionThreshold) {
                lastEventTime = now
                onDriftDetected?.invoke(true)
            }

            lastGyroX = x
            lastGyroY = y
        } else if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            val gForce = sqrt((x * x + y * y + z * z).toDouble()).toFloat()

            // A sudden spike in acceleration (shaking the phone or sudden braking/swerving)
            if (gForce > shakeAccelerationThreshold) {
                lastEventTime = now
                onDriftDetected?.invoke(true)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed for now
    }
}
