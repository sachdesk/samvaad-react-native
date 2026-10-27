# Samvaad for React Native

Samvaad chat in your React Native app. This package is a thin binding over the native
Samvaad SDKs ([iOS](https://github.com/sachdesk/samvaad-ios),
[Android](https://github.com/sachdesk/samvaad-android)): they open your Samvaad chat full
screen, keep the customer signed in, report an unread count and open the chat from push
notifications. The package has no web view of its own.

Version 0.1.0 · React Native 0.71+ · iOS 15+ · Android 7.0+ (minSdk 24)

It is a classic native module (`NativeModules.SamvaadWidget`); on the new architecture it
runs through the interop layer.

## Install

```sh
npm install @samvaads/react-native-widget
```

Rebuild the app afterwards. Expo Go can't load it; use a development build.

### iOS

The binding depends on the `Samvaad` pod, which CocoaPods fetches for you. Run:

```sh
cd ios && pod install
```

Customers can attach photos and files in the chat, so add `NSCameraUsageDescription` and
`NSPhotoLibraryUsageDescription` to your `Info.plist` (e.g. "Choose a photo to send to
Yobruh support.").

### Android

The binding depends on `com.samvaads:widget:0.1.0`, which comes from Maven Central
(already in React Native's default repositories). Autolinking does the rest.

## Use it

```tsx
import Samvaad from '@samvaads/react-native-widget';

// Once, at startup. host is required.
await Samvaad.configure({ tenantId: 'YOUR_WORKSPACE_ID', host: 'yobruh.samvaads.com' });

// When the customer is signed in. userHash comes from YOUR backend.
await Samvaad.identify({ email: 'asha@yobruh.in', name: 'Asha', userHash });

// Open the chat (optionally prefill the message box; it is not sent).
await Samvaad.present();
await Samvaad.present({ message: 'Question about order YB-1042' });

// Unread badge
const count = await Samvaad.getUnreadCount();
const subscription = Samvaad.addUnreadListener((n) => setBadge(n));
// later: subscription.remove();

// Theme: 'auto' (default, follows the app), 'light' or 'dark'
await Samvaad.setTheme('auto');

// When the customer signs out
await Samvaad.logout();
```

Your workspace ID is in the install snippet under Admin → Website widget
(`data-tenant-id`). `host` is the host serving your chat, such as `yobruh.samvaads.com`
or your own domain, and must be https.

Calls with missing arguments throw right away. If the native module isn't linked, every
call throws an error that says so.

### userHash

**`userHash` must be computed on your backend. Never put the identity secret in your app.**
It is HMAC-SHA256 of the lower-cased email, keyed with the identity secret from your
Samvaad admin. Node example:

```js
const crypto = require('crypto');

function samvaadUserHash(email) {
  return crypto
    .createHmac('sha256', process.env.SAMVAAD_IDENTITY_SECRET)
    .update(email.trim().toLowerCase())
    .digest('hex');
}
```

## Push notifications

Upload your push credentials in Samvaad under **Admin → Website widget → Mobile apps**:
the FCM service-account JSON, and for APNs the .p8 key, key ID, team ID and bundle ID
(e.g. `in.yobruh.shop`). Then pass the device token:

```ts
// Firebase Cloud Messaging token (Android and iOS). 'fcm' is the default route.
await Samvaad.setPushToken(fcmToken);

// iOS without Firebase: the APNs device token as a hex string.
await Samvaad.setPushToken(apnsHexToken, 'apns');
```

Android accepts only FCM tokens.

When the customer taps a notification, pass its data to `handlePush`. It resolves `false`
for notifications that are not from Samvaad (handle those yourself) and `true` when it
opens the chat:

```ts
const handled = await Samvaad.handlePush(remoteMessage.data ?? {});
```

Samvaad notifications carry `samvaad: "1"`, `tenant_id` and `session_id` in their data.

## Local testing

Debug builds also accept a local plain-http host, such as `http://localhost:5173` (iOS
Simulator) or `http://10.0.2.2:5173` (Android emulator). See the native SDK READMEs for
the details.

## Development

```sh
npm install
npx tsc --noEmit
npx jest
```

## Example app

`example/` is a small React Native 0.76 app (Yobruh Shop: a Help button with an unread
badge that opens the chat with "Help with order YB-1042"). It uses this package through
`"@samvaads/react-native-widget": "file:.."`, so autolinking builds the binding's native
code into it. CI builds it for Android and the iOS Simulator on every pull request.

Until the native SDKs are published, build them from source first:

```sh
npm ci && npm ci --prefix example

# Android: publish com.samvaads:widget to mavenLocal (JDK 17), then build
(cd ../samvaad-android && ./gradlew :samvaad:publishToMavenLocal)
cd example/android && ./gradlew assembleDebug

# iOS: point the Podfile at a samvaad-ios checkout (without it, the pod comes from main)
cd example/ios && SAMVAAD_IOS_PATH=../../../samvaad-ios pod install
open YobruhShop.xcworkspace
```

Replace the placeholder workspace ID in `example/App.tsx` with your own to try the chat.

## License

MIT. See `LICENSE`.
