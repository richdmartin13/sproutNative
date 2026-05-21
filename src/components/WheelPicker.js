import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useApp } from '../context/AppContext.js';

const ITEM_H = 44;
const VISIBLE = 5; // items shown; selected is the middle one

export function WheelColumn({ items, value, onChange, width = 80, fmt = x => String(x) }) {
  const { theme } = useApp();
  const ref = useRef(null);
  const idx = items.indexOf(value);

  // Scroll to selected item without animation on mount / external value change
  useEffect(() => {
    if (ref.current && idx >= 0) {
      ref.current.scrollTo({ y: idx * ITEM_H, animated: false });
    }
  }, [value]);

  const onMomentumEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    if (items[clamped] !== value) onChange(items[clamped]);
  }, [items, value, onChange]);

  const onScrollEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(i, items.length - 1));
    if (items[clamped] !== value) onChange(items[clamped]);
  }, [items, value, onChange]);

  return (
    <View style={{ width, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      {/* Selection band */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: ITEM_H * 2, height: ITEM_H,
        left: 0, right: 0,
        borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: theme.accent + '88',
        backgroundColor: theme.accent + '11',
        zIndex: 1,
      }} />
      {/* Fade edges */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2,
        backgroundColor: theme.bg, opacity: 0.72, zIndex: 2,
      }} />
      <View pointerEvents="none" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2,
        backgroundColor: theme.bg, opacity: 0.72, zIndex: 2,
      }} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {items.map((item, i) => (
          <Pressable key={i} onPress={() => {
            onChange(item);
            ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
          }}
            style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{
              fontSize: 18,
              fontWeight: item === value ? '600' : '400',
              color: item === value ? theme.text : theme.muted,
            }}>
              {fmt(item)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Convenience: pick a date ────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function range(from, to) {
  const out = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

export function DateWheelPicker({ dateVal, onDateChange }) {
  const { theme } = useApp();
  const [y, m, d] = dateVal.split('-').map(Number);

  const months = range(1, 12);
  const years  = range(new Date().getFullYear() - 5, new Date().getFullYear());
  const days   = range(1, daysInMonth(m, y));

  const setM = (newM) => {
    const maxD = daysInMonth(newM, y);
    onDateChange(`${y}-${String(newM).padStart(2,'0')}-${String(Math.min(d, maxD)).padStart(2,'0')}`);
  };
  const setD = (newD) => {
    onDateChange(`${y}-${String(m).padStart(2,'0')}-${String(newD).padStart(2,'0')}`);
  };
  const setY = (newY) => {
    const maxD = daysInMonth(m, newY);
    onDateChange(`${newY}-${String(m).padStart(2,'0')}-${String(Math.min(d, maxD)).padStart(2,'0')}`);
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 }}>
      <WheelColumn items={months} value={m} onChange={setM} width={60} fmt={v => MONTH_NAMES[v-1]} />
      <WheelColumn items={days}   value={d} onChange={setD} width={48} fmt={v => String(v)} />
      <WheelColumn items={years}  value={y} onChange={setY} width={72} fmt={v => String(v)} />
    </View>
  );
}

// ── Convenience: pick a time ────────────────────────────────────────────────

export function TimeWheelPicker({ timeVal, onTimeChange }) {
  const { theme } = useApp();
  const [hh, mm] = timeVal.split(':').map(Number);
  const isPM  = hh >= 12;
  const h12   = hh % 12 || 12;

  const hours   = range(1, 12);
  const minutes = range(0, 59);
  const ampm    = ['AM', 'PM'];

  const setH = (newH12) => {
    const newHH = isPM ? (newH12 === 12 ? 12 : newH12 + 12) : (newH12 === 12 ? 0 : newH12);
    onTimeChange(`${String(newHH).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
  };
  const setM = (newMM) => {
    onTimeChange(`${String(hh).padStart(2,'0')}:${String(newMM).padStart(2,'0')}`);
  };
  const setAP = (ap) => {
    const newPM = ap === 'PM';
    let newHH = hh;
    if (newPM && hh < 12)  newHH = hh + 12;
    if (!newPM && hh >= 12) newHH = hh - 12;
    onTimeChange(`${String(newHH).padStart(2,'0')}:${String(mm).padStart(2,'0')}`);
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8 }}>
      <WheelColumn items={hours}   value={h12}           onChange={setH} width={52} />
      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.muted, alignSelf: 'center' }}>:</Text>
      <WheelColumn items={minutes} value={mm}            onChange={setM} width={52} fmt={v => String(v).padStart(2,'0')} />
      <WheelColumn items={ampm}    value={isPM?'PM':'AM'} onChange={setAP} width={56} />
    </View>
  );
}
