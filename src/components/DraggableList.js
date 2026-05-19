import React, { useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';

// Drag-to-reorder list using React Native's built-in PanResponder.
// Requires no external packages. Designed for short settings lists (< 20 items)
// where all rows have a consistent height (itemHeight prop).
//
// Usage:
//   <DraggableList
//     data={items}           // array of objects
//     keyFn={item => item.key}
//     renderRow={item => <MyRow item={item} />}
//     onReorder={newItems => ...}  // called with reordered array
//     theme={theme}
//     itemHeight={46}        // approximate px height of each row
//   />
//
// Drag is activated after 8px of vertical movement anywhere on the list.
// The source row dims to 35% opacity; a 2px accent line marks the drop target.

const DEFAULT_ITEM_H = 46;

export function DraggableList({ data, keyFn, renderRow, onReorder, theme, itemHeight = DEFAULT_ITEM_H }) {
  const [dragFrom,    setDragFrom]    = useState(null);
  const [insertBefore, setInsertBefore] = useState(null);

  const containerRef    = useRef(null);
  const containerY      = useRef(0);
  const dragFromRef     = useRef(null);
  const insertRef       = useRef(null);
  const dataRef         = useRef(data);
  dataRef.current = data;

  const measure = () =>
    containerRef.current?.measure((_, __, ___, ____, _x, py) => { containerY.current = py; });

  const toItemIdx   = py => Math.max(0, Math.min(dataRef.current.length - 1,
    Math.round((py - containerY.current) / itemHeight)));
  const toInsertIdx = py => Math.max(0, Math.min(dataRef.current.length,
    Math.round((py - containerY.current) / itemHeight)));

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:  () => false,
    onMoveShouldSetPanResponder:   (_, gs) => Math.abs(gs.dy) > 8,
    onPanResponderGrant: (_, gs) => {
      measure();
      const from = toItemIdx(gs.moveY - gs.dy);
      dragFromRef.current = from;
      insertRef.current   = from;
      setDragFrom(from);
      setInsertBefore(from);
    },
    onPanResponderMove: (e) => {
      const ins = toInsertIdx(e.nativeEvent.pageY);
      if (ins !== insertRef.current) {
        insertRef.current = ins;
        setInsertBefore(ins);
      }
    },
    onPanResponderRelease: () => {
      const from = dragFromRef.current;
      const ins  = insertRef.current;
      if (from !== null && ins !== null) {
        const to = ins > from ? ins - 1 : ins;
        if (to !== from) {
          const next = [...dataRef.current];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          onReorder(next);
        }
      }
      dragFromRef.current = null;
      insertRef.current   = null;
      setDragFrom(null);
      setInsertBefore(null);
    },
    onPanResponderTerminate: () => {
      dragFromRef.current = null;
      insertRef.current   = null;
      setDragFrom(null);
      setInsertBefore(null);
    },
  })).current;

  const line = (
    <View style={{ height: 2, backgroundColor: theme.accent,
      borderRadius: 1, marginHorizontal: 4, marginVertical: 1 }} />
  );

  return (
    <View ref={containerRef} onLayout={measure} {...panResponder.panHandlers}>
      {data.map((item, i) => (
        <View key={keyFn(item)}>
          {dragFrom !== null && insertBefore === i && line}
          <View style={{ opacity: i === dragFrom ? 0.35 : 1 }}>
            {renderRow(item)}
          </View>
        </View>
      ))}
      {dragFrom !== null && insertBefore === data.length && line}
    </View>
  );
}
