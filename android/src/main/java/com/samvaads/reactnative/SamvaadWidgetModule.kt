package com.samvaads.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.samvaads.widget.Samvaad
import com.samvaads.widget.SamvaadTheme
import com.samvaads.widget.UnreadListener

/** React Native binding for the Samvaad Android SDK. Every SDK call runs on the main thread. */
class SamvaadWidgetModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var listenerCount = 0

  private val unreadListener = UnreadListener { count ->
    if (listenerCount > 0 && reactApplicationContext.hasActiveReactInstance()) {
      val body = Arguments.createMap().apply { putInt("count", count) }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(UNREAD_EVENT, body)
    }
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun configure(tenantId: String, host: String, promise: Promise) = onMain(promise) {
    Samvaad.configure(reactApplicationContext, tenantId, host)
    promise.resolve(null)
  }

  @ReactMethod
  fun identify(email: String, name: String?, userHash: String, promise: Promise) = onMain(promise) {
    Samvaad.identify(email, name, userHash)
    promise.resolve(null)
  }

  @ReactMethod
  fun present(message: String?, promise: Promise) = onMain(promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(ERROR_CODE, "No current activity to open the chat from")
    } else {
      Samvaad.present(activity, message)
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun logout(promise: Promise) = onMain(promise) {
    Samvaad.logout()
    promise.resolve(null)
  }

  @ReactMethod
  fun setTheme(theme: String, promise: Promise) = onMain(promise) {
    val value = when (theme) {
      "auto" -> SamvaadTheme.AUTO
      "light" -> SamvaadTheme.LIGHT
      "dark" -> SamvaadTheme.DARK
      else -> null
    }
    if (value == null) {
      promise.reject(ERROR_CODE, "theme must be 'auto', 'light' or 'dark'")
    } else {
      Samvaad.theme = value
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun getUnreadCount(promise: Promise) = onMain(promise) {
    promise.resolve(Samvaad.unreadCount)
  }

  @ReactMethod
  fun setPushToken(token: String, route: String, promise: Promise) = onMain(promise) {
    if (route != "fcm") {
      promise.reject(ERROR_CODE, "Android supports only 'fcm' push tokens")
    } else {
      Samvaad.setPushToken(token)
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun handlePush(data: ReadableMap, promise: Promise) = onMain(promise) {
    val context = reactApplicationContext.currentActivity ?: reactApplicationContext
    promise.resolve(Samvaad.handlePush(context, toStringMap(data)))
  }

  // NativeEventEmitter bookkeeping.
  @ReactMethod
  fun addListener(eventName: String) {
    UiThreadUtil.runOnUiThread {
      listenerCount += 1
      if (listenerCount == 1) Samvaad.onUnreadChange(unreadListener)
    }
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    UiThreadUtil.runOnUiThread {
      listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
      if (listenerCount == 0) Samvaad.onUnreadChange(null)
    }
  }

  override fun invalidate() {
    UiThreadUtil.runOnUiThread {
      if (listenerCount > 0) Samvaad.onUnreadChange(null)
      listenerCount = 0
    }
    super.invalidate()
  }

  private inline fun onMain(promise: Promise, crossinline block: () -> Unit) {
    UiThreadUtil.runOnUiThread {
      try {
        block()
      } catch (e: Exception) {
        promise.reject(ERROR_CODE, e.message ?: e.toString(), e)
      }
    }
  }

  private fun toStringMap(data: ReadableMap): Map<String, String> {
    val out = HashMap<String, String>()
    for ((key, value) in data.toHashMap()) {
      when (value) {
        is String -> out[key] = value
        is Double -> out[key] = if (value % 1.0 == 0.0) value.toLong().toString() else value.toString()
        is Number, is Boolean -> out[key] = value.toString()
      }
    }
    return out
  }

  companion object {
    const val NAME = "SamvaadWidget"
    const val UNREAD_EVENT = "SamvaadUnreadChange"
    private const val ERROR_CODE = "E_SAMVAAD"
  }
}
