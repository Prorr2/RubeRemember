import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface PressableScaleProps extends PressableProps {
  /** Scale factor applied while pressed (default 0.97). */
  scaleTo?: number;
  /** Opacity while pressed (default 0.85). */
  pressedOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pressable wrapper that adds a subtle scale + opacity feedback while pressed,
 * giving every tappable element a consistent tactile feel.
 */
export function PressableScale({
  scaleTo = 0.97,
  pressedOpacity = 0.85,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: value,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }),
      Animated.timing(opacity, {
        toValue: value === 1 ? 1 : pressedOpacity,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPressIn={(e) => {
        animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      style={style}
      {...props}
    >
      {typeof children === 'function' ? (
        (children as (state: { pressed: boolean }) => React.ReactNode)
      ) : (
        <Animated.View style={[{ transform: [{ scale }], opacity }]}>{children}</Animated.View>
      )}
    </Pressable>
  );
}