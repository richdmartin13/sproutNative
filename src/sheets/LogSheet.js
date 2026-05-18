import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Star, X } from '../components/Icon.js';
import Sheet from './Sheet.js';
import { Field, TInput, Btn } from '../components/Themed.js';
import { useApp } from '../context/AppContext.js';
import { MOOD_OPTS, ENERGY_OPTS, parseTags, pad, normLog } from '../lib/util.js';
import { FONTS } from '../lib/fonts.js';

const COMMON_TAGS = [
  'morning','evening','work','home','outdoor','social','solo',
  'stressed','relaxed','motivated','tired','food','coffee',
  'gym','walk','weekend','routine','spontaneous','mindful','distracted',
];

export default function LogSheet({ habit, log, allHabits, onClose, onSave }) {
  const { theme, data } = useApp();
  // track prefs — per-type objects ({go,st,ne}) or plain boolean/undefined
  const rawTrack = data?.prefs?.track || {};
  const ht = habit.type; // 'go' | 'st' | 'ne'
  const tr = (k) => {
    const v = rawTrack[k];
    if (v === false) return false;
    if (typeof v === 'object' && v !== null) return v[ht] !== false;
    return true;
  };
  // Flatten to a simple boolean map for backward-compat references below
  const track = Object.fromEntries(
    ['ease','mood','energy','duration','trigger','resist','context','tags','notes'].map(k => [k, tr(k)])
  );

  const ts0 = log.ts ? new Date(log.ts) : new Date();
  const [dateVal, setDateVal] = useState(ts0.toISOString().slice(0,10));
  const [timeVal, setTimeVal] = useState(`${pad(ts0.getHours())}:${pad(ts0.getMinutes())}`);
  const [ease,    setEase]    = useState(log.ease    || 0);
  const [mood,    setMood]    = useState(log.mood    || '');
  const [energy,  setEnergy]  = useState(log.energy  || '');
  const [dur,     setDur]     = useState(String(log.duration || ''));
  const [trigger, setTrig]    = useState(log.trigger || '');
  const [resist,  setResist]  = useState(log.resist  || (habit.type === 'st' ? 'no' : ''));
  const [ctx,     setCtx]     = useState(log.context || '');
  const [tags,    setTags]    = useState(log.tags    || []);
  const [draft,   setDraft]   = useState('');
  const [notes,   setNotes]   = useState(log.notes   || '');
  const [withH,   setWithH]   = useState(log.withHabits || []);

  const suggested = useMemo(() => {
    const ht = new Set((habit.logs||[]).flatMap(l => l.tags||[]));
    const all = [...ht, ...COMMON_TAGS];
    const seen = new Set();
    return all.filter(t => { if (seen.has(t)||tags.includes(t)) return false; seen.add(t); return true; }).slice(0,12);
  }, [habit.logs, tags]);

  const commitDraft = (d=draft) => {
    parseTags(d).filter(t=>!tags.includes(t)).forEach(t=>setTags(p=>[...p,t]));
    setDraft('');
  };
  const onTagChange = v => { if(v.endsWith(',')){ commitDraft(v.slice(0,-1)); } else setDraft(v); };

  // Button row for picking from a fixed set
  const PickRow = ({ items, value, onChange }) => (
    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
      {items.map(([k,lbl,c]) => (
        <Pressable key={k} onPress={() => onChange(value===k?'':k)}
          style={{ flex:1, minWidth:'28%', paddingVertical:11, paddingHorizontal:8, borderRadius:12, alignItems:'center',
            backgroundColor:value===k?(c||theme.accent):theme.solid2,
            borderWidth:1, borderColor:value===k?(c||theme.accent):theme.border }}>
          <Text style={{ fontSize:13, fontWeight:'600', color:value===k?'#fff':theme.text2 }}>{lbl}</Text>
        </Pressable>
      ))}
    </View>
  );

  const save = () => {
    const pending = parseTags(draft).filter(t=>!tags.includes(t));
    const [hh,mm] = timeVal.split(':').map(Number);
    const [y,mo,d] = dateVal.split('-').map(Number);
    // Respect track prefs when saving — matches web LogDetailsSheet onSubmit
    onSave(normLog({
      ...log,
      date:`${y}-${pad(mo)}-${pad(d)}`,
      ts: new Date(y,mo-1,d,hh||0,mm||0).toISOString(),
      ease:     track.ease     ? ease              : 0,
      mood:     track.mood     ? mood              : '',
      energy:   track.energy   ? energy            : '',
      duration: track.duration ? Number(dur)||0    : 0,
      trigger:  track.trigger  ? trigger.trim()    : '',
      resist:   track.resist   ? resist            : '',
      context:  track.context  ? ctx.trim()        : '',
      tags:     track.tags     ? [...tags,...pending] : [],
      notes:    track.notes    ? notes             : '',
      withHabits: withH,
    }));
  };

  const otherHabits = (allHabits||[]).filter(h=>h.id!==habit.id);

  return (
    <Sheet title="Log details" subtitle={habit.name} onClose={onClose}>
      {/* When */}
      <Field label="When">
        <View style={{ flexDirection:'row', gap:8 }}>
          <View style={{ flex:1 }}><TInput value={dateVal} onChange={setDateVal} /></View>
          <View style={{ flex:1 }}><TInput value={timeVal} onChange={setTimeVal} /></View>
        </View>
      </Field>

      {/* Ease — all habit types if track.ease is on */}
      {track.ease !== false && (
        <Field label="Ease">
          <View style={{ flexDirection:'row', gap:6 }}>
            {[1,2,3,4,5].map(n => (
              <Pressable key={n} onPress={() => setEase(ease===n?0:n)}
                style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center',
                  backgroundColor:n<=ease?'rgba(245,185,66,0.14)':theme.solid2,
                  borderWidth:1, borderColor:n<=ease?'rgba(245,185,66,0.36)':theme.border }}>
                <Star size={22} strokeWidth={2} color={n<=ease?'#f5b942':theme.muted}
                  fill={n<=ease?'#f5b942':'none'} />
              </Pressable>
            ))}
          </View>
        </Field>
      )}

      {/* Duration — all habit types if track.duration is on */}
      {track.duration !== false && (
        <Field label="Duration (min)">
          <TInput value={dur} onChange={setDur} keyboardType="numeric" placeholder="e.g. 20" />
        </Field>
      )}

      {/* Resistance — all habit types if track.resist is on */}
      {track.resist !== false && (
        <Field label="Outcome">
          <PickRow
            items={[['no','Gave in',theme.typeSt],['partial','Partial','#f59e0b'],['yes','Resisted',theme.typeGo]]}
            value={resist} onChange={setResist} />
        </Field>
      )}

      {/* Trigger — all habit types if track.trigger is on */}
      {track.trigger !== false && (
        <Field label="Trigger">
          <TInput value={trigger} onChange={setTrig} placeholder="e.g. stress, boredom" />
        </Field>
      )}

      {/* Context — all habit types if track.context is on */}
      {track.context !== false && (
        <Field label="Context">
          <TInput value={ctx} onChange={setCtx} placeholder="e.g. with coffee, at work" />
        </Field>
      )}

      {/* Mood — all habit types */}
      {track.mood !== false && (
        <Field label="Mood">
          <PickRow items={MOOD_OPTS.map(m=>[m,m])} value={mood} onChange={setMood} />
        </Field>
      )}

      {/* Energy — all habit types */}
      {track.energy !== false && (
        <Field label="Energy">
          <PickRow items={ENERGY_OPTS.map(m=>[m,m])} value={energy} onChange={setEnergy} />
        </Field>
      )}

      {/* Tags */}
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
                paddingLeft:10, paddingRight:6, paddingVertical:5,
                borderRadius:9, backgroundColor:theme.accentDim }}>
                <Text style={{ color:theme.accent, fontSize:13, fontWeight:'600' }}>{t}</Text>
                <Pressable onPress={() => setTags(p=>p.filter(x=>x!==t))}>
                  <X size={13} strokeWidth={2} color={theme.accent} />
                </Pressable>
              </View>
            ))}
            <TextInput value={draft} onChangeText={onTagChange}
              onSubmitEditing={()=>commitDraft()} onBlur={()=>commitDraft()}
              placeholder={tags.length?'':'morning, work…'}
              placeholderTextColor={theme.muted}
              style={{ flex:1, minWidth:80, color:theme.text, fontSize:14, padding:2 }}
              returnKeyType="done" />
          </View>
          {suggested.length>0 && (
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {suggested.map(t => (
                <Pressable key={t} onPress={() => setTags(p=>[...p,t])}
                  style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:14,
                    backgroundColor:theme.accentDim, borderWidth:1, borderColor:theme.accentBorder }}>
                  <Text style={{ color:theme.accent, fontSize:12, fontWeight:'600' }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Field>
      )}

      {/* Along with — other habits */}
      {otherHabits.length>0 && (
        <Field label="Along with">
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
            {otherHabits.map(h => {
              const on = withH.includes(h.id);
              return (
                <Pressable key={h.id} onPress={() => setWithH(p=>on?p.filter(x=>x!==h.id):[...p,h.id])}
                  style={{ paddingHorizontal:12, paddingVertical:7, borderRadius:14,
                    backgroundColor:on?theme.accent:theme.solid2,
                    borderWidth:1, borderColor:on?theme.accent:theme.border }}>
                  <Text style={{ fontSize:13, fontWeight:'600', color:on?'#fff':theme.text2 }}>{h.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      )}

      {/* Notes */}
      {track.notes !== false && (
        <Field label="Notes">
          <TInput value={notes} onChange={setNotes} placeholder="anything else…" multiline />
        </Field>
      )}

      <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
        <Btn label="Cancel" onPress={onClose} />
        <Btn label="Save" onPress={save} primary />
      </View>
    </Sheet>
  );
}
