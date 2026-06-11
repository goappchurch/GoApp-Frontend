import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BG = '#160826';

export default function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [show, setShow] = useState(true);

  const W = width || 390;
  const H = height || 844;
  const LOGO_W = Math.min(600, W * 1.15);
  const GLOW = LOGO_W * 0.7 || 1;
  const fillScaleRef = useRef((Math.sqrt(W * W + H * H) * 1.25) / GLOW);

  const logoScale      = useRef(new Animated.Value(0.7)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const glowScale      = useRef(new Animated.Value(0.5)).current;
  const glowOpacity    = useRef(new Animated.Value(0)).current;
  const nameOpacity    = useRef(new Animated.Value(0)).current;
  const nameTranslate  = useRef(new Animated.Value(16)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const FILL_SCALE = fillScaleRef.current;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowOpacity,  { toValue: 0.28, duration: 700, useNativeDriver: true }),
        Animated.timing(glowScale,    { toValue: 1,    duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(logoScale,    { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
        Animated.timing(logoOpacity,  { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity,   { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(nameTranslate, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(glowScale,      { toValue: FILL_SCALE, duration: 750, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(glowOpacity,    { toValue: 1, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => setShow(false));

    const fallback = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(fallback);
  }, []);

  return (
    // Children are ALWAYS in this wrapper — never re-mounted
    <View style={{ flex: 1 }}>
      {children}

      {show && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.center, { opacity: overlayOpacity, backgroundColor: BG }]}
          pointerEvents="none"
        >
          {/* Explicit width/height — absoluteFillObject on LinearGradient is unreliable on mobile web */}
          <LinearGradient
            colors={['#160826', '#1E0E45', '#2A1A66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', width: W, height: H }}
          />

          {/* Spreading glow circle */}
          <Animated.View
            style={{
              position: 'absolute',
              width: GLOW,
              height: GLOW,
              borderRadius: GLOW / 2,
              backgroundColor: '#4F46E5',
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            }}
          />

          {/* Logo + name, centred */}
          <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, { opacity: contentOpacity }]}>
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
            <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameTranslate }], alignItems: 'center' }}>
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
  center: { alignItems: 'center', justifyContent: 'center' },
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
