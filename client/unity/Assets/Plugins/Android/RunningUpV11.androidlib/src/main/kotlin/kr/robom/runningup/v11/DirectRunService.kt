// 사용자가 시작한 러닝 동안 GPS 표본을 foreground service의 앱 전용 파일에 기록한다.
package kr.robom.runningup.v11

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.File
import java.io.FileWriter

class DirectRunService : Service(), LocationListener {
    companion object {
        const val ACTION_START = "kr.robom.runningup.v11.START_DIRECT_GPS"
        const val ACTION_STOP = "kr.robom.runningup.v11.STOP_DIRECT_GPS"
        private const val notificationChannel = "runningup_run_capture"
        private const val notificationId = 711
        private const val preferenceFile = "runningup_v11_direct_run"
        private const val activeKey = "active"
        private const val pathKey = "path"
    }

    private lateinit var locationManager: LocationManager
    private var writer: FileWriter? = null
    private var outputFile: File? = null
    private var capturing = false

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LocationManager::class.java)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            finishCapture()
            return START_NOT_STICKY
        }
        startCapture()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onLocationChanged(location: Location) {
        val payload = JSONObject()
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("unixTimeMilliseconds", location.time)
            .put("accuracyMeters", location.accuracy)
        synchronized(this) {
            writer?.apply {
                write(payload.toString())
                write("\n")
                flush()
            }
        }
        RunningUpV11Bridge.send("OnDirectGpsSample", payload.toString())
    }

    @Deprecated("Deprecated in platform callback but required below API 31")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

    override fun onProviderEnabled(provider: String) = Unit

    override fun onProviderDisabled(provider: String) {
        RunningUpV11Bridge.send("OnDirectGpsStatus", "provider_disabled")
    }

    override fun onDestroy() {
        locationManager.removeUpdates(this)
        writer?.close()
        writer = null
        super.onDestroy()
    }

    private fun startCapture() {
        if (capturing) {
            RunningUpV11Bridge.send("OnDirectGpsStatus", "capturing")
            return
        }

        if (
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            RunningUpV11Bridge.send("OnDirectGpsStatus", "permission_required")
            stopSelf()
            return
        }

        val notification = NotificationCompat.Builder(this, notificationChannel)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("RunningUp 러닝 기록 중")
            .setContentText("GPS 경로를 검증 가능한 러닝 기록으로 저장하고 있습니다.")
            .setOngoing(true)
            .build()
        startForeground(notificationId, notification)

        val directory = File(filesDir, "v11-direct-runs").apply { mkdirs() }
        val preferences = getSharedPreferences(preferenceFile, MODE_PRIVATE)
        val recoverable = preferences.getBoolean(activeKey, false)
            .takeIf { it }
            ?.let { preferences.getString(pathKey, null) }
            ?.let(::File)
            ?.takeIf(File::exists)
        outputFile = recoverable
            ?: File(directory, "direct-${System.currentTimeMillis()}.ndjson")
        writer = FileWriter(outputFile, true)
        preferences.edit()
            .putBoolean(activeKey, true)
            .putString(pathKey, outputFile!!.absolutePath)
            .apply()
        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER,
            1000L,
            2f,
            this,
        )
        capturing = true
        RunningUpV11Bridge.send("OnDirectGpsStatus", "capturing")
    }

    private fun finishCapture() {
        locationManager.removeUpdates(this)
        synchronized(this) {
            writer?.close()
            writer = null
        }
        capturing = false
        val preferences = getSharedPreferences(preferenceFile, MODE_PRIVATE)
        if (outputFile == null) {
            outputFile = preferences.getString(pathKey, null)
                ?.let(::File)
                ?.takeIf(File::exists)
        }
        preferences.edit()
            .putBoolean(activeKey, false)
            .remove(pathKey)
            .apply()
        val payload = outputFile?.absolutePath.orEmpty()
        RunningUpV11Bridge.send("OnDirectGpsFinished", payload)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                notificationChannel,
                "러닝 기록",
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
    }
}
