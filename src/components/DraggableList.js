import React from 'react';
import { View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

// Drag-to-reorder list built on react-native-draggable-flatlist.
// renderRow receives (item, drag) — call drag() from onPressIn on the grip handle.
export function DraggableList({ data, keyFn, renderRow, onReorder, onDragStart, onDragEnd }) {
  return (
    <DraggableFlatList
      data={data}
      keyExtractor={keyFn}
      onDragBegin={onDragStart}
      onDragEnd={({ data: reordered }) => {
        onDragEnd?.();
        onReorder(reordered);
      }}
      renderItem={({ item, drag, isActive }) => (
        <ScaleDecorator activeScale={1.03}>
          <View style={{ opacity: isActive ? 0.85 : 1 }}>
            {renderRow(item, drag)}
          </View>
        </ScaleDecorator>
      )}
      activationDistance={4}
      scrollEnabled={false}
    />
  );
}
