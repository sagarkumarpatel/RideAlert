package com.example.ridealert.detection

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlin.math.abs

class DriftPatternDetector(context: Context) : SensorEventListener {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    private val gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

    // Configuration thresholds
    private val driftThreshold = 0.5f // Rad/s or m/s^2 depending on sensor
    private val sharpCorrectionThreshold = 2.5f

    private var lastX = 0f
    private var lastY = 0f
    
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
        if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            val x = event.values[0]
            val y = event.values[1]

            val deltaX = abs(x - lastX)
            val deltaY = abs(y - lastY)

            // Detect gradual drift (micro-corrections failing) followed by sharp correction
            if (deltaX > sharpCorrectionThreshold || deltaY > sharpCorrectionThreshold) {
                // Sudden sharp correction after a period of drifting indicates driver waking up
                onDriftDetected?.invoke(true)
            }

            lastX = x
            lastY = y
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed for now
    }
}
