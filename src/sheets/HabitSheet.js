import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Sheet from './Sheet.js';
import { Field, TInput, Btn } from '../components/Themed.js';
import { useApp } from '../context/AppContext.js';
import { TYPE_COLORS, TYPE_LABELS } from '../lib/theme.js';
import { uid } from '../lib/util.js';
import { FONTS } from '../lib/fonts.js';

export default function HabitSheet({ habit, allHabits, onClose, onSave }) {
  const { theme } = useApp();
  const editing = !!habit;
  const [name,     setName]     = useState(habit?.name     || '');
  const [category, setCategory] = useState(habit?.category || '');
  const [type,     setType]     = useState(habit?.type     || 'go');

  const cats = useMemo(() =>
    [...new Set((allHabits||[]).map(h=>h.category).filter(Boolean))].slice(0,8),
    [allHabits]
  );
  const valid = name.trim().length > 0 && category.trim().length > 0;

  const save = () => {
    if (!valid) return;
    onSave({
      id:       habit?.id      || uid('h'),
      name:     name.trim().slice(0,40),
      category: category.trim().slice(0,30),
      type,
      created:  habit?.created || new Date().toISOString().slice(0,10),
      logs:     habit?.logs    || [],
    });
  };

  const TC_DESC = {
    go: 'Something you want to do more or track building',
    st: 'Something you want to stop or resist',
    ne: 'Something neutral you want to observe',
  };

  return (
    <Sheet title={editing ? 'Edit Habit' : 'New Habit'} onClose={onClose}>
      <Field label="Name">
        <TInput value={name} onChange={t=>setName(t.slice(0,40))} placeholder="e.g. Morning run" />
      </Field>

      <Field label="Category">
        <TInput value={category} onChange={t=>setCategory(t.slice(0,30))} placeholder="e.g. Wellness" />
        {cats.length > 0 && (
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8 }}>
            {cats.map(c => (
              <Pressable key={c} onPress={() => setCategory(c)}
                style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:14,
                  backgroundColor:theme.accentDim, borderWidth:1, borderColor:theme.accentBorder }}>
                <Text style={{ color:theme.accent, fontSize:12, fontWeight:'600' }}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Field>

      <Field label="Type">
        <View style={{ gap:8 }}>
          {['go','st','ne'].map(t => (
            <Pressable key={t} onPress={() => setType(t)}
              style={{ flexDirection:'row', alignItems:'center', padding:13, borderRadius:14,
                backgroundColor: type===t ? `${TYPE_COLORS[t]}18` : theme.solid2,
                borderWidth: type===t ? 1.5 : 1,
                borderColor: type===t ? TYPE_COLORS[t] : theme.border }}>
              <View style={{ width:10, height:10, borderRadius:5, marginRight:12,
                backgroundColor: TYPE_COLORS[t] }} />
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'600',
                  color: type===t ? TYPE_COLORS[t] : theme.text }}>
                  {TYPE_LABELS[t]}
                </Text>
                <Text style={{ fontSize:11.5, color:theme.muted, marginTop:2 }}>
                  {TC_DESC[t]}
                </Text>
              </View>
              {type===t && (
                <View style={{ width:18, height:18, borderRadius:9, backgroundColor:TYPE_COLORS[t],
                  alignItems:'center', justifyContent:'center' }}>
                  <View style={{ width:8, height:8, borderRadius:4, backgroundColor:'#fff' }} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </Field>

      <View style={{ flexDirection:'row', gap:8, marginTop:4 }}>
        <Btn label="Cancel" onPress={onClose} />
        <Btn label={editing?'Save changes':'Create habit'} onPress={save} primary disabled={!valid} />
      </View>
    </Sheet>
  );
}
