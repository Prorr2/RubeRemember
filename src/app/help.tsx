import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';
import { DOCUMENTATION_DATA } from '@/constants/documentation';

function MarkdownRenderer({ content, colors }: { content: string; colors: any }) {
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  const renderInlineStyles = (text: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={styles.markdownBold}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Text
            key={index}
            style={[
              styles.markdownCode,
              {
                color: '#00C7BE',
                backgroundColor: colors.backgroundSelected,
                fontFamily: Fonts.mono,
              },
            ]}
          >
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      if (i > 0 && lines[i - 1].trim() !== '') {
        renderedElements.push(<View key={`space-${i}`} style={styles.markdownSpace} />);
      }
      continue;
    }

    // Heading: ###
    if (trimmedLine.startsWith('### ')) {
      const headingText = trimmedLine.replace('### ', '');
      renderedElements.push(
        <Text key={`h3-${i}`} style={[styles.markdownHeading, { color: colors.text }]}>
          {renderInlineStyles(headingText)}
        </Text>
      );
      continue;
    }

    // Bullet List Item: - or *
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const bulletText = trimmedLine.substring(2);
      renderedElements.push(
        <View key={`bullet-${i}`} style={styles.markdownListItemRow}>
          <Text style={[styles.markdownBulletPoint, { color: '#00C7BE' }]}>•</Text>
          <Text style={[styles.markdownListItemText, { color: colors.text }]}>
            {renderInlineStyles(bulletText)}
          </Text>
        </View>
      );
      continue;
    }

    // Numbered List Item: 1. 2. etc.
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const itemText = numberedMatch[2];
      renderedElements.push(
        <View key={`num-${i}`} style={styles.markdownListItemRow}>
          <Text style={[styles.markdownNumberPrefix, { color: '#00C7BE' }]}>{num}.</Text>
          <Text style={[styles.markdownListItemText, { color: colors.text }]}>
            {renderInlineStyles(itemText)}
          </Text>
        </View>
      );
      continue;
    }

    // Regular paragraph
    renderedElements.push(
      <Text key={`p-${i}`} style={[styles.markdownParagraph, { color: colors.text }]}>
        {renderInlineStyles(trimmedLine)}
      </Text>
    );
  }

  return <View style={styles.markdownContainer}>{renderedElements}</View>;
}

export default function HelpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' || !colorScheme ? 'dark' : colorScheme;
  const colors = Colors[scheme];

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search filter logic
  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return DOCUMENTATION_DATA;

    const queryTerms = q.split(/\s+/);
    return DOCUMENTATION_DATA.filter((doc) => {
      return queryTerms.every((term) => {
        const titleMatch = doc.title.toLowerCase().includes(term);
        const categoryMatch = doc.category.toLowerCase().includes(term);
        const contentMatch = doc.content.toLowerCase().includes(term);
        const keywordMatch = doc.keywords.some((kw) => kw.toLowerCase().includes(term));
        return titleMatch || categoryMatch || contentMatch || keywordMatch;
      });
    });
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manual de Ayuda Inteligente</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.backgroundElement }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Buscar en el manual (ej. algoritmo, memos)..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Auto-expand first result if searching
              if (text.trim().length > 0 && filteredDocs.length > 0) {
                setExpandedId(filteredDocs[0].id);
              }
            }}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setExpandedId(null); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredDocs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No se encontraron coincidencias para tu búsqueda.
            </Text>
          </View>
        ) : (
          filteredDocs.map((doc) => {
            const isExpanded = expandedId === doc.id || (searchQuery.trim().length > 0 && filteredDocs.length === 1);
            return (
              <View
                key={doc.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.backgroundElement },
                  isExpanded && { borderColor: '#00C7BE', borderWidth: 1 },
                ]}
              >
                <Pressable onPress={() => toggleExpand(doc.id)} style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardCategory, { color: '#00C7BE' }]}>{doc.category.toUpperCase()}</Text>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{doc.title}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={[styles.cardBody, { borderTopColor: colors.backgroundSelected }]}>
                    <MarkdownRenderer content={doc.content} colors={colors} />
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardBody: {
    borderTopWidth: 1,
    padding: 16,
  },
  cardContent: {
    fontSize: 13,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  markdownContainer: {
    width: '100%',
  },
  markdownParagraph: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  markdownBold: {
    fontWeight: '700',
  },
  markdownCode: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  markdownHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  markdownListItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 4,
  },
  markdownBulletPoint: {
    fontSize: 14,
    lineHeight: 18,
    marginRight: 6,
    width: 8,
    textAlign: 'center',
  },
  markdownNumberPrefix: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginRight: 6,
    width: 18,
    textAlign: 'right',
  },
  markdownListItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  markdownSpace: {
    height: 6,
  },
});
