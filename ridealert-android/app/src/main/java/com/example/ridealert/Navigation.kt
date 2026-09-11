package com.example.ridealert

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.ridealert.ui.main.MainScreen

import com.example.ridealert.ui.camera.LoginScreen

@Composable
fun MainNavigation() {
  val backStack = rememberNavBackStack(Login)

  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider =
      entryProvider {
        entry<Login> {
          LoginScreen(onLoginSuccess = { driverId -> backStack.add(Main(driverId)) })
        }
        entry<Main> {
          val args = it as Main
          MainScreen(driverId = args.driverId, modifier = Modifier.safeDrawingPadding().padding(16.dp))
        }
      },
  )
}
