type Handler = (event: unknown) => void;

const listeners: { event: string; handler: Handler; removed: boolean }[] = [];

const mockNative = {
  configure: jest.fn(() => Promise.resolve()),
  identify: jest.fn(() => Promise.resolve()),
  present: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve()),
  setTheme: jest.fn(() => Promise.resolve()),
  getUnreadCount: jest.fn(() => Promise.resolve(3)),
  setPushToken: jest.fn(() => Promise.resolve()),
  handlePush: jest.fn(() => Promise.resolve(true)),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

const mockReactNative = {
  NativeModules: { SamvaadWidget: mockNative as typeof mockNative | undefined },
  Platform: { OS: 'ios' as 'ios' | 'android' },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: (event: string, handler: Handler) => {
      const entry = { event, handler, removed: false };
      listeners.push(entry);
      return { remove: jest.fn(() => (entry.removed = true)) };
    },
  })),
};

jest.mock('react-native', () => mockReactNative);

function emit(event: string, payload: unknown) {
  listeners.filter((l) => l.event === event && !l.removed).forEach((l) => l.handler(payload));
}

function load() {
  let mod!: typeof import('../index');
  jest.isolateModules(() => {
    mod = require('../index');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  listeners.length = 0;
  mockReactNative.NativeModules.SamvaadWidget = mockNative;
  mockReactNative.Platform.OS = 'ios';
});

describe('missing native module', () => {
  beforeEach(() => {
    mockReactNative.NativeModules.SamvaadWidget = undefined;
  });

  it('imports without throwing', () => {
    expect(() => load()).not.toThrow();
  });

  it.each([
    ['configure', (s: any) => s.configure({ tenantId: 't', host: 'yobruh.samvaads.com' })],
    ['identify', (s: any) => s.identify({ email: 'a@yobruh.in', userHash: 'h' })],
    ['present', (s: any) => s.present()],
    ['logout', (s: any) => s.logout()],
    ['setTheme', (s: any) => s.setTheme('dark')],
    ['getUnreadCount', (s: any) => s.getUnreadCount()],
    ['addUnreadListener', (s: any) => s.addUnreadListener(() => {})],
    ['setPushToken', (s: any) => s.setPushToken('tok')],
    ['handlePush', (s: any) => s.handlePush({ samvaad: '1' })],
  ])('%s throws a linking error', (_name, call) => {
    const Samvaad = load().default;
    expect(() => call(Samvaad)).toThrow(/native module 'SamvaadWidget' is not linked/);
  });
});

describe('configure', () => {
  it('passes trimmed tenantId and host', async () => {
    const Samvaad = load().default;
    await Samvaad.configure({ tenantId: ' 6f1c-uuid ', host: ' yobruh.samvaads.com ' });
    expect(mockNative.configure).toHaveBeenCalledWith('6f1c-uuid', 'yobruh.samvaads.com');
  });

  it('requires host', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.configure({ tenantId: 'x' } as any)).toThrow(/host is required/);
    expect(() => Samvaad.configure({ tenantId: 'x', host: '  ' })).toThrow(/host is required/);
    expect(mockNative.configure).not.toHaveBeenCalled();
  });

  it('requires tenantId', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.configure({ host: 'yobruh.samvaads.com' } as any)).toThrow(
      /tenantId is required/,
    );
  });

  it('returns the native promise', async () => {
    mockNative.configure.mockImplementationOnce(() => Promise.reject(new Error('bad host')));
    const Samvaad = load().default;
    await expect(Samvaad.configure({ tenantId: 't', host: 'h' })).rejects.toThrow('bad host');
  });
});

describe('identify', () => {
  it('passes email, name and userHash', async () => {
    const Samvaad = load().default;
    await Samvaad.identify({ email: 'asha@yobruh.in', name: 'Asha', userHash: 'abc' });
    expect(mockNative.identify).toHaveBeenCalledWith('asha@yobruh.in', 'Asha', 'abc');
  });

  it('sends null for a missing or blank name', async () => {
    const Samvaad = load().default;
    await Samvaad.identify({ email: 'asha@yobruh.in', userHash: 'abc' });
    await Samvaad.identify({ email: 'asha@yobruh.in', name: ' ', userHash: 'abc' });
    expect(mockNative.identify).toHaveBeenNthCalledWith(1, 'asha@yobruh.in', null, 'abc');
    expect(mockNative.identify).toHaveBeenNthCalledWith(2, 'asha@yobruh.in', null, 'abc');
  });

  it('requires email and userHash', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.identify({ email: '', userHash: 'h' })).toThrow(/email is required/);
    expect(() => Samvaad.identify({ email: 'a@yobruh.in' } as any)).toThrow(
      /userHash is required/,
    );
  });
});

describe('present', () => {
  it('sends null without a message', async () => {
    const Samvaad = load().default;
    await Samvaad.present();
    await Samvaad.present({});
    expect(mockNative.present).toHaveBeenNthCalledWith(1, null);
    expect(mockNative.present).toHaveBeenNthCalledWith(2, null);
  });

  it('passes the prefill message', async () => {
    const Samvaad = load().default;
    await Samvaad.present({ message: 'Question about order YB-1042' });
    expect(mockNative.present).toHaveBeenCalledWith('Question about order YB-1042');
  });
});

describe('logout, theme and unread count', () => {
  it('logs out', async () => {
    const Samvaad = load().default;
    await Samvaad.logout();
    expect(mockNative.logout).toHaveBeenCalledTimes(1);
  });

  it('sets a valid theme', async () => {
    const Samvaad = load().default;
    await Samvaad.setTheme('dark');
    expect(mockNative.setTheme).toHaveBeenCalledWith('dark');
  });

  it('rejects an unknown theme', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.setTheme('blue' as any)).toThrow(/theme must be/);
    expect(mockNative.setTheme).not.toHaveBeenCalled();
  });

  it('reads the unread count', async () => {
    const Samvaad = load().default;
    await expect(Samvaad.getUnreadCount()).resolves.toBe(3);
  });
});

describe('addUnreadListener', () => {
  it('subscribes to the unread event and forwards the count', () => {
    const { default: Samvaad, UNREAD_EVENT } = load();
    const cb = jest.fn();
    Samvaad.addUnreadListener(cb);
    expect(mockReactNative.NativeEventEmitter).toHaveBeenCalledWith(mockNative);
    expect(listeners).toHaveLength(1);
    expect(listeners[0].event).toBe(UNREAD_EVENT);
    expect(UNREAD_EVENT).toBe('SamvaadUnreadChange');

    emit(UNREAD_EVENT, { count: 4 });
    emit(UNREAD_EVENT, 2);
    emit(UNREAD_EVENT, { count: -1 });
    expect(cb.mock.calls).toEqual([[4], [2], [0]]);
  });

  it('reuses one emitter and removes listeners independently', () => {
    const Samvaad = load().default;
    const a = jest.fn();
    const b = jest.fn();
    const subA = Samvaad.addUnreadListener(a);
    Samvaad.addUnreadListener(b);
    expect(mockReactNative.NativeEventEmitter).toHaveBeenCalledTimes(1);

    subA.remove();
    subA.remove(); // safe to call twice
    emit('SamvaadUnreadChange', { count: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith(1);
    expect(listeners.filter((l) => l.removed)).toHaveLength(1);
  });

  it('requires a function', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.addUnreadListener(undefined as any)).toThrow(/must be a function/);
  });
});

describe('setPushToken', () => {
  it('defaults to fcm', async () => {
    const Samvaad = load().default;
    await Samvaad.setPushToken(' fcm-token ');
    expect(mockNative.setPushToken).toHaveBeenCalledWith('fcm-token', 'fcm');
  });

  it('passes a lower-cased hex APNs token on iOS', async () => {
    const Samvaad = load().default;
    await Samvaad.setPushToken('0A1B2C', 'apns');
    expect(mockNative.setPushToken).toHaveBeenCalledWith('0a1b2c', 'apns');
  });

  it('rejects a non-hex APNs token', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.setPushToken('xyz1', 'apns')).toThrow(/hex string/);
    expect(() => Samvaad.setPushToken('abc', 'apns')).toThrow(/hex string/);
    expect(mockNative.setPushToken).not.toHaveBeenCalled();
  });

  it('rejects apns on Android', () => {
    mockReactNative.Platform.OS = 'android';
    const Samvaad = load().default;
    expect(() => Samvaad.setPushToken('0a1b', 'apns')).toThrow(/only available on iOS/);
  });

  it('rejects an unknown route and an empty token', () => {
    const Samvaad = load().default;
    expect(() => Samvaad.setPushToken('t', 'gcm' as any)).toThrow(/route must be/);
    expect(() => Samvaad.setPushToken('  ')).toThrow(/token is required/);
  });
});

describe('handlePush', () => {
  it('stringifies values and drops others', async () => {
    const Samvaad = load().default;
    await expect(
      Samvaad.handlePush({
        samvaad: 1,
        tenant_id: 'tenant-uuid',
        session_id: 's1',
        nested: { a: 1 } as any,
        missing: null as any,
      }),
    ).resolves.toBe(true);
    expect(mockNative.handlePush).toHaveBeenCalledWith({
      samvaad: '1',
      tenant_id: 'tenant-uuid',
      session_id: 's1',
    });
  });

  it('resolves false for a non-object payload', async () => {
    const Samvaad = load().default;
    await expect(Samvaad.handlePush(null as any)).resolves.toBe(false);
    expect(mockNative.handlePush).not.toHaveBeenCalled();
  });

  it('returns the native answer', async () => {
    mockNative.handlePush.mockImplementationOnce(() => Promise.resolve(false));
    const Samvaad = load().default;
    await expect(Samvaad.handlePush({ other: 'x' })).resolves.toBe(false);
  });
});
