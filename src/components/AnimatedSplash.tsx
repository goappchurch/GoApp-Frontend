import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

/**
 * Wraps the app and plays a one-time animated logo intro on launch.
 * Uses the transparent logo (adaptive-icon) so it feels immersed in the
 * gradient background — no card/box behind it. After the logo + name settle,
 * the soft circle behind the logo spreads out to fill the whole screen, then
 * the overlay dissolves into the app.
 * Pure Animated API → works on native and the web/PWA build.
 */
export default function AnimatedSplash({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

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
      // Glow blooms + logo springs in together
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.28, duration: 700, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // App name + tagline rise in
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(nameTranslate, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(400),
      // The circle spreads out to fill the whole screen, logo/name fade with it
      Animated.parallel([
        Animated.timing(glowScale, { toValue: FILL_SCALE, duration: 750, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Dissolve the filled screen into the app
      Animated.timing(containerOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => setShow(false));

    // Safety net: on a backgrounded PWA tab, browsers throttle timers/RAF and
    // the animation callback can stall. Guarantee the splash always dismisses.
    const fallback = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(fallback);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {show && (
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.overlay, { opacity: containerOpacity }]} pointerEvents="none">
          <LinearGradient
            colors={['#160826', '#1E0E45', '#2A1A66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Spreading circle — sits behind the logo, then expands to fill the screen */}
          <Animated.View
            style={[
              styles.glow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />

          <Animated.View style={[styles.center, { opacity: contentOpacity }]}>
            {/* Transparent logo — no box, immersed in the background */}
            <Animated.Image
              source={require('../../assets/adaptive-icon.png')}
              resizeMode="contain"
              style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
            />

            {/* App name + tagline */}
            <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameTranslate }] }}>
              <Text style={styles.name}>GraceLink</Text>
              <Text style={styles.tagline}>Every step ordered by Him</Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const LOGO_W = Math.min(600, width * 1.15);
const GLOW = LOGO_W * 0.7;
// Scale needed for the centered circle to cover the whole screen (+ margin)
const FILL_SCALE = (Math.sqrt(width * width + height * height) * 1.25) / GLOW;

const styles = StyleSheet.create({
  overlay: { justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: GLOW,
    height: GLOW,
    borderRadius: GLOW / 2,
    backgroundColor: '#4F46E5',
  },
  logo: { width: LOGO_W, height: LOGO_W * 0.62 },
  name: {
    marginTop: -LOGO_W * 0.18,
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
