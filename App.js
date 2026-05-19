import 'react-native-gesture-handler';
import React, { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium_Italic,
} from '@expo-google-fonts/playfair-display';
import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import * as SplashScreen from 'expo-splash-screen';

import { AppProvider, useApp } from './src/context/AppContext.js';
import { TutorialProvider } from './src/context/TutorialContext.js';
import NativeNav from './src/nav/NativeNav.js';
import TutorialCard from './src/components/TutorialCard.js';
import SplashOverlay from './src/components/SplashOverlay.js';

export { FONTS } from './src/lib/fonts.js';

// Prevent native splash from auto-hiding — we will hide it immediately ourselves
// so the native splash (which shows the large icon) never appears to the user.
// Our custom JS SplashOverlay takes over from the very first frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppReady({ fontsLoaded }) {
  const { ready } = useApp();

  if (!fontsLoaded || !ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <NativeNav />
      <TutorialCard />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold, PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic,
    DMMono_300Light, DMMono_400Regular, DMMono_500Medium,
  });
  const [splashDone, setSplashDone] = useState(false);

  // Hide the native splash immediately on first render so only our custom
  // SplashOverlay is ever visible to the user.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <TutorialProvider>
            <AppReady fontsLoaded={!!fontsLoaded} />
          </TutorialProvider>
        </AppProvider>
        {/* SplashOverlay lives outside AppProvider so it renders from frame 1,
            masking the brief loading period before fonts + data are ready. */}
        {!splashDone && <SplashOverlay onDone={() => setSplashDone(true)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
