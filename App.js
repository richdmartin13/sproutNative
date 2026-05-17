import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium_Italic,
} from '@expo-google-fonts/playfair-display';
import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';

import { AppProvider } from './src/context/AppContext.js';
import NativeNav from './src/nav/NativeNav.js';

// Re-export FONTS so any file that imports from App.js continues to work
export { FONTS } from './src/lib/fonts.js';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold, PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic,
    DMMono_300Light, DMMono_400Regular, DMMono_500Medium,
  });
  if (!fontsLoaded) return <View style={{ flex:1, backgroundColor:'#09100c' }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NativeNav />
      </AppProvider>
    </SafeAreaProvider>
  );
}
