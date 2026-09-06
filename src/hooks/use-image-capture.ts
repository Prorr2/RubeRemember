import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { saveDataUrl, resolveImageUri } from '@/services/image-store';

export function useImageCapture() {
  const pickImageDataUrl = useCallback(
    async (picker: 'camera' | 'gallery'): Promise<string | null> => {
      if (picker === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar fotos.');
          return null;
        }
        try {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.5,
            base64: true,
          });
          if (result.canceled || !result.assets || !result.assets[0]) {
            return null;
          }
          return await imageAssetToDataUrl(result.assets[0]);
        } catch (err) {
          console.error('Error capturing camera image:', err);
          Alert.alert('Error', 'No se pudo procesar la imagen de la cámara.');
          return null;
        }
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar una imagen.');
        return null;
      }
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.5,
          base64: true,
        });
        if (result.canceled || !result.assets || !result.assets[0]) {
          return null;
        }
        return await imageAssetToDataUrl(result.assets[0]);
      } catch (err) {
        console.error('Error selecting image:', err);
        Alert.alert('Error', 'No se pudo procesar la imagen seleccionada.');
        return null;
      }
    },
    []
  );

  const handleAddImage = useCallback(
    async (onImageSelected: (imageId: string) => void) => {
      Alert.alert(
        'Añadir Imagen',
        'Elige el origen de la imagen:',
        [
          {
            text: 'Cámara 📸',
            onPress: async () => {
              const dataUrl = await pickImageDataUrl('camera');
              if (!dataUrl) {
                return;
              }
              const id = await saveDataUrl(dataUrl);
              onImageSelected(id);
            },
          },
          {
            text: 'Galería de Fotos 🖼️',
            onPress: async () => {
              const dataUrl = await pickImageDataUrl('gallery');
              if (!dataUrl) {
                return;
              }
              const id = await saveDataUrl(dataUrl);
              onImageSelected(id);
            },
          },
        ],
        { cancelable: true }
      );
    },
    [pickImageDataUrl]
  );

  return { handleAddImage, pickImageDataUrl };
}

async function imageAssetToDataUrl(
  asset: ImagePicker.ImagePickerAsset
): Promise<string> {
  let base64Data = asset.base64;
  if (!base64Data) {
    base64Data = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64',
    });
  }
  if (!base64Data) {
    return '';
  }
  const mimeType = asset.mimeType || 'image/jpeg';
  return base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${base64Data}`;
}

export { resolveImageUri };