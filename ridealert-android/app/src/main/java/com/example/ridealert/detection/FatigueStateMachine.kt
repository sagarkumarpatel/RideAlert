package com.example.ridealert.detection

enum class FatigueLevel {
    NORMAL, WARNING, CRITICAL
}

class FatigueStateMachine {
    var currentState = FatigueLevel.NORMAL
        private set

    private var consecutiveWarnings = 0
    private val warningToCriticalThreshold = 3 // 3 warnings within timeframe = CRITICAL

    private var lastEventTime = System.currentTimeMillis()

    // Callback when state changes
    var onStateChanged: ((oldState: FatigueLevel, newState: FatigueLevel) -> Unit)? = null

    fun reportVisionEvent(isMicrosleep: Boolean, isWarning: Boolean) {
        processEvent(isMicrosleep, isWarning)
    }

    fun reportMotionPattern(isWarning: Boolean) {
        processEvent(false, isWarning)
    }

    @Synchronized
    private fun processEvent(isCritical: Boolean, isWarning: Boolean) {
        val now = System.currentTimeMillis()
        
        // Reset counters if a long time has passed since last event (e.g., 5 mins)
        if (now - lastEventTime > 5 * 60 * 1000) {
            consecutiveWarnings = 0
            if (currentState != FatigueLevel.NORMAL) {
                transitionTo(FatigueLevel.NORMAL)
            }
        }

        if (isCritical) {
            // Microsleep automatically triggers CRITICAL
            transitionTo(FatigueLevel.CRITICAL)
        } else if (isWarning) {
            consecutiveWarnings++
            if (consecutiveWarnings >= warningToCriticalThreshold) {
                // Too many warnings in succession escalates to CRITICAL
                transitionTo(FatigueLevel.CRITICAL)
            } else {
                if (currentState == FatigueLevel.NORMAL) {
                    transitionTo(FatigueLevel.WARNING)
                }
            }
        }

        lastEventTime = now
    }

    private fun transitionTo(newState: FatigueLevel) {
        if (currentState != newState) {
            val oldState = currentState
            currentState = newState
            onStateChanged?.invoke(oldState, newState)
            
            // If we transition to CRITICAL, we might want to reset the warning counter after handling
            if (newState == FatigueLevel.CRITICAL) {
                consecutiveWarnings = 0
            }
        }
    }

    fun reset() {
        if (currentState != FatigueLevel.NORMAL) {
            transitionTo(FatigueLevel.NORMAL)
        }
        consecutiveWarnings = 0
    }
}
