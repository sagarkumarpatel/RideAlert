package com.example.ridealert.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryGreen,
    onPrimary = Color.Black,
    primaryContainer = PrimaryGreenDark,
    secondary = TextSecondary,
    tertiary = AlertRed,
    background = BackgroundDark,
    surface = SurfaceDark,
    surfaceVariant = SurfaceVariantDark,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextPrimary,
    error = AlertRed
)

// We force the dark theme for the RideAlert environment to reduce eye strain,
// so we'll just reuse DarkColorScheme for light mode as well.
private val LightColorScheme = DarkColorScheme

@Composable
fun RideAlertTheme(
  // Default to Dark Theme explicitly
  darkTheme: Boolean = true,
  dynamicColor: Boolean = false, // Disable dynamic colors to enforce branding
  content: @Composable () -> Unit,
) {
  val colorScheme = DarkColorScheme

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
