import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

// Catch any unhandled JS errors and show them on screen
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('GLOBAL ERROR:', error?.message, error?.stack);
    originalHandler && originalHandler(error, isFatal);
  });
}

export default function App() {
  const [status, setStatus] = useState('start');
  const [error, setError] = useState(null);
  const [dbOk, setDbOk] = useState(false);
  const [navOk, setNavOk] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    // Step 1: basic render
    setStatus('Krok 1: render OK');

    // Step 2: test SQLite import
    try {
      setStatus('Krok 2: importuje expo-sqlite...');
      const SQLite = await import('expo-sqlite');
      setStatus('Krok 2: expo-sqlite OK');
      setDbOk(true);
    } catch (e) {
      setError('expo-sqlite FAIL: ' + e.message);
      return;
    }

    // Step 3: test navigation import
    try {
      setStatus('Krok 3: importuje nawigacje...');
      await import('@react-navigation/native');
      await import('@react-navigation/native-stack');
      setStatus('Krok 3: nawigacja OK');
      setNavOk(true);
    } catch (e) {
      setError('nawigacja FAIL: ' + e.message);
      return;
    }

    // Step 4: test SafeAreaProvider
    try {
      setStatus('Krok 4: importuje SafeAreaProvider...');
      await import('react-native-safe-area-context');
      setStatus('Krok 4: SafeAreaProvider OK');
    } catch (e) {
      setError('SafeAreaProvider FAIL: ' + e.message);
      return;
    }

    // Step 5: test database init
    try {
      setStatus('Krok 5: inicjalizuje baze danych...');
      const { initDatabase } = await import('./database');
      await initDatabase();
      setStatus('Krok 5: baza danych OK');
    } catch (e) {
      setError('database FAIL: ' + e.message);
      return;
    }

    setStatus('WSZYSTKO OK - laduje aplikacje...');

    // Step 6: load  app
    try {
      await new Promise(r => setTimeout(r, 500));
      const { default: RealApp } = await import('./App');
      // If we get here everything works
      setStatus('GOTOWE');
    } catch (e) {
      setError('App FAIL: ' + e.message);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mój Zielnik</Text>
        <Text style={styles.subtitle}>Diagnostyka</Text>

        {!error ? (
          <View style={styles.statusBox}>
            <ActivityIndicator color="#5A9B1C" size="large" style={{ marginBottom: 16 }} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>BŁĄD ZNALEZIONY:</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.hint}>
              Zrób screenshot i wyślij do naprawy.
            </Text>
          </View>
        )}

        <View style={styles.checks}>
          <Check label="expo-sqlite" ok={dbOk} />
          <Check label="nawigacja" ok={navOk} />
        </View>
      </ScrollView>
    </View>
  );
}

function Check({ label, ok }) {
  return (
    <View style={styles.checkRow}>
      <Text style={[styles.checkIcon, { color: ok ? '#3D7012' : '#888' }]}>
        {ok ? '✓' : '○'}
      </Text>
      <Text style={[styles.checkLabel, { color: ok ? '#3D7012' : '#888' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#244208',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#78776F',
    marginBottom: 32,
  },
  statusBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8D6CC',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 15,
    color: '#3d3d3a',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FDECEB',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#D93025',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D93025',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#3d3d3a',
    lineHeight: 20,
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: '#78776F',
    fontStyle: 'italic',
  },
  checks: {
    width: '100%',
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8D6CC',
  },
  checkIcon: {
    fontSize: 18,
    fontWeight: '800',
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
