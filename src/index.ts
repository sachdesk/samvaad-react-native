import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

/** Light or dark chat. `auto` (the default) follows the app. */
export type SamvaadTheme = 'auto' | 'light' | 'dark';

/** How a push token reaches the device: Firebase Cloud Messaging or APNs (iOS only). */
export type SamvaadPushRoute = 'fcm' | 'apns';

export interface ConfigureOptions {
  /** Your Samvaad workspace (tenant) ID. */
  tenantId: string;
  /** The host serving your chat, e.g. `yobruh.samvaads.com`. Required. */
  host: string;
}

export interface IdentifyOptions {
  email: string;
  name?: string | null;
  /** HMAC-SHA256 of the lower-cased email, computed on YOUR backend. */
  userHash: string;
}

export interface PresentOptions {
  /** Text to prefill in the message box (not sent). */
  message?: string | null;
}

export type UnreadListener = (count: number) => void;

export interface Subscription {
  remove(): void;
}

/** Event the native modules emit when the unread count changes. */
export const UNREAD_EVENT = 'SamvaadUnreadChange';

interface NativeSamvaadWidget {
  configure(tenantId: string, host: string): Promise<void>;
  identify(email: string, name: string | null, userHash: string): Promise<void>;
  present(message: string | null): Promise<void>;
  logout(): Promise<void>;
  setTheme(theme: SamvaadTheme): Promise<void>;
  getUnreadCount(): Promise<number>;
  setPushToken(token: string, route: SamvaadPushRoute): Promise<void>;
  handlePush(data: Record<string, string>): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const LINKING_ERROR =
  "[Samvaad] The native module 'SamvaadWidget' is not linked. Make sure that:\n" +
  '- you rebuilt the app after installing @samvaads/react-native-widget\n' +
  "- on iOS you ran 'pod install' in the ios folder\n" +
  '- you are not running in Expo Go (use a development build)';

const THEMES: readonly SamvaadTheme[] = ['auto', 'light', 'dark'];
const ROUTES: readonly SamvaadPushRoute[] = ['fcm', 'apns'];

let emitter: NativeEventEmitter | null = null;

function nativeModule(): NativeSamvaadWidget {
  const mod = NativeModules.SamvaadWidget as NativeSamvaadWidget | undefined | null;
  if (!mod) throw new Error(LINKING_ERROR);
  return mod;
}

function requiredString(value: unknown, method: string, field: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new TypeError(`[Samvaad] ${method}: ${field} is required`);
  return text;
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text : null;
}

function configure(options: ConfigureOptions): Promise<void> {
  const mod = nativeModule();
  const tenantId = requiredString(options?.tenantId, 'configure', 'tenantId');
  const host = requiredString(options?.host, 'configure', 'host');
  return mod.configure(tenantId, host);
}

function identify(options: IdentifyOptions): Promise<void> {
  const mod = nativeModule();
  const email = requiredString(options?.email, 'identify', 'email');
  const userHash = requiredString(options?.userHash, 'identify', 'userHash');
  return mod.identify(email, optionalString(options?.name), userHash);
}

function present(options?: PresentOptions): Promise<void> {
  const mod = nativeModule();
  return mod.present(optionalString(options?.message));
}

function logout(): Promise<void> {
  return nativeModule().logout();
}

function setTheme(theme: SamvaadTheme): Promise<void> {
  const mod = nativeModule();
  if (!THEMES.includes(theme)) {
    throw new TypeError(`[Samvaad] setTheme: theme must be 'auto', 'light' or 'dark'`);
  }
  return mod.setTheme(theme);
}

function getUnreadCount(): Promise<number> {
  return nativeModule().getUnreadCount();
}

function addUnreadListener(listener: UnreadListener): Subscription {
  const mod = nativeModule();
  if (typeof listener !== 'function') {
    throw new TypeError('[Samvaad] addUnreadListener: listener must be a function');
  }
  if (!emitter) emitter = new NativeEventEmitter(mod as never);
  const subscription = emitter.addListener(UNREAD_EVENT, (event: unknown) => {
    const count =
      typeof event === 'number'
        ? event
        : Number((event as { count?: unknown } | null | undefined)?.count ?? 0);
    listener(Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0);
  });
  let removed = false;
  return {
    remove() {
      if (removed) return;
      removed = true;
      subscription.remove();
    },
  };
}

/**
 * Registers the device's push token.
 *
 * - `fcm` (default): a Firebase Cloud Messaging registration token. Android and iOS.
 * - `apns`: iOS only. The APNs device token as a hex string.
 */
function setPushToken(token: string, route: SamvaadPushRoute = 'fcm'): Promise<void> {
  const mod = nativeModule();
  const value = requiredString(token, 'setPushToken', 'token');
  if (!ROUTES.includes(route)) {
    throw new TypeError(`[Samvaad] setPushToken: route must be 'fcm' or 'apns'`);
  }
  if (route === 'apns') {
    if (Platform.OS !== 'ios') {
      throw new Error("[Samvaad] setPushToken: route 'apns' is only available on iOS; use 'fcm'");
    }
    if (value.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(value)) {
      throw new TypeError('[Samvaad] setPushToken: an APNs token must be a hex string');
    }
    return mod.setPushToken(value.toLowerCase(), 'apns');
  }
  return mod.setPushToken(value, 'fcm');
}

/**
 * Opens the chat for a Samvaad notification. Resolves `false` when the notification is
 * not from Samvaad (your app handles it), `true` when the chat is being opened.
 */
function handlePush(data: Record<string, string | number>): Promise<boolean> {
  const mod = nativeModule();
  if (!data || typeof data !== 'object') return Promise.resolve(false);
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') payload[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) payload[key] = String(value);
  }
  return mod.handlePush(payload);
}

const Samvaad = {
  configure,
  identify,
  present,
  logout,
  setTheme,
  getUnreadCount,
  addUnreadListener,
  setPushToken,
  handlePush,
};

export type SamvaadApi = typeof Samvaad;

export default Samvaad;
