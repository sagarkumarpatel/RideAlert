package com.example.ridealert.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.DriveEta
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.ridealert.ui.camera.CameraPreviewScreen
import com.example.ridealert.theme.GlassSurfaceDark

@Composable
fun MainScreen(driverId: String, modifier: Modifier = Modifier) {
    var selectedTab by remember { mutableStateOf(1) } // 0: Profile, 1: Drive, 2: Activity

    Box(modifier = modifier.fillMaxSize()) {
        // Render the 3D animated mesh gradient background on the bottom layer
        AnimatedMeshBackground()

        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent, // Make scaffold transparent
            bottomBar = {
                NavigationBar(
                    containerColor = GlassSurfaceDark,
                    contentColor = Color.White
                ) {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        label = { Text("Profile", color = Color.White) },
                        icon = { Icon(Icons.Default.Person, contentDescription = "Profile", tint = Color.White) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            unselectedIconColor = Color.LightGray,
                            indicatorColor = Color(0x33FFFFFF)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        label = { Text("Drive", color = Color.White) },
                        icon = { Icon(Icons.Default.DriveEta, contentDescription = "Drive", tint = Color.White) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            unselectedIconColor = Color.LightGray,
                            indicatorColor = Color(0x33FFFFFF)
                        )
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        label = { Text("Activity", color = Color.White) },
                        icon = { Icon(Icons.Default.Assessment, contentDescription = "Activity", tint = Color.White) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color.White,
                            unselectedIconColor = Color.LightGray,
                            indicatorColor = Color(0x33FFFFFF)
                        )
                    )
                }
            }
        ) { paddingValues ->
            val innerModifier = Modifier.padding(paddingValues)
            Box(modifier = innerModifier) {
                when (selectedTab) {
                    0 -> ProfileScreen()
                    1 -> CameraPreviewScreen(driverId = driverId)
                    2 -> ActivityScreen()
                }
            }
        }
    }
}
