import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { List, Grid, Flame, Clock } from '../components/Icon.js';
import { useApp } from '../context/AppContext.js';
import { LiquidGlassView, isLiquidGlassSupported } from '../lib/liquidGlass.js';
import GlassCard from '../components/GlassCard.js';
import { totalCountFor, streakFor, todayCountFor, daysSinceLastFor, dailyCountsFor, lastLog } from '../lib/stats.js';
import { TYPE_COLORS, TYPE_LABELS } from '../lib/theme.js';
import { FONTS } from '../lib/fonts.js';

function Filters({ habits, category, setCategory, types, setTypes }) {
  const { theme } = useApp();
  const d = theme.isDark;
  const glassChips = theme.glassChipsOn && isLiquidGlassSupported && LiquidGlassView;
  const cats = useMemo(() => [...new Set(habits.map(h => h.category).filter(Boolean))], [habits]);
  const TC = { go: theme.typeGo, st: theme.typeSt, ne: theme.typeNe };
  const chip = (label, active, color, onPress) => {
    if (glassChips) {
      return (
        <View key={label} style={{ marginRight: 6, overflow: 'visible' }}>
          <LiquidGlassView
            style={{ borderRadius: 20 }}
            tintColor={active ? (color || theme.accent) : undefined}
            colorScheme={d ? 'dark' : 'light'}
          >
            <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#fff' : theme.text2 }}>
                {label}
              </Text>
            </Pressable>
          </LiquidGlassView>
        </View>
      );
    }
    return (
      <View key={label} style={{ marginRight:6, overflow:'visible' }}>
        <Pressable onPress={onPress}
          style={{
            paddingHorizontal:14, paddingVertical:7, borderRadius:20,
            backgroundColor: active ? (color || theme.accent) : theme.solid2,
            borderWidth: 1,
            borderColor: active ? (color || theme.accent) : theme.border,
            ...(active ? {
              shadowColor: color || theme.accent,
              shadowOffset: { width:0, height:0 },
              shadowOpacity: d ? 0.55 : 0.28,
              shadowRadius: 10,
            } : {}),
            elevation: 0,
          }}>
          <Text style={{ fontSize:14, fontWeight:'600', color: active ? '#fff' : theme.text2 }}>
            {label}
          </Text>
        </Pressable>
      </View>
    );
  };
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
          chip(lbl, types.includes(t), TC[t], () => {
            const next = types.includes(t) ? types.filter(x => x !== t) : [...types, t];
            if (next.length > 0) setTypes(next);
          })
        )}
      </ScrollView>
    </View>
  );
}

const HabitCard = React.memo(function HabitCard({ habit, onPress, onLong, viewMode, compact }) {
  const { theme, data } = useApp();
  const showIds = data?.prefs?.dev?.showIds;
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

  // Shared stripe style — sits OUTSIDE GlassCard so its shadow can escape overflow:hidden
  const stripe = (top, bottom, width = 3.5) => ({
    position:'absolute', left:0, top, bottom, width,
    borderRadius:3, backgroundColor:tc, zIndex:2,
    shadowColor:tc, shadowOffset:{width:0,height:0},
    shadowOpacity: theme.isDark ? 0.80 : 0.45, shadowRadius:8,
  });

  if (isGrid) {
    return (
      <Pressable onPress={() => onPress(habit)} onLongPress={() => onLong(habit)} delayLongPress={400}
        style={({ pressed }) => ({ flex:1, opacity: pressed ? 0.90 : 1, transform:[{scale: pressed ? 0.97 : 1}] })}>
        <View style={{ flex:1 }}>
          <View style={stripe('12%','12%')} />
          <GlassCard style={{ padding:14, paddingLeft:16, flex:1 }} radius={20} variant="card" glow={tc}>
            <Text style={{ fontSize:15, fontWeight:'700', color:theme.text, marginBottom:6 }} numberOfLines={2}>{habit.name}</Text>
            <Text style={{ fontSize:36, fontWeight:'800', color:today>0?tc:theme.muted, letterSpacing:-2, marginBottom:8 }}>{today}</Text>
            {!compact && (
              <View style={{ flexDirection:'row', alignItems:'flex-end', height:28, gap:1, marginBottom:6 }}>
                {sparks.map((s,i)=>(
                  <View key={i} style={{ flex:1, height:Math.max(2,(s.count/maxSp)*28), borderRadius:2, backgroundColor:s.count>0?tc:theme.solid3 }}/>
                ))}
              </View>
            )}
            <Text style={{ fontSize:11.5, color:theme.muted }}>{total} taps · {habit.category}</Text>
          </GlassCard>
        </View>
      </Pressable>
    );
  }

  // Compact: name + category, today count, and badge
  if (compact) {
    return (
      <Pressable onPress={() => onPress(habit)} onLongPress={() => onLong(habit)} delayLongPress={400}
        style={({ pressed }) => ({ opacity: pressed?0.90:1, transform:[{scale:pressed?0.99:1}] })}>
        <View>
          <View style={stripe('14%','14%',3)} />
          <GlassCard style={{ paddingVertical:14, paddingHorizontal:14, paddingLeft:18 }} radius={18} variant="card" glow={tc}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'600', color:theme.text, letterSpacing:-0.3 }} numberOfLines={1}>{habit.name}</Text>
                {habit.category ? <Text style={{ fontSize:11, color:theme.muted, marginTop:1 }}>{habit.category}</Text> : null}
              </View>
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
                backgroundColor: today>0 ? tc : theme.solid2, borderWidth:1,
                borderColor: today>0 ? tc : theme.border }}>
                <Text style={{ fontSize:12, fontWeight:'700', color: today>0?'#fff':theme.muted }}>
                  {today > 0 ? today : '—'}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </Pressable>
    );
  }

  // Full list card
  return (
    <Pressable onPress={() => onPress(habit)} onLongPress={() => onLong(habit)} delayLongPress={400}
      style={({ pressed }) => ({ opacity: pressed?0.90:1, transform:[{scale:pressed?0.99:1}] })}>
      <View>
        <View style={stripe('15%','15%')} />
        <GlassCard style={{ padding:15, paddingLeft:18 }} radius={22} variant="card" glow={tc}>
          {/* Head row */}
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:6 }}>
            <Text style={{ flex:1, fontSize:16.5, fontWeight:'700', color:theme.text, letterSpacing:-0.02 }} numberOfLines={1}>{habit.name}</Text>
            <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:11,
              backgroundColor: today>0 ? tc : theme.solid2, borderWidth:1,
              borderColor: today>0 ? tc : theme.border }}>
              <Text style={{ fontSize:12, fontWeight:'700', color: today>0?'#fff':theme.muted }}>
                {today > 0 ? `${today} today` : 'tap to log'}
              </Text>
            </View>
          </View>
          {/* Badge row — type chip uses type color; others neutral */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginBottom:9 }}>
            <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:8,
              backgroundColor: tc + '28', borderWidth:1, borderColor: tc + '66' }}>
              <Text style={{ fontSize:11, fontWeight:'700', color:tc }}>{TYPE_LABELS[habit.type]}</Text>
            </View>
            {habit.category ? (
              <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:8,
                backgroundColor:theme.solid2, borderWidth:1, borderColor:theme.border }}>
                <Text style={{ fontSize:11, fontWeight:'600', color:theme.text2 }}>{habit.category}</Text>
              </View>
            ) : null}
            {badgeVal !== null && (
              <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:8, paddingVertical:3, borderRadius:8,
                backgroundColor: tc + '1A', borderWidth:1, borderColor: tc + '44' }}>
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
          {showIds && (
            <Text style={{ fontSize:9, color:theme.muted, marginTop:3, fontFamily:FONTS.mono }}>{habit.id}</Text>
          )}
        </GlassCard>
      </View>
    </Pressable>
  );
});

export default function HomeScreen({ onOpenHabit, onLongPressHabit, onNewHabit }) {
  const { habits: habitsRaw, data, theme, setPrefs } = useApp();
  const insets = useSafeAreaInsets();
  const habits = habitsRaw;
  const prefs  = data?.prefs  || {};
  const [category, setCategory] = useState('');
  const [types,    setTypes]    = useState(['go', 'st', 'ne']);

  const filtered = useMemo(() => {
    let l = habits.filter(h => !h.archived);
    if (category)     l = l.filter(h => h.category === category);
    if (types.length) l = l.filter(h => types.includes(h.type));
    const sort = prefs.habitsSort || 'mostLogged';
    if (sort === 'name') {
      l = [...l].sort((a,b) => a.name.localeCompare(b.name));
    } else if (sort === 'type') {
      const ord = { go:0, st:1, ne:2 };
      l = [...l].sort((a,b) => (ord[a.type]??2) - (ord[b.type]??2));
    } else if (sort === 'recent') {
      l = [...l].sort((a,b) => {
        const ta = lastLog(a)?.ts ?? '';
        const tb = lastLog(b)?.ts ?? '';
        return tb < ta ? -1 : tb > ta ? 1 : 0;
      });
    } else {
      l = [...l].sort((a,b) => totalCountFor(b) - totalCountFor(a));
    }
    return l;
  }, [habits, category, types, prefs.habitsSort]);

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const grid = prefs.viewMode === 'grid';
  const cols = grid ? (isTablet ? 3 : 2) : 1;

  const renderItem = useCallback(({ item }) => {
    if (item._spacer) return <View style={{ flex:1 }} />;
    return (
      <View style={{ flex: grid ? 1 : undefined }}>
        <HabitCard habit={item} onPress={onOpenHabit} onLong={onLongPressHabit}
          viewMode={prefs.viewMode || 'list'} compact={prefs.compact} />
      </View>
    );
  }, [grid, onOpenHabit, onLongPressHabit, prefs.viewMode, prefs.compact]);

  return (
    <View style={{ flex:1, backgroundColor:theme.bg }}>
      <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingTop:insets.top+10, paddingBottom:16 }}>
          <Text style={{ flex:1, fontSize:30, fontWeight:'700', color:theme.text, fontFamily:FONTS.heading, letterSpacing:-0.025 }}>Habits</Text>
          <View style={{ flexDirection:'row', backgroundColor:theme.solid2, borderRadius:12, borderWidth:1, borderColor:theme.border, padding:3, gap:2 }}>
            {[['list',List],['grid',Grid]].map(([id,Icon]) => {
              const active = prefs.viewMode === id;
              return (
              <Pressable key={id} onPress={() => setPrefs({...prefs, viewMode:id})}
                style={{
                  padding:7, borderRadius:9,
                  backgroundColor: active ? theme.solid : 'transparent',
                  borderWidth: active ? 0.5 : 0,
                  borderColor: active ? theme.accentBorder : 'transparent',
                  ...(active ? {
                    shadowColor:theme.accent, shadowOffset:{width:0,height:1},
                    shadowOpacity: theme.isDark ? 0.45 : 0.20, shadowRadius:6, elevation:3,
                  } : {}),
                }}>
                <Icon size={16} strokeWidth={2} color={active ? theme.accent : theme.muted} />
              </Pressable>
              );
            })}
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
          data={grid && filtered.length % cols !== 0 ? [...filtered, ...(cols===3&&filtered.length%3===1?[{id:'__s1__',_spacer:true},{id:'__s2__',_spacer:true}]:[{id:'__spacer__',_spacer:true}])] : filtered}
          key={`${grid?'g':'l'}${cols}`}
          numColumns={cols}
          keyExtractor={h=>h.id}
          contentContainerStyle={{ paddingHorizontal:20, paddingBottom:140, paddingTop:8, gap:10 }}
          columnWrapperStyle={grid?{gap:10}:undefined}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          windowSize={7}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
