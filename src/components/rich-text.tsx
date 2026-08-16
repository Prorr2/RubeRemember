import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';

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
}

export function RichText({
  text,
  images,
  colors,
  textStyle,
  linkStyle,
  imageStyle,
  containerStyle,
}: RichTextProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const hasText = typeof text === 'string' && text.trim().length > 0;
  const hasImages = images && images.length > 0;

  if (!hasText && !hasImages) return null;

  const textColor = colors?.text || '#ffffff';
  const bgSelected = colors?.backgroundSelected || 'rgba(0,0,0,0.05)';

  const blocks: Array<{
    type: 'text' | 'image';
    content: string | Array<{ type: 'text' | 'link'; text: string; url?: string }>;
  }> = [];

  if (hasText) {
    const lines = text!.split('\n');
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
              style={[{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }, imageStyle]}
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
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setFullscreenImage(null)}
          >
            <View style={styles.modalContent}>
              <Image
                source={{ uri: fullscreenImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <Pressable
                onPress={() => setFullscreenImage(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </Pressable>
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
