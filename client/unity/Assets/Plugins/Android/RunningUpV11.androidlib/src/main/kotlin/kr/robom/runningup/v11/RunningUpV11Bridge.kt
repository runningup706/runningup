// Unity와 V11 Android 직접 GPS·Health Connect·파일 수집 표면을 연결한다.
package kr.robom.runningup.v11

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.unity3d.player.UnityPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object RunningUpV11Bridge {
    private const val callbackObject = "V11AndroidRunBridge"
    private const val locationRequestCode = 711
    private const val notificationRequestCode = 712
    private const val directRunPreferenceFile = "runningup_v11_direct_run"
    private const val autoPauseKey = "auto_pause"
    private const val securePreferenceFile = "runningup_v14_secure"
    private const val secureSessionKey = "supabase_session_aes_gcm"
    private const val keyAlias = "runningup_v14_session_key"
    @Volatile private var backCallbackInstalled = false

    @JvmStatic
    fun installBackHandler(): String {
        val activity = UnityPlayer.currentActivity as? ComponentActivity
            ?: return "back_handler_unavailable"
        if (backCallbackInstalled) return "back_handler_ready"
        activity.runOnUiThread {
            if (backCallbackInstalled) return@runOnUiThread
            activity.onBackPressedDispatcher.addCallback(
                activity,
                object : OnBackPressedCallback(true) {
                    override fun handleOnBackPressed() {
                        send("OnSystemBackPressed", "")
                    }
                },
            )
            backCallbackInstalled = true
        }
        return "back_handler_installing"
    }

    @JvmStatic
    fun directGpsCapability(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        return if (
            ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        ) "ready" else "permission_required"
    }

    @JvmStatic
    fun startDirectGps(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        if (
            ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                locationRequestCode,
            )
            return "permission_requested"
        }

        val intent = Intent(activity, DirectRunService::class.java)
            .setAction(DirectRunService.ACTION_START)
        ContextCompat.startForegroundService(activity, intent)
        return "started"
    }

    @JvmStatic
    fun stopDirectGps(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        activity.startService(
            Intent(activity, DirectRunService::class.java)
                .setAction(DirectRunService.ACTION_STOP),
        )
        return "stopping"
    }

    @JvmStatic
    fun pauseDirectGps(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        activity.startService(
            Intent(activity, DirectRunService::class.java)
                .setAction(DirectRunService.ACTION_PAUSE),
        )
        return "pausing"
    }

    @JvmStatic
    fun resumeDirectGps(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        ContextCompat.startForegroundService(
            activity,
            Intent(activity, DirectRunService::class.java)
                .setAction(DirectRunService.ACTION_RESUME),
        )
        return "resuming"
    }

    @JvmStatic
    fun discardDirectGps(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        activity.startService(
            Intent(activity, DirectRunService::class.java)
                .setAction(DirectRunService.ACTION_DISCARD),
        )
        return "discarding"
    }

    @JvmStatic
    fun directGpsState(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        val preferences = activity.getSharedPreferences(
            "runningup_v11_direct_run",
            Context.MODE_PRIVATE,
        )
        if (!preferences.getBoolean("active", false)) return "idle"
        return if (preferences.getBoolean("paused", false)) "paused" else "capturing"
    }

    @JvmStatic
    fun autoPauseStatus(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        return if (activity.getSharedPreferences(
                directRunPreferenceFile,
                Context.MODE_PRIVATE,
            ).getBoolean(autoPauseKey, true)
        ) "enabled" else "disabled"
    }

    @JvmStatic
    fun toggleAutoPause(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        val preferences = activity.getSharedPreferences(
            directRunPreferenceFile,
            Context.MODE_PRIVATE,
        )
        val enabled = !preferences.getBoolean(autoPauseKey, true)
        preferences.edit().putBoolean(autoPauseKey, enabled).commit()
        return if (enabled) "enabled" else "disabled"
    }

    @JvmStatic
    fun notificationPermissionStatus(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        return if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) "enabled" else "permission_required"
    }

    @JvmStatic
    fun requestNotificationPermission(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "enabled"
        }
        if (ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            return "enabled"
        }
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            notificationRequestCode,
        )
        return "permission_requested"
    }

    @JvmStatic
    fun completedDirectGpsPath(): String {
        val activity = UnityPlayer.currentActivity ?: return ""
        val preferences = activity.getSharedPreferences(
            "runningup_v11_direct_run",
            Context.MODE_PRIVATE,
        )
        val storedPath = preferences.getString(
            DirectRunService.lastCompletedPathKey,
            null,
        )
        if (!storedPath.isNullOrBlank() && File(storedPath).isFile) {
            return storedPath
        }

        return File(activity.filesDir, "v14-direct-runs")
            .listFiles { file ->
                file.isFile &&
                    file.name.endsWith(".raw.ndjson") &&
                    file.useLines { lines ->
                        lines.any {
                            it.contains("\"recordType\":\"CONTROL\"") &&
                                it.contains("\"state\":\"FINISHED\"")
                        }
                    }
            }
            ?.maxByOrNull(File::lastModified)
            ?.absolutePath
            .orEmpty()
    }

    @JvmStatic
    fun healthConnectCapability(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        return when (HealthConnectClient.getSdkStatus(activity)) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "provider_update_required"
            else -> "unavailable"
        }
    }

    @JvmStatic
    fun requestHealthConnectPermission(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        if (HealthConnectClient.getSdkStatus(activity) != HealthConnectClient.SDK_AVAILABLE) {
            return "unavailable"
        }

        activity.startActivity(Intent(activity, HealthPermissionActivity::class.java))
        return "permission_screen_opened"
    }

    @JvmStatic
    fun readRecentHealthRuns(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        if (HealthConnectClient.getSdkStatus(activity) != HealthConnectClient.SDK_AVAILABLE) {
            return "unavailable"
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val client = HealthConnectClient.getOrCreate(activity)
                val permissions = setOf(
                    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
                    HealthPermission.getReadPermission(DistanceRecord::class),
                )
                if (!client.permissionController.getGrantedPermissions().containsAll(permissions)) {
                    send("OnHealthConnectStatus", "permission_required")
                    return@launch
                }

                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = ExerciseSessionRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(
                            Instant.now().minus(365, ChronoUnit.DAYS),
                            Instant.now(),
                        ),
                    ),
                )
                val payload = JSONArray()
                response.records
                    .filter { it.exerciseType == ExerciseSessionRecord.EXERCISE_TYPE_RUNNING }
                    .forEach { record ->
                        val aggregate = client.aggregate(
                            AggregateRequest(
                                metrics = setOf(DistanceRecord.DISTANCE_TOTAL),
                                timeRangeFilter = TimeRangeFilter.between(
                                    record.startTime,
                                    record.endTime,
                                ),
                            ),
                        )
                        val distanceMeters =
                            aggregate[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
                        payload.put(
                            JSONObject()
                                .put("sourceRecordId", record.metadata.id)
                                .put("startedAtUnixMilliseconds", record.startTime.toEpochMilli())
                                .put("endedAtUnixMilliseconds", record.endTime.toEpochMilli())
                                .put("distanceMeters", distanceMeters.toInt())
                                .put(
                                    "movingSeconds",
                                    (record.endTime.epochSecond - record.startTime.epochSecond).toInt(),
                                )
                                .put("title", record.title ?: ""),
                        )
                    }
                send("OnHealthConnectPayload", payload.toString())
            } catch (error: Throwable) {
                send("OnHealthConnectStatus", "read_error:${safe(error.message)}")
            }
        }
        return "reading"
    }

    @JvmStatic
    fun pickTrackFile(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        activity.startActivity(Intent(activity, TrackFilePickerActivity::class.java))
        return "picker_opened"
    }

    @JvmStatic
    fun saveSecureSession(value: String): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secureSessionKey())
            val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            val payload = JSONObject()
                .put("version", 1)
                .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
                .put("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .toString()
            activity.getSharedPreferences(securePreferenceFile, Context.MODE_PRIVATE)
                .edit()
                .putString(secureSessionKey, payload)
                .commit()
            "saved"
        } catch (error: Throwable) {
            "secure_save_failed:${safe(error.message)}"
        }
    }

    @JvmStatic
    fun loadSecureSession(): String {
        val activity = UnityPlayer.currentActivity ?: return ""
        return try {
            val payload = activity
                .getSharedPreferences(securePreferenceFile, Context.MODE_PRIVATE)
                .getString(secureSessionKey, null)
                ?.let(::JSONObject)
                ?: return ""
            if (payload.optInt("version") != 1) return ""
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.DECRYPT_MODE,
                secureSessionKey(),
                GCMParameterSpec(
                    128,
                    Base64.decode(payload.getString("iv"), Base64.NO_WRAP),
                ),
            )
            val decrypted = cipher.doFinal(
                Base64.decode(payload.getString("ciphertext"), Base64.NO_WRAP),
            )
            String(decrypted, Charsets.UTF_8)
        } catch (error: Throwable) {
            activity.getSharedPreferences(securePreferenceFile, Context.MODE_PRIVATE)
                .edit()
                .remove(secureSessionKey)
                .apply()
            ""
        }
    }

    @JvmStatic
    fun clearSecureSession(): String {
        val activity = UnityPlayer.currentActivity ?: return "activity_unavailable"
        activity.getSharedPreferences(securePreferenceFile, Context.MODE_PRIVATE)
            .edit()
            .remove(secureSessionKey)
            .apply()
        return "cleared"
    }

    internal fun send(method: String, message: String) {
        UnityPlayer.UnitySendMessage(callbackObject, method, message)
    }

    private fun secureSessionKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(keyAlias, null) as? SecretKey)?.let { return it }
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            "AndroidKeyStore",
        )
        keyGenerator.init(
            KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return keyGenerator.generateKey()
    }

    private fun safe(value: String?): String =
        value.orEmpty().replace('\n', ' ').take(120)
}
