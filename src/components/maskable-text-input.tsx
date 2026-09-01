import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';

/**
 * Replaces non-whitespace characters with asterisks while preserving spaces, tabs, and newlines.
 * Example: "Hola mundo" -> "**** *****"
 */
export function maskTextContent(text: string): string {
  if (!text) return '';
  return text.replace(/\S/g, '*');
}

export interface MaskableTextInputProps extends TextInputProps {
  isMasked?: boolean;
}

export function extractStyles(style: any) {
  const flat = StyleSheet.flatten(style) || {};
  const containerStyle: any = {};
  const textStyle: any = {};

  const containerKeys = new Set([
    'backgroundColor',
    'borderRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    'borderWidth',
    'borderColor',
    'borderTopWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderRightWidth',
    'borderStyle',
    'margin',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'marginHorizontal',
    'marginVertical',
    'flex',
    'flexGrow',
    'flexShrink',
    'width',
    'height',
    'minHeight',
    'maxHeight',
    'alignSelf',
    'opacity',
    'overflow',
    'shadowColor',
    'shadowOffset',
    'shadowOpacity',
    'shadowRadius',
    'elevation',
  ]);

  Object.keys(flat).forEach((key) => {
    if (containerKeys.has(key)) {
      containerStyle[key] = flat[key];
    } else {
      textStyle[key] = flat[key];
    }
  });

  return { containerStyle, textStyle, flat };
}

export const MaskableTextInput = React.forwardRef<TextInput, MaskableTextInputProps>(
  ({ isMasked = false, value = '', onChangeText, style, placeholder, placeholderTextColor, ...props }, ref) => {
    if (!isMasked) {
      return (
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          style={style}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          {...props}
        />
      );
    }

    const { containerStyle, textStyle } = extractStyles(style);
    const maskedDisplay = maskTextContent(value || '');
    const hasValue = Boolean(value && value.length > 0);

    return (
      <View style={[{ position: 'relative', justifyContent: 'center' }, containerStyle]}>
        {/* Underlying visible Text component displaying asterisks *** ***** */}
        <Text
          numberOfLines={props.multiline ? undefined : 1}
          style={[
            textStyle,
            {
              color: hasValue ? (textStyle.color || '#FFFFFF') : (placeholderTextColor || 'rgba(150, 150, 150, 0.7)'),
              backgroundColor: 'transparent',
              opacity: hasValue ? 1 : 0.7,
            },
          ]}
        >
          {hasValue ? maskedDisplay : (placeholder || '')}
        </Text>

        {/* Overlaid invisible TextInput handling all touch, focus, native typing & keyboard IME */}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder=""
          style={[
            StyleSheet.absoluteFill,
            textStyle,
            {
              color: 'transparent',
              backgroundColor: 'transparent',
              opacity: 0,
            },
          ]}
          {...props}
        />
      </View>
    );
  }
);
