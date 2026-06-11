import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [show, setShow] = useState(true);

  // Safe dimension fallbacks — useWindowDimensions is always correct by mount time
  const W = width || 390;
  const H = height || 844;
  const LOGO_W = Math.min(600, W * 1.15);
  const GLOW = LOGO_W * 0.7 || 1;
  const FILL_SCALE = (Math.sqrt(W * W + H * H) * 1.25) / GLOW;

  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslate = useRef(new Animated.Value(16)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.28, duration: 700, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(nameTranslate, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(glowScale, { toValue: FILL_SCALE, duration: 750, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(containerOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => setShow(false));

    // Safety net for PWA browser tab throttling (iOS Safari is aggressive)
    const fallback = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(fallback);
  }, [FILL_SCALE]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {show && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.overlay, { opacity: containerOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['#160826', '#1E0E45', '#2A1A66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <Animated.View
            style={[
              styles.glowBase,
              {
                width: GLOW,
                height: GLOW,
                borderRadius: GLOW / 2,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          <Animated.View style={[styles.center, { opacity: contentOpacity }]}>
            <Animated.Image
              source={require('../../assets/adaptive-icon.png')}
              resizeMode="contain"
              style={{
                width: LOGO_W,
                height: LOGO_W * 0.62,
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              }}
            />
            <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameTranslate }] }}>
              <Text style={[styles.name, { marginTop: -LOGO_W * 0.18 }]}>GraceLink</Text>
              <Text style={styles.tagline}>Every step ordered by Him</Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  center: { alignItems: 'center', justifyContent: 'center' },
  glowBase: {
    position: 'absolute',
    backgroundColor: '#4F46E5',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
