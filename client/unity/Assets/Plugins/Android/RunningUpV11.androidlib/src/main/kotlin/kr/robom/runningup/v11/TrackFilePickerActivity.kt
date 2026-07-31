// 사용자가 고른 GPX·TCX·FIT 파일을 앱 전용 캐시에 복사해 Unity 파서로 전달한다.
package kr.robom.runningup.v11

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import java.io.File
import java.util.UUID

class TrackFilePickerActivity : Activity() {
    companion object {
        private const val requestCode = 812
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivityForResult(
            Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    arrayOf("application/gpx+xml", "application/xml", "text/xml", "application/octet-stream"),
                )
            },
            requestCode,
        )
    }

    @Deprecated("Activity result contract is isolated to preserve Unity activity ownership")
    override fun onActivityResult(code: Int, result: Int, data: Intent?) {
        super.onActivityResult(code, result, data)
        if (code != requestCode || result != RESULT_OK || data?.data == null) {
            RunningUpV11Bridge.send("OnTrackFileStatus", "cancelled")
            finish()
            return
        }

        try {
            val uri = data.data!!
            val fileName = queryDisplayName(uri)
            val extension = fileName.substringAfterLast('.', "bin").lowercase()
            if (extension !in setOf("gpx", "tcx", "fit")) {
                RunningUpV11Bridge.send("OnTrackFileStatus", "unsupported_extension")
                finish()
                return
            }
            val output = File(cacheDir, "v11-import-${UUID.randomUUID()}.$extension")
            contentResolver.openInputStream(uri).use { input ->
                requireNotNull(input) { "input stream unavailable" }
                output.outputStream().use { target -> input.copyTo(target) }
            }
            RunningUpV11Bridge.send("OnTrackFileSelected", output.absolutePath)
        } catch (error: Throwable) {
            RunningUpV11Bridge.send(
                "OnTrackFileStatus",
                "copy_error:${error.message.orEmpty().replace('\n', ' ').take(120)}",
            )
        }
        finish()
    }

    private fun queryDisplayName(uri: android.net.Uri): String {
        contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor ->
                if (cursor.moveToFirst()) {
                    return cursor.getString(0)
                }
            }
        return uri.lastPathSegment.orEmpty()
    }
}

