import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Star, X } from '../components/Icon.js';
import Sheet from './Sheet.js';
import { Field, TInput, Btn } from '../components/Themed.js';
import { useApp } from '../context/AppContext.js';
import { MOOD_OPTS, ENERGY_OPTS, parseTags } from '../lib/util.js';

const COMMON_TAGS = [
  'morning','evening','work','home','outdoor','social','solo',
  'stressed','relaxed','motivated','tired','food','coffee',
  'gym','walk','weekend','routine','spontaneous','mindful','distracted',
];

export default function PendingDetailsSheet({ habit, initial = {}, onClose, onSet }) {
  const { theme, data } = useApp();
  const rawTrack = data?.prefs?.track || {};
  const ht = habit.type;
  const tr = (k) => {
    const v = rawTrack[k];
    if (v === false) return false;
    if (typeof v === 'object' && v !== null) return v[ht] !== false;
    return true;
  };
  const track = Object.fromEntries(
    ['ease','mood','energy','duration','trigger','resist','context','tags','notes'].map(k => [k, tr(k)])
  );

  const [ease,    setEase]    = useState(initial.ease    || 0);
  const [mood,    setMood]    = useState(initial.mood    || '');
  const [energy,  setEnergy]  = useState(initial.energy  || '');
  const [dur,     setDur]     = useState(String(initial.duration || ''));
  const [trigger, setTrig]    = useState(initial.trigger || '');
  const [resist,  setResist]  = useState(initial.resist  || (habit.type === 'st' ? 'no' : ''));
  const [ctx,     setCtx]     = useState(initial.context || '');
  const [tags,    setTags]    = useState(initial.tags    || []);
  const [draft,   setDraft]   = useState('');
  const [notes,   setNotes]   = useState(initial.notes   || '');

  const suggested = useMemo(() => {
    const existing = new Set((habit.logs||[]).flatMap(l => l.tags||[]));
    const all = [...existing, ...COMMON_TAGS];
    const seen = new Set();
    return all.filter(t => { if (seen.has(t)||tags.includes(t)) return false; seen.add(t); return true; }).slice(0,12);
  }, [habit.logs, tags]);

  const commitDraft = (d = draft) => {
    parseTags(d).filter(t => !tags.includes(t)).forEach(t => setTags(p => [...p, t]));
    setDraft('');
  };
  const onTagChange = v => { if (v.endsWith(',')) { commitDraft(v.slice(0,-1)); } else setDraft(v); };

  const PickRow = ({ items, value, onChange }) => (
    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
      {items.map(([k,lbl,c]) => (
        <Pressable key={k} onPress={() => onChange(value===k?'':k)}
          style={{ flex:1, minWidth:'28%', paddingVertical:11, paddingHorizontal:8, borderRadius:12, alignItems:'center',
            backgroundColor: value===k ? (c||theme.accent) : theme.solid2,
            borderWidth:1, borderColor: value===k ? (c||theme.accent) : theme.border }}>
          <Text style={{ fontSize:13, fontWeight:'600', color: value===k ? '#fff' : theme.text2 }}>{lbl}</Text>
        </Pressable>
      ))}
    </View>
  );

  const apply = () => {
    const pending = parseTags(draft).filter(t => !tags.includes(t));
    onSet({
      ease:     track.ease     ? ease                 : 0,
      mood:     track.mood     ? mood                 : '',
      energy:   track.energy   ? energy               : '',
      duration: track.duration ? Number(dur)||0       : 0,
      trigger:  track.trigger  ? trigger.trim()       : '',
      resist:   track.resist   ? resist               : '',
      context:  track.context  ? ctx.trim()           : '',
      tags:     track.tags     ? [...tags,...pending] : [],
      notes:    track.notes    ? notes                : '',
    });
  };

  return (
    <Sheet title="Set details" subtitle={`Will be applied on next tap of ${habit.name}`} onClose={onClose}>

      {track.ease !== false && (
        <Field label="Ease">
          <View style={{ flexDirection:'row', gap:6 }}>
            {[1,2,3,4,5].map(n => (
              <Pressable key={n} onPress={() => setEase(ease===n ? 0 : n)}
                style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center',
                  backgroundColor: n<=ease ? 'rgba(245,185,66,0.14)' : theme.solid2,
                  borderWidth:1, borderColor: n<=ease ? 'rgba(245,185,66,0.36)' : theme.border }}>
                <Star size={22} strokeWidth={2} color={n<=ease ? '#f5b942' : theme.muted}
                  fill={n<=ease ? '#f5b942' : 'none'} />
              </Pressable>
            ))}
          </View>
        </Field>
      )}

      {track.duration !== false && (
        <Field label="Duration (min)">
          <TInput value={dur} onChange={setDur} keyboardType="numeric" placeholder="e.g. 20" />
        </Field>
      )}

      {track.resist !== false && (
        <Field label="Outcome">
          <PickRow
            items={[['no','Gave in',theme.typeSt],['partial','Partial','#f59e0b'],['yes','Resisted',theme.typeGo]]}
            value={resist} onChange={setResist} />
        </Field>
      )}

      {track.trigger !== false && (
        <Field label="Trigger">
          <TInput value={trigger} onChange={setTrig} placeholder="e.g. stress, boredom" />
        </Field>
      )}

      {track.context !== false && (
        <Field label="Context">
          <TInput value={ctx} onChange={setCtx} placeholder="e.g. with coffee, at work" />
        </Field>
      )}

      {track.mood !== false && (
        <Field label="Mood">
          <PickRow items={MOOD_OPTS.map(m=>[m,m])} value={mood} onChange={setMood} />
        </Field>
      )}

      {track.energy !== false && (
        <Field label="Energy">
          <PickRow items={ENERGY_OPTS.map(m=>[m,m])} value={energy} onChange={setEnergy} />
        </Field>
      )}

      {track.tags !== false && (
        <Field label={
          <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
            <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
              letterSpacing:0.5, textTransform:'uppercase' }}>Tags</Text>
            <Text style={{ fontSize:10, color:theme.muted }}>— comma separated</Text>
          </View>
        }>
          <View style={{ backgroundColor:theme.solid2, borderRadius:12, borderWidth:1,
            borderColor:theme.border, padding:10, flexDirection:'row', flexWrap:'wrap',
            gap:5, alignItems:'center', minHeight:46 }}>
            {tags.map(t => (
              <View key={t} style={{ flexDirection:'row', alignItems:'center', gap:4,
                paddingLeft:10, paddingRight:6, paddingVertical:5, borderRadius:9,
                backgroundColor:theme.accentDim }}>
                <Text style={{ color:theme.accent, fontSize:13, fontWeight:'600' }}>{t}</Text>
                <Pressable onPress={() => setTags(p => p.filter(x => x!==t))}>
                  <X size={13} strokeWidth={2} color={theme.accent} />
                </Pressable>
              </View>
            ))}
            <TextInput value={draft} onChangeText={onTagChange}
              onSubmitEditing={() => commitDraft()} onBlur={() => commitDraft()}
              placeholder={tags.length ? '' : 'morning, work…'}
              placeholderTextColor={theme.muted}
              style={{ flex:1, minWidth:80, color:theme.text, fontSize:14, padding:2 }}
              returnKeyType="done" />
          </View>
          {suggested.length > 0 && (
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {suggested.map(t => (
                <Pressable key={t} onPress={() => setTags(p => [...p, t])}
                  style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:14,
                    backgroundColor:theme.accentDim, borderWidth:1, borderColor:theme.accentBorder }}>
                  <Text style={{ color:theme.accent, fontSize:12, fontWeight:'600' }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Field>
      )}

      {track.notes !== false && (
        <Field label="Notes">
          <TInput value={notes} onChange={setNotes} placeholder="anything else…" multiline />
        </Field>
      )}

      <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
        <Btn label="Cancel" onPress={onClose} />
        <Btn label="Set Details" onPress={apply} primary />
      </View>
    </Sheet>
  );
}
