import Foundation
import React
import Samvaad

/// React Native binding for the Samvaad iOS SDK. Methods run on the main queue
/// (see `methodQueue` in SamvaadWidget.m) and hop onto the main actor for the SDK.
@objc(SamvaadWidget)
final class SamvaadWidget: RCTEventEmitter {
  static let unreadEvent = "SamvaadUnreadChange"
  private static let errorCode = "E_SAMVAAD"

  override func supportedEvents() -> [String]! {
    return [SamvaadWidget.unreadEvent]
  }

  override func startObserving() {
    Task { @MainActor [weak self] in
      Samvaad.onUnreadChange = { [weak self] count in
        self?.sendUnread(count)
      }
      // Same as Android: listeners get the current count right away.
      self?.sendUnread(Samvaad.unreadCount)
    }
  }

  override func stopObserving() {
    Task { @MainActor in
      Samvaad.onUnreadChange = nil
    }
  }

  private func sendUnread(_ count: Int) {
    sendEvent(withName: SamvaadWidget.unreadEvent, body: ["count": count])
  }

  @objc(configure:host:resolver:rejecter:)
  func configure(
    _ tenantId: String,
    host: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      Samvaad.configure(tenantId: tenantId, host: host)
      resolve(nil)
    }
  }

  @objc(identify:name:userHash:resolver:rejecter:)
  func identify(
    _ email: String,
    name: String?,
    userHash: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      Samvaad.identify(email: email, name: name, userHash: userHash)
      resolve(nil)
    }
  }

  @objc(present:resolver:rejecter:)
  func present(
    _ message: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      Samvaad.present(from: nil, message: message)
      resolve(nil)
    }
  }

  @objc(logout:rejecter:)
  func logout(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      Samvaad.logout()
      resolve(nil)
    }
  }

  @objc(setTheme:resolver:rejecter:)
  func setTheme(
    _ theme: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let value = SamvaadTheme(rawValue: theme) else {
      reject(SamvaadWidget.errorCode, "theme must be 'auto', 'light' or 'dark'", nil)
      return
    }
    Task { @MainActor in
      Samvaad.theme = value
      resolve(nil)
    }
  }

  @objc(getUnreadCount:rejecter:)
  func getUnreadCount(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      resolve(Samvaad.unreadCount)
    }
  }

  @objc(setPushToken:route:resolver:rejecter:)
  func setPushToken(
    _ token: String,
    route: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    switch route {
    case "apns":
      guard let data = SamvaadWidget.data(fromHex: token) else {
        reject(SamvaadWidget.errorCode, "An APNs token must be a non-empty hex string", nil)
        return
      }
      Task { @MainActor in
        Samvaad.setPushToken(data)
        resolve(nil)
      }
    case "fcm":
      Task { @MainActor in
        Samvaad.setPushToken(fcmToken: token)
        resolve(nil)
      }
    default:
      reject(SamvaadWidget.errorCode, "route must be 'fcm' or 'apns'", nil)
    }
  }

  @objc(handlePush:resolver:rejecter:)
  func handlePush(
    _ data: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let userInfo = (data as? [AnyHashable: Any]) ?? [:]
    Task { @MainActor in
      resolve(Samvaad.handlePush(userInfo, from: nil))
    }
  }

  /// Hex string (from the JS side) back to the APNs device token bytes.
  static func data(fromHex hex: String) -> Data? {
    let digits = Array(hex.trimmingCharacters(in: .whitespacesAndNewlines).utf8)
    guard !digits.isEmpty, digits.count % 2 == 0 else { return nil }
    var bytes = [UInt8]()
    bytes.reserveCapacity(digits.count / 2)
    var index = 0
    while index < digits.count {
      guard let high = nibble(digits[index]), let low = nibble(digits[index + 1]) else { return nil }
      bytes.append(high << 4 | low)
      index += 2
    }
    return Data(bytes)
  }

  private static func nibble(_ c: UInt8) -> UInt8? {
    switch c {
    case 48...57: return c - 48        // 0-9
    case 65...70: return c - 55        // A-F
    case 97...102: return c - 87       // a-f
    default: return nil
    }
  }
}
