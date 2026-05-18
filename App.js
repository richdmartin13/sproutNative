import React, { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium_Italic,
} from '@expo-google-fonts/playfair-display';
import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import * as SplashScreen from 'expo-splash-screen';

import { AppProvider, useApp } from './src/context/AppContext.js';
import NativeNav from './src/nav/NativeNav.js';

// Re-export FONTS so any file that imports from App.js continues to work
export { FONTS } from './src/lib/fonts.js';

// Keep the splash screen visible until both fonts and data are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppReady({ fontsLoaded }) {
  const { ready } = useApp();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && ready) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NativeNav />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold, PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic,
    DMMono_300Light, DMMono_400Regular, DMMono_500Medium,
  });

  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppReady fontsLoaded={!!fontsLoaded} />
      </AppProvider>
    </SafeAreaProvider>
  );
}
