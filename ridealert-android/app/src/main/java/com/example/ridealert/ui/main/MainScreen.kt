package com.example.ridealert.ui.main

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.DriveEta
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.example.ridealert.ui.camera.CameraPreviewScreen

@Composable
fun MainScreen(driverId: String, modifier: Modifier = Modifier) {
    var selectedTab by remember { mutableStateOf(1) } // 0: Profile, 1: Drive, 2: Activity

    Scaffold(
        modifier = modifier,
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    label = { Text("Profile") },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        unselectedIconColor = MaterialTheme.colorScheme.secondary,
                        indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    label = { Text("Drive") },
                    icon = { Icon(Icons.Default.DriveEta, contentDescription = "Drive") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        unselectedIconColor = MaterialTheme.colorScheme.secondary,
                        indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    label = { Text("Activity") },
                    icon = { Icon(Icons.Default.Assessment, contentDescription = "Activity") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        unselectedIconColor = MaterialTheme.colorScheme.secondary,
                        indicatorColor = MaterialTheme.colorScheme.surfaceVariant
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
