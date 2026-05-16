import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useApp } from '../context/AppContext.js';

export function Toggle({ value, onChange }) {
  const { theme } = useApp();
  return (
    <Pressable onPress={() => onChange(!value)} style={{
      width:46, height:26, borderRadius:13,
      backgroundColor: value ? theme.accent : theme.solid3,
      justifyContent:'center', paddingHorizontal:2,
    }}>
      <View style={{
        width:22, height:22, borderRadius:11, backgroundColor:'#fff',
        alignSelf: value ? 'flex-end' : 'flex-start',
        shadowColor:'#000', shadowOffset:{width:0,height:1},
        shadowOpacity:0.22, shadowRadius:2, elevation:2,
      }} />
    </Pressable>
  );
}

export function Field({ label, children }) {
  const { theme } = useApp();
  return (
    <View style={{ marginBottom:16 }}>
      {typeof label === 'string'
        ? <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            letterSpacing:0.5, textTransform:'uppercase', marginBottom:7 }}>
            {label}
          </Text>
        : <View style={{ marginBottom:7 }}>{label}</View>
      }
      {children}
    </View>
  );
}

export function TInput({ value, onChange, placeholder, multiline, keyboardType }) {
  const { theme } = useApp();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      keyboardType={keyboardType || 'default'}
      multiline={multiline || false}
      numberOfLines={multiline ? 3 : 1}
      style={{
        backgroundColor:theme.solid2, borderRadius:12,
        borderWidth:1, borderColor:theme.border,
        padding:12, paddingHorizontal:14, color:theme.text, fontSize:15,
        minHeight: multiline ? 72 : undefined,
        textAlignVertical: multiline ? 'top' : undefined,
      }}
    />
  );
}

export function Btn({ label, onPress, primary, danger, disabled }) {
  const { theme } = useApp();
  const bg = primary ? theme.accent : danger ? 'rgba(251,113,133,0.15)' : theme.solid2;
  const tc = primary ? '#fff'       : danger ? theme.typeSt              : theme.text;
  const bc = primary ? 'transparent': danger ? 'rgba(251,113,133,0.28)'  : theme.border;
  return (
    <Pressable onPress={onPress} disabled={disabled || false}
      style={({ pressed }) => ({
        flex:1, padding:13, borderRadius:13, alignItems:'center',
        backgroundColor:bg, borderWidth:1, borderColor:bc,
        opacity: disabled ? 0.42 : pressed ? 0.78 : 1,
      })}>
      <Text style={{ fontSize:14, fontWeight:'600', color:tc }}>{label}</Text>
    </Pressable>
  );
}
