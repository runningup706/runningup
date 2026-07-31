// Health Connect 러닝 세션 읽기 권한을 독립 화면에서 요청하고 결과를 Unity에 돌려준다.
package kr.robom.runningup.v11

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord

class HealthPermissionActivity : ComponentActivity() {
    private val permissions = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
    )
    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
    ) { granted ->
        RunningUpV11Bridge.send(
            "OnHealthConnectStatus",
            if (granted.containsAll(permissions)) "ready" else "permission_denied",
        )
        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            RunningUpV11Bridge.send("OnHealthConnectStatus", "unavailable")
            finish()
            return
        }
        permissionLauncher.launch(permissions)
    }
}
