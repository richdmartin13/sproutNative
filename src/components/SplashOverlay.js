import React, { useEffect, useRef } from 'react';
import { Animated, Image } from 'react-native';

export default function SplashOverlay({ onDone }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }).start(() => onDone?.());
    }, 850);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#1a4a2e',
      alignItems: 'center', justifyContent: 'center',
      opacity,
    }}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: 108, height: 108, borderRadius: 24 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
