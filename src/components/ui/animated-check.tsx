import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AnimatedCheckProps {
  /** Whether the item is in its completed state. */
  done: boolean;
  size?: number;
  color?: string;
  /** Colour of the unchecked outline. */
  inactiveColor?: string;
}

/**
 * A checkmark that springs in when `done` becomes true. Falls back to a simple
 * outline when not done, so it can replace a static "complete" toggle.
 */
export function AnimatedCheck({ done, size = 24, color = '#34C759', inactiveColor = '#8E8E93' }: AnimatedCheckProps) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (done) {
      scale.setValue(0.3);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 130,
      }).start();
    } else {
      scale.setValue(0);
    }
  }, [done, scale]);

  if (!done) {
    return <Ionicons name="ellipse-outline" size={size} color={inactiveColor} />;
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="checkmark-circle" size={size} color={color} />
    </Animated.View>
  );
}