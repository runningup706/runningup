// 사용자가 시작한 러닝 동안 GPS 표본을 foreground service의 앱 전용 파일에 기록한다.
package kr.robom.runningup.v11

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
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
import java.util.UUID

class DirectRunService : Service(), LocationListener {
    companion object {
        const val ACTION_START = "kr.robom.runningup.v11.START_DIRECT_GPS"
        const val ACTION_PAUSE = "kr.robom.runningup.v11.PAUSE_DIRECT_GPS"
        const val ACTION_RESUME = "kr.robom.runningup.v11.RESUME_DIRECT_GPS"
        const val ACTION_STOP = "kr.robom.runningup.v11.STOP_DIRECT_GPS"
        const val ACTION_DISCARD = "kr.robom.runningup.v11.DISCARD_DIRECT_GPS"
        private const val notificationChannel = "runningup_run_capture"
        private const val notificationId = 711
        private const val preferenceFile = "runningup_v11_direct_run"
        private const val activeKey = "active"
        private const val pausedKey = "paused"
        private const val autoPauseKey = "auto_pause"
        private const val pathKey = "path"
        private const val sessionIdKey = "session_id"
        const val lastCompletedPathKey = "last_completed_path"
    }

    private lateinit var locationManager: LocationManager
    private var writer: FileWriter? = null
    private var outputFile: File? = null
    private var capturing = false
    private var paused = false
    private var autoPaused = false
    private var slowSampleCount = 0
    private var sessionId = ""

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LocationManager::class.java)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE -> pauseCapture()
            ACTION_RESUME -> resumeCapture()
            ACTION_STOP -> {
                finishCapture()
                return START_NOT_STICKY
            }
            ACTION_DISCARD -> {
                discardCapture()
                return START_NOT_STICKY
            }
            else -> startCapture()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onLocationChanged(location: Location) {
        updateAutomaticPause(location)
        if (autoPaused) return

        val payload = JSONObject()
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("unixTimeMilliseconds", location.time)
            .put("accuracyMeters", location.accuracy)
            .put("elapsedRealtimeNanos", location.elapsedRealtimeNanos)
            .put("provider", location.provider ?: "unknown")
            .put("hasSpeed", location.hasSpeed())
            .put("speedMetersPerSecond", if (location.hasSpeed()) location.speed else -1f)
            .put("hasBearing", location.hasBearing())
            .put("bearingDegrees", if (location.hasBearing()) location.bearing else -1f)
            .put("hasAltitude", location.hasAltitude())
            .put("altitudeMeters", if (location.hasAltitude()) location.altitude else 0.0)
            .put("sessionId", sessionId)
            .put("raw", true)
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
        val preferences = getSharedPreferences(preferenceFile, MODE_PRIVATE)
        if (preferences.getBoolean(activeKey, false)) {
            restoreFromPreferences(preferences)
            startForeground(notificationId, buildNotification())
            if (paused) {
                RunningUpV11Bridge.send("OnDirectGpsStatus", "paused")
            } else {
                requestUpdates()
                RunningUpV11Bridge.send("OnDirectGpsStatus", "capturing")
            }
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

        val directory = File(filesDir, "v14-direct-runs").apply { mkdirs() }
        sessionId = UUID.randomUUID().toString()
        outputFile = File(directory, "direct-$sessionId.raw.ndjson")
        writer = FileWriter(outputFile, true)
        paused = false
        autoPaused = false
        slowSampleCount = 0
        preferences.edit()
            .putBoolean(activeKey, true)
            .putBoolean(pausedKey, false)
            .putString(pathKey, outputFile!!.absolutePath)
            .putString(sessionIdKey, sessionId)
            .commit()
        startForeground(notificationId, buildNotification())
        requestUpdates()
        RunningUpV11Bridge.send("OnDirectGpsStatus", "capturing")
    }

    private fun pauseCapture() {
        if (!capturing || paused) return
        locationManager.removeUpdates(this)
        paused = true
        capturing = false
        autoPaused = false
        slowSampleCount = 0
        getSharedPreferences(preferenceFile, MODE_PRIVATE)
            .edit()
            .putBoolean(pausedKey, true)
            .commit()
        writeControlRecord("PAUSED")
        updateForegroundNotification()
        RunningUpV11Bridge.send("OnDirectGpsStatus", "paused")
    }

    private fun resumeCapture() {
        val preferences = getSharedPreferences(preferenceFile, MODE_PRIVATE)
        if (!preferences.getBoolean(activeKey, false)) {
            RunningUpV11Bridge.send("OnDirectGpsStatus", "no_active_session")
            return
        }
        restoreFromPreferences(preferences)
        if (
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            RunningUpV11Bridge.send("OnDirectGpsStatus", "permission_required")
            return
        }
        paused = false
        preferences.edit().putBoolean(pausedKey, false).commit()
        writeControlRecord("RESUMED")
        startForeground(notificationId, buildNotification())
        requestUpdates()
        RunningUpV11Bridge.send("OnDirectGpsStatus", "capturing")
    }

    private fun finishCapture() {
        locationManager.removeUpdates(this)
        writeControlRecord("FINISHED")
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
            .putBoolean(pausedKey, false)
            .putString(lastCompletedPathKey, outputFile?.absolutePath.orEmpty())
            .remove(pathKey)
            .remove(sessionIdKey)
            .commit()
        val payload = outputFile?.absolutePath.orEmpty()
        RunningUpV11Bridge.send("OnDirectGpsFinished", payload)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun discardCapture() {
        locationManager.removeUpdates(this)
        synchronized(this) {
            writer?.close()
            writer = null
        }
        val preferences = getSharedPreferences(preferenceFile, MODE_PRIVATE)
        if (outputFile == null) {
            outputFile = preferences.getString(pathKey, null)?.let(::File)
        }
        outputFile?.delete()
        preferences.edit().clear().commit()
        capturing = false
        paused = false
        autoPaused = false
        slowSampleCount = 0
        RunningUpV11Bridge.send("OnDirectGpsStatus", "discarded")
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun restoreFromPreferences(
        preferences: android.content.SharedPreferences,
    ) {
        outputFile = preferences.getString(pathKey, null)?.let(::File)
        sessionId = preferences.getString(sessionIdKey, null)
            ?: outputFile?.nameWithoutExtension
            ?: UUID.randomUUID().toString()
        paused = preferences.getBoolean(pausedKey, false)
        if (writer == null && outputFile != null) {
            writer = FileWriter(outputFile, true)
        }
    }

    private fun requestUpdates() {
        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER,
            1000L,
            0f,
            this,
        )
        capturing = true
    }

    private fun updateAutomaticPause(location: Location) {
        val preferences = getSharedPreferences(preferenceFile, MODE_PRIVATE)
        if (!preferences.getBoolean(autoPauseKey, true)) {
            if (autoPaused) {
                autoPaused = false
                writeControlRecord("AUTO_RESUMED")
                RunningUpV11Bridge.send("OnDirectGpsStatus", "auto_resumed")
            }
            slowSampleCount = 0
            return
        }
        if (!location.hasSpeed()) {
            slowSampleCount = 0
            return
        }

        val speed = location.speed
        if (!autoPaused && speed < 0.5f) {
            slowSampleCount++
            if (slowSampleCount >= 10) {
                autoPaused = true
                writeControlRecord("AUTO_PAUSED")
                RunningUpV11Bridge.send("OnDirectGpsStatus", "auto_paused")
            }
            return
        }

        if (autoPaused && speed >= 0.8f) {
            autoPaused = false
            slowSampleCount = 0
            writeControlRecord("AUTO_RESUMED")
            RunningUpV11Bridge.send("OnDirectGpsStatus", "auto_resumed")
            return
        }

        if (speed >= 0.5f) {
            slowSampleCount = 0
        }
    }

    private fun writeControlRecord(state: String) {
        val payload = JSONObject()
            .put("recordType", "CONTROL")
            .put("state", state)
            .put("unixTimeMilliseconds", System.currentTimeMillis())
            .put("sessionId", sessionId)
        synchronized(this) {
            writer?.apply {
                write(payload.toString())
                write("\n")
                flush()
            }
        }
    }

    private fun buildNotification(): android.app.Notification {
        val builder = NotificationCompat.Builder(this, notificationChannel)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(if (paused) "RunningUp run paused" else "RunningUp is recording")
            .setContentText("Raw GPS samples are stored for verification.")
            .setOngoing(true)
            .addAction(
                0,
                if (paused) "Resume" else "Pause",
                actionIntent(if (paused) ACTION_RESUME else ACTION_PAUSE, 712),
            )
            .addAction(0, "Finish", actionIntent(ACTION_STOP, 713))
        return builder.build()
    }

    private fun actionIntent(action: String, requestCode: Int): PendingIntent =
        PendingIntent.getService(
            this,
            requestCode,
            Intent(this, DirectRunService::class.java).setAction(action),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun updateForegroundNotification() {
        getSystemService(NotificationManager::class.java)
            .notify(notificationId, buildNotification())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                notificationChannel,
                "Running capture",
                NotificationManager.IMPORTANCE_LOW,
            ),
        )
    }
}
