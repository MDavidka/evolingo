import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { EvoTheme } from '../theme/tokens';

interface LiquidGlassSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const LiquidGlassSearchField: React.FC<LiquidGlassSearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Fájlok és mappák keresése',
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Search
        size={19}
        color={EvoTheme.colors.secondary}
        strokeWidth={1.85}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={EvoTheme.colors.secondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Keresés törlése"
        >
          <X size={16} color={EvoTheme.colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    borderRadius: EvoTheme.radius.searchField,
    backgroundColor: EvoTheme.colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EvoTheme.colors.line,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: EvoTheme.colors.lineStrong,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: EvoTheme.colors.ink,
    paddingVertical: 8,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
