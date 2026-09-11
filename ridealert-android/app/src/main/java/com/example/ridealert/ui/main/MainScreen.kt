package com.example.ridealert.ui.main

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.NavKey
import com.example.ridealert.data.DefaultDataRepository
import com.example.ridealert.theme.RideAlertTheme
import com.example.ridealert.ui.camera.CameraPreviewScreen

@Composable
fun MainScreen(
  driverId: String,
  modifier: Modifier = Modifier,
  viewModel: MainScreenViewModel = viewModel { MainScreenViewModel(DefaultDataRepository()) },
) {
  val state by viewModel.uiState.collectAsStateWithLifecycle()
  when (state) {
    MainScreenUiState.Loading -> {
      // Blank
    }
    is MainScreenUiState.Success -> {
      MainScreen(driverId = driverId, data = (state as MainScreenUiState.Success).data, modifier = modifier)
    }
    is MainScreenUiState.Error -> {
      Text("Error loading data: ${(state as MainScreenUiState.Error).throwable.message}")
    }
  }
}

@Composable
internal fun MainScreen(driverId: String, data: List<String>, modifier: Modifier = Modifier) {
  CameraPreviewScreen(driverId = driverId)
}

@Preview(showBackground = true)
@Composable
fun MainScreenPreview() {
  RideAlertTheme { MainScreen(driverId = "demo-driver-123", data = listOf("Android")) }
}

@Preview(showBackground = true, widthDp = 340)
@Composable
fun MainScreenPortraitPreview() {
  RideAlertTheme { MainScreen(driverId = "demo-driver-123", data = listOf("Android")) }
}
