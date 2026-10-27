import React, {useEffect, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Samvaad from '@samvaads/react-native-widget';

// Placeholder workspace ID: use your own from Admin -> Website widget (data-tenant-id).
const TENANT_ID = '00000000-0000-4000-8000-000000000000';
const HOST = 'yobruh.samvaads.com';

export default function App(): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: {remove(): void} | null = null;
    Samvaad.configure({tenantId: TENANT_ID, host: HOST})
      .then(() => {
        subscription = Samvaad.addUnreadListener(setUnread);
        return Samvaad.getUnreadCount();
      })
      .then(setUnread)
      .catch((e: unknown) => setError(String(e)));
    return () => subscription?.remove();
  }, []);

  const openHelp = () => {
    Samvaad.present({message: 'Help with order YB-1042'}).catch((e: unknown) =>
      setError(String(e)),
    );
  };

  return (
    <SafeAreaView style={[styles.screen, isDark && styles.screenDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.content}>
        <Text style={[styles.title, isDark && styles.textDark]}>Yobruh Shop</Text>
        <Text style={[styles.order, isDark && styles.textDark]}>
          Order YB-1042 · Out for delivery
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Help, ${unread} unread` : 'Help'}
          onPress={openHelp}
          style={styles.help}>
          <Text style={styles.helpText}>Help</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#ffffff'},
  screenDark: {backgroundColor: '#111111'},
  content: {flex: 1, padding: 24, justifyContent: 'center', gap: 16},
  title: {fontSize: 28, fontWeight: '700', color: '#111111'},
  order: {fontSize: 16, color: '#333333'},
  textDark: {color: '#f2f2f2'},
  help: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  helpText: {color: '#ffffff', fontSize: 16, fontWeight: '600'},
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#d1242f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: '#ffffff', fontSize: 12, fontWeight: '700'},
  error: {color: '#d1242f'},
});
