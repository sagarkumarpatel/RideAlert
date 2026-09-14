package com.example.ridealert.ui.main

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.example.ridealert.theme.BrandCyan
import com.example.ridealert.theme.BrandGold
import com.example.ridealert.theme.BrandMagenta
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun AnimatedMeshBackground(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "mesh_transition")
    
    val phase1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase1"
    )
    
    val phase2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(18000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase2"
    )
    
    val phase3 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(15000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase3"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height

        // Background color (dark slate)
        drawRect(color = Color(0xFF101216))

        // Ribbon 1: Cyan/Blue layer
        val path1 = androidx.compose.ui.graphics.Path().apply {
            moveTo(-width * 0.2f, height * 0.35f + height * 0.1f * kotlin.math.sin(phase1))
            quadraticBezierTo(
                width * 0.5f, height * 0.1f + height * 0.15f * kotlin.math.cos(phase1),
                width * 1.2f, height * 0.4f + height * 0.1f * kotlin.math.sin(phase1 + 1f)
            )
            lineTo(width * 1.2f, height * 1.2f)
            lineTo(-width * 0.2f, height * 1.2f)
            close()
        }

        drawPath(
            path = path1,
            brush = Brush.linearGradient(
                colors = listOf(BrandCyan.copy(alpha = 0.85f), Color(0xFF0F4C75).copy(alpha = 0.4f)),
                start = Offset(0f, 0f),
                end = Offset(width, height)
            )
        )
        // Add a crisp glass highlight edge
        drawPath(
            path = path1,
            color = Color.White.copy(alpha = 0.3f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f)
        )

        // Ribbon 2: Magenta layer
        val path2 = androidx.compose.ui.graphics.Path().apply {
            moveTo(-width * 0.2f, height * 0.65f + height * 0.15f * kotlin.math.cos(phase2))
            quadraticBezierTo(
                width * 0.6f, height * 0.4f + height * 0.2f * kotlin.math.sin(phase2),
                width * 1.2f, height * 0.6f + height * 0.1f * kotlin.math.cos(phase2 + 1f)
            )
            lineTo(width * 1.2f, height * 1.2f)
            lineTo(-width * 0.2f, height * 1.2f)
            close()
        }

        drawPath(
            path = path2,
            brush = Brush.linearGradient(
                colors = listOf(BrandMagenta.copy(alpha = 0.75f), Color(0xFF4A0024).copy(alpha = 0.3f)),
                start = Offset(0f, height * 0.3f),
                end = Offset(width, height)
            )
        )
        // Highlight edge
        drawPath(
            path = path2,
            color = Color.White.copy(alpha = 0.25f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2f)
        )

        // Ribbon 3: Gold layer
        val path3 = androidx.compose.ui.graphics.Path().apply {
            moveTo(width * 1.2f, height * 0.85f + height * 0.1f * kotlin.math.sin(phase1 + 2f))
            quadraticBezierTo(
                width * 0.4f, height * 0.95f + height * 0.1f * kotlin.math.cos(phase2 + 2f),
                -width * 0.2f, height * 0.7f + height * 0.1f * kotlin.math.sin(phase1)
            )
            lineTo(-width * 0.2f, height * 1.2f)
            lineTo(width * 1.2f, height * 1.2f)
            close()
        }

        drawPath(
            path = path3,
            brush = Brush.linearGradient(
                colors = listOf(BrandGold.copy(alpha = 0.8f), Color.Transparent),
                start = Offset(width, height * 0.6f),
                end = Offset(0f, height)
            )
        )
        // Highlight edge
        drawPath(
            path = path3,
            color = Color.White.copy(alpha = 0.2f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2f)
        )
    }
}
