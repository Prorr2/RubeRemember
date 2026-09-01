import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  StyleProp,
  TextStyle,
  ViewStyle,
  Modal,
  Pressable,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ZoomableImageProps {
  uri: string;
  onClose: () => void;
}

function ZoomableImage({ uri, onClose }: ZoomableImageProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const currentScale = useRef(1);
  const currentTranslateX = useRef(0);
  const currentTranslateY = useRef(0);

  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const initialDistance = useRef<number | null>(null);
  const initialTouchX = useRef<number>(0);
  const initialTouchY = useRef<number>(0);
  
  const touchStartTime = useRef<number>(0);

  useEffect(() => {
    const scaleId = scale.addListener(({ value }) => {
      currentScale.current = value;
    });
    const txId = translateX.addListener(({ value }) => {
      currentTranslateX.current = value;
    });
    const tyId = translateY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });
    return () => {
      scale.removeListener(scaleId);
      translateX.removeListener(txId);
      translateY.removeListener(tyId);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        touchStartTime.current = Date.now();
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const touch1 = touches[0];
          const touch2 = touches[1];
          initialDistance.current = Math.hypot(
            touch1.pageX - touch2.pageX,
            touch1.pageY - touch2.pageY
          );
        } else if (touches.length === 1) {
          initialTouchX.current = gestureState.x0;
          initialTouchY.current = gestureState.y0;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2 && initialDistance.current !== null) {
          const touch1 = touches[0];
          const touch2 = touches[1];
          const currentDistance = Math.hypot(
            touch1.pageX - touch2.pageX,
            touch1.pageY - touch2.pageY
          );

          let newScale = (currentDistance / initialDistance.current) * lastScale.current;
          newScale = Math.max(1, Math.min(5, newScale));
          scale.setValue(newScale);
        } else if (touches.length === 1 && lastScale.current > 1) {
          const deltaX = gestureState.dx;
          const deltaY = gestureState.dy;

          const maxTranslateX = (screenWidth * (lastScale.current - 1)) / 2;
          const maxTranslateY = (screenHeight * (lastScale.current - 1)) / 2;

          let newTranslateX = lastTranslateX.current + deltaX;
          let newTranslateY = lastTranslateY.current + deltaY;

          newTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
          newTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));

          translateX.setValue(newTranslateX);
          translateY.setValue(newTranslateY);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const duration = Date.now() - touchStartTime.current;
        const distance = Math.hypot(gestureState.dx, gestureState.dy);

        // Close on quick tap if not zoomed
        if (duration < 250 && distance < 10 && lastScale.current <= 1.05) {
          onClose();
          return;
        }

        const scaleVal = currentScale.current;
        const txVal = currentTranslateX.current;
        const tyVal = currentTranslateY.current;

        lastScale.current = scaleVal;
        lastTranslateX.current = txVal;
        lastTranslateY.current = tyVal;

        initialDistance.current = null;

        if (scaleVal <= 1.05) {
          Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          ]).start();
          lastScale.current = 1;
          lastTranslateX.current = 0;
          lastTranslateY.current = 0;
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scale },
          { translateX: translateX },
          { translateY: translateY },
        ],
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      {...panResponder.panHandlers}
    >
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}



import { maskTextContent } from '@/components/maskable-text-input';

interface RichTextProps {
  text?: string;
  images?: string[];
  colors: {
    text: string;
    textSecondary?: string;
    backgroundSelected?: string;
  };
  textStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  imageStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  isMasked?: boolean;
}

export function RichText({
  text,
  images,
  colors,
  textStyle,
  linkStyle,
  imageStyle,
  containerStyle,
  isMasked = false,
}: RichTextProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const processedText = isMasked && text ? maskTextContent(text) : text;
  const hasText = typeof processedText === 'string' && processedText.trim().length > 0;
  const hasImages = images && images.length > 0;

  if (!hasText && !hasImages) return null;

  const textColor = colors?.text || '#ffffff';
  const bgSelected = colors?.backgroundSelected || 'rgba(0,0,0,0.05)';

  const blocks: Array<{
    type: 'text' | 'image';
    content: string | Array<{ type: 'text' | 'link'; text: string; url?: string }>;
  }> = [];

  if (hasText) {
    const lines = processedText!.split('\n');
    let currentTextParts: Array<{ type: 'text' | 'link'; text: string; url?: string }> = [];

    const flushText = () => {
      if (currentTextParts.length > 0) {
        blocks.push({ type: 'text', content: [...currentTextParts] });
        currentTextParts = [];
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      
      // Check if the entire line is a base64 image string
      if (trimmed.startsWith('data:image/') && trimmed.includes(';base64,')) {
        flushText();
        blocks.push({ type: 'image', content: trimmed });
      } else {
        // It's a normal line of text. Parse it for URLs.
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const tokens = line.split(urlRegex);
        
        tokens.forEach((token) => {
          if (!token) return;
          
          // Use local test regex without /g flag
          const isUrl = /^https?:\/\/[^\s]+$/i.test(token);
          if (isUrl) {
            // Check if it's an image URL
            const cleanUrl = token.split('?')[0].split('#')[0];
            const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(cleanUrl);
            
            if (isImg) {
              flushText();
              blocks.push({ type: 'image', content: token });
            } else {
              currentTextParts.push({ type: 'link', text: token, url: token });
            }
          } else {
            currentTextParts.push({ type: 'text', text: token });
          }
        });
        
        // Preserve newlines between text lines
        if (lineIdx < lines.length - 1) {
          currentTextParts.push({ type: 'text', text: '\n' });
        }
      }
    });
    flushText();
  }

  const handleLinkPress = async (url: string) => {
    try {
      let targetUrl = url.trim();
      while (targetUrl && /[.,;:!]$/.test(targetUrl)) {
        targetUrl = targetUrl.slice(0, -1);
      }
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      await openBrowserAsync(targetUrl);
    } catch (err) {
      console.error('Error rendering link:', err);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'image') {
          const imageUrl = block.content as string;
          return (
            <Pressable
              key={bIdx}
              onPress={() => setFullscreenImage(imageUrl)}
              style={[styles.imageContainer, imageStyle]}
            >
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.image,
                  { backgroundColor: bgSelected },
                ]}
                resizeMode="cover"
              />
            </Pressable>
          );
        }

        const parts = block.content as Array<{ type: 'text' | 'link'; text: string; url?: string }>;
        return (
          <Text
            key={bIdx}
            style={[styles.text, { color: textColor }, textStyle]}
          >
            {parts.map((part, pIdx) => {
              if (part.type === 'link') {
                return (
                  <Text
                    key={pIdx}
                    style={[styles.link, linkStyle]}
                    onPress={() => handleLinkPress(part.url!)}
                  >
                    {part.text}
                  </Text>
                );
              }
              return <Text key={pIdx}>{part.text}</Text>;
            })}
          </Text>
        );
      })}

      {images && images.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 }}>
          {images.map((img, idx) => (
            <Pressable
              key={`indep-img-${idx}`}
              onPress={() => setFullscreenImage(img)}
              style={[{ width: 160, height: 160, borderRadius: 8, overflow: 'hidden' }, imageStyle]}
            >
              <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
          ))}
        </View>
      )}

      {fullscreenImage && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImage(null)}
        >
          <View style={styles.modalOverlay}>
            {/* Absolute backdrop for closing on empty click */}
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setFullscreenImage(null)}
            />
            <View style={styles.modalContent} pointerEvents="box-none">
              <ZoomableImage uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
              <Pressable
                onPress={() => setFullscreenImage(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
