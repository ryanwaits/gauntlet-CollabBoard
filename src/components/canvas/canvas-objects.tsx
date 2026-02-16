"use client";

import { StickyNote } from "./sticky-note";
import { RectangleShape } from "./rectangle-shape";
import { BlockShape } from "./block-shape";
import { TextShape } from "./text-shape";
import type { BoardObject } from "@/types/board";

interface CanvasObjectsProps {
  objects: Map<string, BoardObject>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDoubleClick: (obj: BoardObject) => void;
  interactive?: boolean;
  editingId?: string | null;
}

export function CanvasObjects({
  objects,
  selectedId,
  onSelect,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  interactive = true,
  editingId,
}: CanvasObjectsProps) {
  const sorted = Array.from(objects.values()).sort((a, b) => a.z_index - b.z_index);

  return (
    <>
      {sorted.map((obj) => {
        const shared = {
          object: obj,
          isSelected: selectedId === obj.id,
          onSelect: interactive ? () => onSelect(obj.id) : undefined,
          onDragMove: interactive ? (x: number, y: number) => onDragMove(obj.id, x, y) : undefined,
          onDragEnd: interactive ? (x: number, y: number) => onDragEnd(obj.id, x, y) : undefined,
          interactive,
        };

        switch (obj.type) {
          case "sticky":
            return (
              <StickyNote
                key={obj.id}
                {...shared}
                onDoubleClick={interactive ? () => onDoubleClick(obj) : undefined}
                isEditing={editingId === obj.id}
              />
            );
          case "rectangle":
            return <RectangleShape key={obj.id} {...shared} />;
          case "block":
            return (
              <BlockShape
                key={obj.id}
                {...shared}
                onDoubleClick={interactive ? () => onDoubleClick(obj) : undefined}
                isEditing={editingId === obj.id}
              />
            );
          case "text":
            return (
              <TextShape
                key={obj.id}
                {...shared}
                onDoubleClick={interactive ? () => onDoubleClick(obj) : undefined}
                isEditing={editingId === obj.id}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
