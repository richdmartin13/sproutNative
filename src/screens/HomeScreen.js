import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { List, Grid, Flame, Clock } from '../components/Icon.js';
import { useApp } from '../context/AppContext.js';
import GlassCard from '../components/GlassCard.js';
import { totalCountFor, streakFor, todayCountFor, daysSinceLastFor, dailyCountsFor } from '../lib/stats.js';
import { TYPE_COLORS, TYPE_LABELS } from '../lib/theme.js';
import { FONTS } from '../lib/fonts.js';

function Filters({ habits, category, setCategory, types, setTypes }) {
  const { theme } = useApp();
  const cats = useMemo(() => [...new Set(habits.map(h => h.category).filter(Boolean))], [habits]);
  const TC = { go: theme.typeGo, st: theme.typeSt, ne: theme.typeNe };
  const chip = (label, active, color, onPress) => (
    <View key={label} style={{ marginRight:6, overflow:'visible' }}>
      <Pressable onPress={onPress}
        style={{
          paddingHorizontal:14, paddingVertical:7, borderRadius:20,
          backgroundColor: active ? (color || theme.accent) : theme.surface2,
          borderWidth: 1,
          borderColor: active ? (color || theme.accent) : theme.border,
          shadowColor: active ? (color || theme.accent) : 'transparent',
          shadowOffset: { width:0, height:0 },
          shadowOpacity: active ? 0.45 : 0,
          shadowRadius: active ? 8 : 0,
          elevation: 0,
        }}>
        <Text style={{ fontSize:14, fontWeight:'600', color: active ? '#fff' : theme.text2 }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
  return (
    <View style={{ marginBottom: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal: 20, marginBottom: 6 }}
        contentContainerStyle={{ paddingRight: 18, alignItems: 'center' }}>
        {chip('All', !category, null, () => setCategory(''))}
        {cats.map(c => chip(c, category === c, null, () => setCategory(category === c ? '' : c)))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ paddingHorizontal: 18 }}
        contentContainerStyle={{ paddingRight: 18, alignItems: 'center' }}>
        {[['go','Start'],['st','Stop'],['ne','Neutral']].map(([t, lbl]) =>
          chip(lbl, types.includes(t), TC[t], () =>
            setTypes(types.includes(t) ? types.filter(x => x !== t) : [...types, t]))
        )}
      </ScrollView>
    </View>
  );
}

function HabitCard({ habit, onPress, onLong, viewMode, compact }) {
  const { theme } = useApp();
  const tc       = TYPE_COLORS[habit.type] || theme.accent;
  const today    = todayCountFor(habit);
  const total    = totalCountFor(habit);
  const streak   = streakFor(habit);
  const daysSince = daysSinceLastFor(habit);
  const isStop   = habit.type === 'st';
  const days     = viewMode === 'grid' ? 14 : 28;
  const sparks   = dailyCountsFor(habit, days);
  const maxSp    = Math.max(1, ...sparks.map(s => s.count));
  const isGrid   = viewMode === 'grid';

  // Badge shown where streak would be: flame+streak for go/ne, days-since for st
  const badgeVal  = isStop ? (daysSince !== null ? daysSince : null) : (streak > 1 ? streak : null);
  const BadgeIcon = isStop ? null : Flame;
  const badgeTip  = isStop ? 'd free' : '';

  if (isGrid) {
    return (
      <Pressable onPress={() => onPress(habit)} onLongPress={() => onLong(habit)} delayLongPress={400}
        style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.92 : 1 })}>
        <GlassCard style={{ padding: 14, flex:1 }} radius={20} variant="card">
          <View style={{ position:'absolute', left:0, top:'12%', bottom:'12%', width:3.5, borderRadius:3, backgroundColor:tc,
          shadowColor:tc, shadowOffset:{width:0,height:0}, shadowOpacity:0.70, shadowRadius:6, elevation:4 }} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 6 }} numberOfLines={2}>{habit.name}</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: today > 0 ? tc : theme.muted, letterSpacing: -2, marginBottom: 8 }}>{today}</Text>
          {!compact && (
            <View style={{ flexDirection:'row', alignItems:'flex-end', height:28, gap:1, marginBottom:6 }}>
              {sparks.map((s,i)=>(
                <View key={i} style={{ flex:1, height:Math.max(2,(s.count/maxSp)*28), borderRadius:2, backgroundColor:s.count>0?tc:theme.solid3 }}/>
              ))}
            </View>
          )}
          <Text style={{ fontSize: 11.5, color: theme.muted }}>{total} taps · {habit.category}</Text>
        </GlassCard>
      </Pressable>
    );
  }

  // Compact: minimal — just name, today count, and badge
  if (compact) {
    return (
      <Pressable onPress={() => onPress(habit)} onLongPress={() => onLong(habit)} delayLongPress={400}
        style={({ pressed }) => ({ opacity: pressed?0.92:1 })}>
        <GlassCard style={{ paddingVertical:10, paddingHorizontal:14, paddingLeft:18 }} radius={18} variant="card">
          <View style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, borderRadius:3, backgroundColor:tc }} />
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <Text style={{ flex:1, fontSize:15, fontWeight:'600', color:theme.text, letterSpacing:-0.3 }} numberOfLines={1}>{habit.name}</Text>
            {badgeVal !== null && (
              <View style={{ flexDirection:'row', alignItems:'center', gap:2 }}>
                {isStop
                  ? <Clock size={11} strokeWidth={2} color={tc} />
                  : <Flame size={11} strokeWidth={2} color={tc} />}
                <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted }}>
                  {isStop ? `${badgeVal}d` : badgeVal}
                </Text>
              </View>
            )}
            <View style={{ paddingHorizontal:9, paddingVertical:3, borderRadius:9,
              backgroundColor: today>0 ? tc : theme.surface2, borderWidth: today>0?0:1, borderColor:theme.border }}>
              <Text style={{ fontSize:12, fontWeight:'700', color: today>0?'#fff':theme.muted }}>
                {today > 0 ? today : '—'}
              </Text>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    );
  }

  // Full list card
  return (
    <Pressable onPress={() => onPress(habit)} onLongPress={() => onLong(habit)} delayLongPress={400}
      style={({ pressed }) => ({ opacity: pressed?0.92:1 })}>
      <GlassCard style={{ padding:15, paddingLeft:18 }} radius={22} variant="card">
        <View style={{ position:'absolute', left:0, top:'16%', bottom:'16%', width:3.5, borderRadius:3, backgroundColor:tc,
        shadowColor:tc, shadowOffset:{width:0,height:0}, shadowOpacity:0.70, shadowRadius:6, elevation:4 }} />
        {/* Head row */}
        <View style={{ flexDirection:'row', alignItems:'center', marginBottom:6 }}>
          <Text style={{ flex:1, fontSize:16.5, fontWeight:'700', color:theme.text, letterSpacing:-0.02 }} numberOfLines={1}>{habit.name}</Text>
          <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:11,
            backgroundColor: today>0 ? tc : theme.surface2, borderWidth: today>0?0:1, borderColor:theme.border,
            shadowColor: today>0?tc:'transparent', shadowOffset:{width:0,height:0},
            shadowOpacity: today>0?0.45:0, shadowRadius:8, elevation: today>0?4:0 }}>
            <Text style={{ fontSize:12, fontWeight:'700', color: today>0?'#fff':theme.muted }}>
              {today > 0 ? `${today} today` : 'tap to log'}
            </Text>
          </View>
        </View>
        {/* Badge row */}
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginBottom:9 }}>
          <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:theme.surface2, borderWidth:1, borderColor:theme.border }}>
            <Text style={{ fontSize:11, fontWeight:'600', color:tc }}>{TYPE_LABELS[habit.type]}</Text>
          </View>
          {habit.category ? (
            <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:theme.surface2, borderWidth:1, borderColor:theme.border }}>
              <Text style={{ fontSize:11, fontWeight:'600', color:theme.text2 }}>{habit.category}</Text>
            </View>
          ) : null}
          {/* Streak (go/ne) or days-since (st) */}
          {badgeVal !== null && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:theme.surface2, borderWidth:1, borderColor:theme.border }}>
              {isStop
                ? <Clock size={11} strokeWidth={2} color={tc} />
                : <Flame size={11} strokeWidth={2} color={tc} />}
              <Text style={{ fontSize:11, fontWeight:'600', color:theme.text2 }}>
                {isStop ? `${badgeVal}d` : badgeVal}
              </Text>
            </View>
          )}
        </View>
        {/* Spark bars */}
        <View style={{ flexDirection:'row', alignItems:'flex-end', height:22, gap:1.5, marginBottom:5 }}>
          {sparks.map((s,i)=>(
            <View key={i} style={{ flex:1, height:Math.max(2,(s.count/maxSp)*22), borderRadius:2, backgroundColor:s.count>0?tc:theme.solid3 }}/>
          ))}
        </View>
        <Text style={{ fontSize:11.5, color:theme.muted }}>{total} total taps</Text>
      </GlassCard>
    </Pressable>
  );
}

export default function HomeScreen({ onOpenHabit, onLongPressHabit, onNewHabit }) {
  const { data, theme, setPrefs } = useApp();
  const insets = useSafeAreaInsets();
  const habits = data?.habits || [];
  const prefs  = data?.prefs  || {};
  const [category, setCategory] = useState('');
  const [types,    setTypes]    = useState([]);

  const filtered = useMemo(() => {
    let l = habits.slice();
    if (category)    l = l.filter(h => h.category === category);
    if (types.length) l = l.filter(h => types.includes(h.type));
    return l.sort((a,b) => totalCountFor(b) - totalCountFor(a));
  }, [habits, category, types]);

  const grid = prefs.viewMode === 'grid';

  return (
    <View style={{ flex:1, backgroundColor:theme.bg }}>
      <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingTop:insets.top+10, paddingBottom:16 }}>
          <Text style={{ flex:1, fontSize:30, fontWeight:'700', color:theme.text, fontFamily:FONTS.heading, letterSpacing:-0.025 }}>Habits</Text>
          <View style={{ flexDirection:'row', backgroundColor:theme.surface2, borderRadius:12, borderWidth:1, borderColor:theme.border, padding:3, gap:2 }}>
            {[['list',List],['grid',Grid]].map(([id,Icon]) => (
              <Pressable key={id} onPress={() => setPrefs({...prefs, viewMode:id})}
                style={{ padding:7, borderRadius:9, backgroundColor:prefs.viewMode===id?theme.solid:'transparent' }}>
                <Icon size={16} strokeWidth={2} color={prefs.viewMode===id?theme.text:theme.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      <Filters habits={habits} category={category} setCategory={setCategory} types={types} setTypes={setTypes} />

      {filtered.length === 0 ? (
        <GlassCard style={{ margin:20, padding:32, alignItems:'center' }} radius={22}>
          <Text style={{ fontSize:17, fontWeight:'600', color:theme.text, marginBottom:8, fontFamily:FONTS.heading }}>
            {habits.length === 0 ? 'No habits yet' : 'Nothing matches'}
          </Text>
          <Text style={{ fontSize:13, color:theme.muted, textAlign:'center', lineHeight:20 }}>
            {habits.length === 0 ? 'Tap + to add your first habit and start mapping your days.' : 'Try clearing your filters.'}
          </Text>
        </GlassCard>
      ) : (
        <FlatList
          data={grid && filtered.length % 2 === 1 ? [...filtered, {id:'__spacer__', _spacer:true}] : filtered}
          key={grid?'g':'l'}
          numColumns={grid?2:1}
          keyExtractor={h=>h.id}
          contentContainerStyle={{ paddingHorizontal:20, paddingBottom:140, gap:10 }}
          columnWrapperStyle={grid?{gap:10}:undefined}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => {
            if (item._spacer) return <View style={{ flex:1 }} />;
            return (
              <View style={{ flex:grid?1:undefined }}>
                <HabitCard habit={item} onPress={onOpenHabit} onLong={onLongPressHabit}
                  viewMode={prefs.viewMode||'list'} compact={prefs.compact} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
