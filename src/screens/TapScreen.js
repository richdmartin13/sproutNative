import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Settings, Undo2, MoreHorizontal, Pencil, Trash2, ArrowRight, Minus, X } from '../components/Icon.js';
import SpiderChart from '../components/SpiderChart.js';
import GlassCard from '../components/GlassCard.js';
import AppModal from '../components/AppModal.js';
import PendingDetailsSheet from '../sheets/PendingDetailsSheet.js';
import { useApp } from '../context/AppContext.js';
import { TYPE_COLORS, TYPE_LABELS } from '../lib/theme.js';
import { todayStr, fmtDateLong, fmtTime, uid, normLog, localISOString } from '../lib/util.js';
import {
  todayCountFor, totalCountFor, streakFor, daysSinceLastFor,
  lastLog, lastLogToday, tagFrequencyForHabit, coOccurrenceFor,
  moodCounts, energyCounts, resistRate, correlationsFor, stopInfluences,
} from '../lib/stats.js';
import { FONTS } from '../lib/fonts.js';

const SPIDER_MODES = [
  { id:'tags',   label:'Tags'   },
  { id:'mood',   label:'Mood'   },
  { id:'energy', label:'Energy' },
  { id:'ease',   label:'Ease'   },
  { id:'co',     label:'Co-habits' },
];

function buildSpiderData(habit, habits, mode, accentColor) {
  if (mode === 'tags') {
    const t = tagFrequencyForHabit(habit).slice(0, 8);
    if (t.length < 3) return null;
    return { axes:t.map(x=>x.tag), layers:[{ label:'Tag uses', color:accentColor, values:t.map(x=>x.count) }] };
  }
  if (mode === 'mood') {
    const m = moodCounts([habit], null);
    const k = ['good','meh','low','stressed','tired','fired up'].filter(k=>m.has(k));
    if (k.length < 3) return null;
    return { axes:k, layers:[{ label:'Mood', color:accentColor, values:k.map(k=>m.get(k)||0) }] };
  }
  if (mode === 'energy') {
    const m = energyCounts([habit], null);
    const k = ['high','medium','low energy'].filter(k=>m.has(k));
    if (k.length < 3) return null;
    return { axes:k, layers:[{ label:'Energy', color:accentColor, values:k.map(k=>m.get(k)||0) }] };
  }
  if (mode === 'ease') {
    if (habit.type === 'st') {
      const r = resistRate(habit);
      if (!r||(r.yes+r.no+r.partial)<3) return null;
      return { axes:['Resisted','Gave in','Partial'], layers:[{ label:'Resistance', color:accentColor, values:[r.yes,r.no,r.partial] }] };
    }
    const by={};
    for (const l of habit.logs) { if(!l.ease) continue; for (const t of(l.tags||[])){by[t]=by[t]||[];by[t].push(l.ease);} }
    const e=Object.entries(by).map(([tag,vals])=>({tag,avg:vals.reduce((s,v)=>s+v,0)/vals.length})).sort((a,b)=>b.avg-a.avg).slice(0,8);
    if (e.length<3) return null;
    return { axes:e.map(x=>x.tag), layers:[{ label:'Avg ease', color:accentColor, values:e.map(x=>x.avg), max:5 }] };
  }
  if (mode === 'co') {
    const co=coOccurrenceFor(habit,habits).slice(0,8);
    if (co.length<3) return null;
    return { axes:co.map(c=>c.habit.name), layers:[{ label:'Co-logged', color:accentColor, values:co.map(c=>c.shared) }] };
  }
  return null;
}

// Pill row matching web LogRow pills
function LogRowNative({ log, habit, onEdit, onDelete }) {
  const { theme } = useApp();
  const [open, setOpen] = useState(false);

  const pills = [];
  if (habit.type === 'go') {
    if (log.ease > 0) pills.push({ text:`${log.ease}★`, color:theme.text2 });
    if (log.mood)     pills.push({ text:log.mood, color:theme.text2 });
    if (log.energy)   pills.push({ text:log.energy, color:theme.text2 });
    if (log.duration > 0) pills.push({ text:`${log.duration}m`, color:theme.text2 });
  } else if (habit.type === 'st') {
    if (log.resist === 'yes' || log.resist === 'watch') pills.push({ text:'Resisted', color:theme.typeGo });
    else if (log.resist === 'partial')                  pills.push({ text:'Partial', color:'#f59e0b' });
    else                                                pills.push({ text:'Gave In', color:theme.typeSt });
    if (log.trigger)  pills.push({ text:`trig: ${log.trigger}`, color:theme.text2 });
    if (log.mood)     pills.push({ text:log.mood, color:theme.text2 });
    if (log.energy)   pills.push({ text:log.energy, color:theme.text2 });
  } else if (habit.type === 'ne') {
    if (log.context)  pills.push({ text:log.context, color:theme.text2 });
    if (log.mood)     pills.push({ text:log.mood, color:theme.text2 });
  }

  return (
    <Pressable onPress={() => setOpen(o=>!o)} style={{ marginBottom:6 }}>
      <GlassCard style={{ paddingVertical:10, paddingHorizontal:12 }} radius={12} variant="flat">
      {/* Top row: time */}
      <Text style={{ fontSize:13, fontWeight:'600', color:theme.text, fontFamily:FONTS.mono }}>
        {fmtTime(log.ts)}
      </Text>
      {/* Attribute pills */}
      {pills.length > 0 && (
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:5 }}>
          {pills.map((p,i)=>(
            <View key={i} style={{ paddingHorizontal:8, paddingVertical:2, borderRadius:8,
              backgroundColor:theme.solid3, borderWidth:1, borderColor:theme.border }}>
              <Text style={{ fontSize:11, color:p.color, fontWeight:'500' }}>{p.text}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Tags */}
      {log.tags?.length > 0 && (
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:5 }}>
          {(log.tags||[]).map(t=>(
            <View key={t} style={{ paddingHorizontal:8, paddingVertical:2, borderRadius:8,
              backgroundColor:theme.accentDim, borderWidth:1, borderColor:theme.accentBorder }}>
              <Text style={{ fontSize:11, color:theme.accent, fontWeight:'600' }}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
      {log.notes ? (
        <Text style={{ fontSize:12, color:theme.muted, marginTop:5, lineHeight:18 }}>{log.notes}</Text>
      ) : null}
      {/* Actions (revealed on tap) */}
      {open && (
        <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
          <Pressable onPress={()=>onEdit(log)}
            style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
              gap:6, padding:8, borderRadius:10, backgroundColor:theme.solid3,
              borderWidth:1, borderColor:theme.border }}>
            <Pencil size={15} strokeWidth={2} color={theme.text2} />
            <Text style={{ fontSize:12, fontWeight:'600', color:theme.text2 }}>Edit</Text>
          </Pressable>
          <Pressable onPress={()=>onDelete(log)}
            style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
              gap:6, padding:8, borderRadius:10,
              backgroundColor:'rgba(251,113,133,0.10)', borderWidth:1,
              borderColor:'rgba(251,113,133,0.25)' }}>
            <Trash2 size={15} strokeWidth={2} color={theme.typeSt} />
            <Text style={{ fontSize:12, fontWeight:'600', color:theme.typeSt }}>Delete</Text>
          </Pressable>
        </View>
      )}
      </GlassCard>
    </Pressable>
  );
}

export default function TapScreen({ habit, habits, onBack, onLog, onNewLog, onEditLog, onDeleteLog, onOptions }) {
  const { theme, data } = useApp();
  const insets = useSafeAreaInsets();
  const prefs     = data?.prefs || {};
  const tc        = TYPE_COLORS[habit.type] || theme.accent;
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const countScale = useRef(new Animated.Value(1)).current;
  const [spiderMode,      setSpiderMode]      = useState('tags');
  const [tapAlert,        setTapAlert]        = useState(null);
  const [pendingDetails,  setPendingDetails]  = useState(null);
  const [showDetailsSheet,setShowDetailsSheet] = useState(false);

  const todayCount = todayCountFor(habit);
  const total      = totalCountFor(habit);
  const streak     = streakFor(habit);
  const daysSince  = daysSinceLastFor(habit);

  const sortedLogs    = useMemo(()=>[...habit.logs].sort((a,b)=>a.ts<b.ts?1:-1),[habit.logs]);
  const spiderData    = useMemo(()=>buildSpiderData(habit,habits,spiderMode,theme.accent),[habit,habits,spiderMode,theme.accent]);
  // Regular lift-based correlations (go/neutral focal habits)
  const liftConns     = useMemo(()=>correlationsFor(habit, habits).slice(0,4),[habit,habits]);
  // Count-based stop-habit influences (works for high-frequency vices too)
  const allInfluences = useMemo(()=>stopInfluences(habits),[habits]);
  const stopConns     = useMemo(()=>{
    if (habit.type === 'st') {
      // When viewing a stop habit: what other habits reduce/increase it?
      return allInfluences.filter(r => r.b.id === habit.id).slice(0, 4);
    }
    // When viewing a go/neutral habit: what stop habits does it influence?
    return allInfluences.filter(r => r.a.id === habit.id).slice(0, 3);
  },[allInfluences, habit]);
  const showConnections = liftConns.length > 0 || stopConns.length > 0;

  const middleLabel = habit.type==='st' ? 'Days Since' : 'Streak';
  const middleValue = habit.type==='st' ? (daysSince===null?'—':`${daysSince}`) : (streak||'—');

  const doTap = useCallback(async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
    Animated.sequence([
      Animated.timing(scaleAnim,  { toValue:0.93, duration:45, useNativeDriver:true }),
      Animated.spring(scaleAnim,  { toValue:1, tension:380, friction:14, useNativeDriver:true }),
    ]).start();
    Animated.sequence([
      Animated.timing(countScale, { toValue:1.14, duration:100, useNativeDriver:true }),
      Animated.spring(countScale, { toValue:1, tension:380, friction:14, useNativeDriver:true }),
    ]).start();

    const now = new Date();
    let log = { id:uid('l'), date:todayStr(), ts:localISOString(now), tags:[], withHabits:[] };
    if (pendingDetails) {
      const { tags: dTags = [], ...rest } = pendingDetails;
      log = { ...log, ...rest, tags: [...dTags] };
      if (prefs.autoClearDetails) setPendingDetails(null);
    } else if (prefs.repeatLastMoodEnergy) {
      const last = lastLog(habit);
      if (last) { if(last.mood) log.mood=last.mood; if(last.energy) log.energy=last.energy; }
    }
    if (prefs.autoTagRecentHabits && habits) {
      const FIVE=5*60*1000;
      const recent=(habits||[]).filter(h=>h.id!==habit.id).filter(h=>h.logs.some(l=>l.ts&&(now-new Date(l.ts))<FIVE)).map(h=>h.name.toLowerCase().trim().slice(0,30));
      if (recent.length) { const ex=new Set(log.tags||[]); log.tags=[...ex,...recent.filter(t=>!ex.has(t))]; }
    }
    if (habit.type==='st'&&!log.resist) log.resist='no';
    onLog(habit.id, normLog(log));
  }, [habit,habits,prefs,onLog,scaleAnim,countScale,pendingDetails]);

  const doUndo = useCallback(async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    const tl=habit.logs.filter(l=>l.date===todayStr()).sort((a,b)=>a.ts<b.ts?1:-1);
    if (!tl.length) { setTapAlert({ title:'Nothing to undo', message:'No taps logged today.', buttons:[{ text:'OK', onPress:()=>setTapAlert(null) }] }); return; }
    onDeleteLog(habit.id, tl[0].id);
  }, [habit.logs,onDeleteLog,habit.id]);

  const doDetails = useCallback(() => {
    setShowDetailsSheet(true);
  }, []);

  const SPIDER_PLACEHOLDER_HINTS = {
    tags:'Log with tags to see your tag pattern here.',
    mood:'Log with mood tracked to see your mood profile here.',
    energy:'Log with energy tracked to see your energy pattern here.',
    ease: habit.type==='st'?'Log stop-habit outcomes to see resistance breakdown here.':'Log with ease ratings + tags to see ease-by-tag here.',
    co:'Log alongside other habits to see co-occurrence here.',
  };

  return (
    <View style={{ flex:1, backgroundColor:theme.bg }}>
        {/* Topbar */}
      <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:insets.top+10, paddingBottom:16 }}>
          <Pressable onPress={onBack}
            style={{ width:36, height:36, borderRadius:11, backgroundColor:theme.surface2,
              borderWidth:1, borderColor:theme.border, alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={20} strokeWidth={2} color={theme.text2} />
          </Pressable>
          <Text style={{ flex:1, fontSize:20, fontWeight:'700', color:theme.text,
            letterSpacing:-0.025, paddingHorizontal:12 }} numberOfLines={1}>
            {habit.name}
          </Text>
          <Pressable onPress={onOptions}
            style={{ width:36, height:36, borderRadius:11, backgroundColor:theme.surface2,
              borderWidth:1, borderColor:theme.border, alignItems:'center', justifyContent:'center' }}>
            <Settings size={18} strokeWidth={2} color={theme.text2} />
          </Pressable>
        </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:140, gap:12 }}
        showsVerticalScrollIndicator={false}>
        {/* Stats row — matches web stat-card grid */}
        <View style={{ flexDirection:'row', gap:10 }}>
          {[['Today',todayCount],[middleLabel,middleValue],['All Time',total]].map(([lbl,val])=>(
            <GlassCard key={lbl} style={{ flex:1, padding:14, alignItems:'center' }} radius={18} variant="flat">
              <Text style={{ fontSize:10, fontWeight:'600', color:theme.muted,
                letterSpacing:0.06, textTransform:'uppercase', marginBottom:4 }}>{lbl}</Text>
              <Text style={{ fontSize:26, fontWeight:'700', color:theme.text,
                letterSpacing:-0.03 }}>{val}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Tap zone — matches web .tapzone exactly */}
        <Animated.View style={{ transform:[{scale:scaleAnim}] }}>
          <Pressable onPress={doTap}
            style={({ pressed }) => ({ opacity: pressed ? 0.90 : 1 })}>
            <View style={{
              paddingVertical:40, paddingHorizontal:24, alignItems:'center',
              borderRadius:28, borderWidth:2, borderColor:tc,
              backgroundColor:theme.solid,
              ...(theme.shadowsOn ? { shadowColor:tc, shadowOffset:{width:0,height:0}, shadowOpacity: theme.isDark ? 0.45 : 0.22, shadowRadius:20, elevation:10 } : {}),
            }}>
              <Text style={{ fontSize:13, fontWeight:'700', color:pendingDetails ? tc : theme.muted,
                letterSpacing:0.2, textTransform:'uppercase' }}>
                {pendingDetails ? 'Tap to log with details' : 'Tap to log'}
              </Text>
              <Animated.Text style={{ fontSize:84, fontWeight:'800', color:tc,
                letterSpacing:-0.06, lineHeight:96, marginVertical:14,
                transform:[{scale:countScale}] }}>
                {todayCount}
              </Animated.Text>
              <Text style={{ fontSize:12, fontWeight:'500', color:theme.text2 }}>
                taps today
              </Text>
              <Text style={{ fontSize:11, color:theme.muted, marginTop:8 }}>
                {fmtDateLong(todayStr())}
              </Text>
              {/* Pending details preview */}
              {pendingDetails && (() => {
                const pills = [];
                if (pendingDetails.ease > 0)   pills.push(`${pendingDetails.ease}★`);
                if (pendingDetails.mood)        pills.push(pendingDetails.mood);
                if (pendingDetails.energy)      pills.push(pendingDetails.energy);
                if (pendingDetails.duration > 0) pills.push(`${pendingDetails.duration}m`);
                if (pendingDetails.resist === 'yes')     pills.push('Resisted');
                else if (pendingDetails.resist === 'partial') pills.push('Partial');
                (pendingDetails.tags || []).forEach(t => pills.push(`#${t}`));
                return (
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:12,
                    justifyContent:'center', alignItems:'center' }}>
                    {pills.map((p,i) => (
                      <View key={i} style={{ paddingHorizontal:9, paddingVertical:4, borderRadius:10,
                        backgroundColor: tc + '22', borderWidth:1, borderColor: tc + '55' }}>
                        <Text style={{ fontSize:11, fontWeight:'600', color:tc }}>{p}</Text>
                      </View>
                    ))}
                    <Pressable onPress={() => setPendingDetails(null)}
                      style={{ paddingHorizontal:7, paddingVertical:4, borderRadius:10,
                        backgroundColor:theme.solid3, borderWidth:1, borderColor:theme.border }}>
                      <X size={12} strokeWidth={2.5} color={theme.muted} />
                    </Pressable>
                  </View>
                );
              })()}
            </View>
          </Pressable>
        </Animated.View>

        {/* Action row — matches web .actrow */}
        <View style={{ flexDirection:'row', gap:8 }}>
          {[
            { IconComp:Undo2,          label:'Undo',      onPress:doUndo,    off:todayCount===0 },
            { IconComp:MoreHorizontal, label:'+ Details', onPress:doDetails, off:false },
          ].map(({IconComp,label,onPress,off})=>(
            <Pressable key={label} onPress={onPress} disabled={off}
              style={({pressed})=>({ flex:1, opacity:off?0.35:pressed?0.75:1 })}>
              <GlassCard style={{ padding:11, alignItems:'center', gap:4 }} radius={14} variant="flat">
                <IconComp size={19} strokeWidth={2} color={theme.text2} />
                <Text style={{ fontSize:11, fontWeight:'600', color:theme.text2 }}>{label}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>

        {/* Connections — lift-based correlations + count-based stop-habit influences */}
        {showConnections && (
          <GlassCard style={{ padding:16 }} radius={20} glow={tc}>
            <Text style={{ fontSize:13, fontWeight:'700', color:theme.muted,
              textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
              Connections
            </Text>
            {/* Count-based stop influences (most reliable signal) */}
            {stopConns.map(({ a, b, direction, ratio }, idx) => {
              const reduces  = direction === 'reduces';
              const pct      = Math.round(Math.abs(1 - ratio) * 100);
              const color    = reduces ? theme.typeGo : theme.typeSt;
              // Focal is stop? show "OtherHabit reduces/increases this"
              // Focal is go?   show "This reduces/increases StopHabit"
              const other    = habit.type === 'st' ? a : b;
              const typeColor = other.type === 'go' ? theme.typeGo : other.type === 'st' ? theme.typeSt : theme.typeNe;
              return (
                <View key={`si_${a.id}_${b.id}`} style={{
                  flexDirection:'row', alignItems:'center', paddingVertical:9,
                  borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: theme.border,
                }}>
                  {/* Type dot */}
                  <View style={{ width:7, height:7, borderRadius:4, backgroundColor:typeColor, marginRight:8, flexShrink:0 }} />
                  <Text numberOfLines={1} style={{ flex:1, fontSize:13.5, fontWeight:'500', color:theme.text }}>
                    {other.name}
                  </Text>
                  <View style={{ paddingHorizontal:8, paddingVertical:3,
                    borderRadius:8, backgroundColor:color+'22', marginLeft:8 }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color }}>
                      {reduces ? '↓' : '↑'} {pct}%
                    </Text>
                  </View>
                </View>
              );
            })}
            {/* Lift-based co-occurrence / avoidance */}
            {liftConns.map(({ habit: other, rate, polarity }, idx) => {
              const isNeg      = polarity === 'negative';
              const pct        = Math.round(rate * 100);
              const badgeColor = isNeg ? theme.muted : pct >= 75 ? theme.typeGo : pct >= 50 ? theme.accent : theme.muted;
              const iconColor  = isNeg ? theme.muted  : theme.accent;
              const typeColor  = other.type === 'go' ? theme.typeGo : other.type === 'st' ? theme.typeSt : theme.typeNe;
              const baseIdx    = stopConns.length + idx;
              return (
                <View key={other.id} style={{
                  flexDirection:'row', alignItems:'center', paddingVertical:9,
                  borderTopWidth: baseIdx === 0 ? 0 : 1, borderTopColor: theme.border,
                }}>
                  <View style={{ width:7, height:7, borderRadius:4, backgroundColor:typeColor, marginRight:8, flexShrink:0 }} />
                  {isNeg
                    ? <Minus      size={12} strokeWidth={2.5} color={iconColor} style={{ marginRight:6 }} />
                    : <ArrowRight size={12} strokeWidth={2}   color={iconColor} style={{ marginRight:6 }} />
                  }
                  <Text numberOfLines={1} style={{ flex:1, fontSize:13.5, fontWeight:'500', color:theme.text }}>
                    {other.name}
                  </Text>
                  <View style={{ paddingHorizontal:8, paddingVertical:3,
                    borderRadius:8, backgroundColor:badgeColor+'22', marginLeft:8 }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color:badgeColor }}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>
        )}

        {/* Patterns (Spider) — always shown, placeholder when no data */}
        <GlassCard style={{ padding:16 }} radius={20} glow={tc}>
          <Text style={{ fontSize:13, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
            Patterns
          </Text>
          {/* subtabs — matches web .subtabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom:16 }} contentContainerStyle={{ gap:4 }}>
            {SPIDER_MODES.map(m=>(
              <Pressable key={m.id} onPress={()=>setSpiderMode(m.id)}
                style={{ paddingHorizontal:11, paddingVertical:5, borderRadius:9,
                  backgroundColor:spiderMode===m.id?theme.accent:theme.solid3 }}>
                <Text style={{ fontSize:11.5, fontWeight:'600',
                  color:spiderMode===m.id?'#fff':theme.muted }}>
                  {m.id==='ease'&&habit.type==='st'?'Resistance':m.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {spiderData
            ? <SpiderChart axes={spiderData.axes} layers={spiderData.layers} size={240} />
            : <View style={{ alignItems:'center', paddingVertical:16 }}>
                {/* Ghost spider placeholder */}
                <View style={{ width:160, height:140, alignItems:'center', justifyContent:'center', marginBottom:6 }}>
                  <View style={{ width:120, height:120, borderRadius:60, borderWidth:1,
                    borderColor:theme.border, opacity:0.3 }} />
                  <View style={{ position:'absolute', width:80, height:80, borderRadius:40,
                    borderWidth:1, borderColor:theme.border, opacity:0.2 }} />
                  <View style={{ position:'absolute', width:40, height:40, borderRadius:20,
                    borderWidth:1, borderColor:theme.border, opacity:0.15 }} />
                </View>
                <Text style={{ fontSize:12, color:theme.muted, textAlign:'center', lineHeight:18 }}>
                  {SPIDER_PLACEHOLDER_HINTS[spiderMode]||'Log more data to see this chart.'}
                </Text>
              </View>
          }
        </GlassCard>

        {/* Log section — matches web */}
        <GlassCard style={{ padding:16 }} radius={20} glow={tc}>
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12 }}>
            <Text style={{ flex:1, fontSize:13, fontWeight:'700', color:theme.muted,
              textTransform:'uppercase', letterSpacing:0.8 }}>
              Log
            </Text>
            <Text style={{ fontSize:11, color:theme.muted }}>{sortedLogs.length} entries</Text>
          </View>
          {sortedLogs.length === 0
            ? <Text style={{ fontSize:12, color:theme.muted, padding:4 }}>
                No taps yet. Tap the zone above to log one.
              </Text>
            : sortedLogs.slice(0,60).map(l=>(
                <LogRowNative key={l.id} log={l} habit={habit}
                  onEdit={log=>onEditLog(habit,log)}
                  onDelete={log=>{
                    setTapAlert({
                      title:'Delete log',
                      message:'Remove this log entry?',
                      buttons:[
                        { text:'Cancel', style:'cancel', onPress:()=>setTapAlert(null) },
                        { text:'Delete', style:'destructive', onPress:()=>{ onDeleteLog(habit.id,log.id); setTapAlert(null); } },
                      ],
                    });
                  }}
                />
              ))
          }
          {sortedLogs.length > 60 && (
            <Text style={{ fontSize:11, color:theme.muted, textAlign:'center', padding:8 }}>
              Showing 60 of {sortedLogs.length}
            </Text>
          )}
        </GlassCard>
      </ScrollView>

      <AppModal
        visible={!!tapAlert}
        title={tapAlert?.title}
        message={tapAlert?.message}
        buttons={tapAlert?.buttons ?? []}
        onDismiss={() => setTapAlert(null)}
      />

      {showDetailsSheet && (
        <PendingDetailsSheet
          habit={habit}
          initial={pendingDetails || {}}
          onClose={() => setShowDetailsSheet(false)}
          onSet={(details) => { setPendingDetails(details); setShowDetailsSheet(false); }}
        />
      )}
    </View>
  );
}
