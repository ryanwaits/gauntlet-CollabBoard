"use client";

import { useRef, useEffect, useCallback } from "react";
import type { BoardObject } from "@/types/board";

interface InlineTextEditorProps {
  object: BoardObject;
  stageScale: number;
  stagePos: { x: number; y: number };
  onSave: (text: string) => void;
  onClose: () => void;
}

export function InlineTextEditor({
  object,
  stageScale,
  stagePos,
  onSave,
  onClose,
}: InlineTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Position in screen space
  const screenX = object.x * stageScale + stagePos.x;
  const screenY = object.y * stageScale + stagePos.y;
  const screenW = object.width * stageScale;
  const screenH = object.height * stageScale;

  // Style based on object type
  const isSticky = object.type === "sticky";
  const isBlock = object.type === "block";
  const isText = object.type === "text";

  const fontSize = isText ? 16 * stageScale : 14 * stageScale;
  const padding = isSticky ? 12 * stageScale : isBlock ? 16 * stageScale : 0;

  // For block, we edit just the title area
  const editY = isBlock ? screenY + 6 * stageScale : screenY;
  const editH = isBlock ? 28 * stageScale : screenH;

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const text = textareaRef.current?.value ?? "";
    onSave(text);
    onClose();
  }, [onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleBlur();
      }
      // Stop propagation to prevent board keyboard handlers
      e.stopPropagation();
    },
    [handleBlur]
  );

  return (
    <textarea
      ref={textareaRef}
      defaultValue={object.text}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="absolute z-50 resize-none border-none outline-none"
      style={{
        left: screenX + padding,
        top: isBlock ? editY + padding : editY + padding,
        width: screenW - padding * 2,
        height: isBlock ? editH : screenH - padding * 2,
        fontSize: Math.max(10, fontSize),
        fontFamily: "Inter, sans-serif",
        lineHeight: 1.4,
        color: "#1f2937",
        backgroundColor: isSticky ? object.color : isBlock ? "white" : "transparent",
        textAlign: isSticky ? "center" : "left",
        borderRadius: isSticky ? 8 * stageScale : isBlock ? 0 : 4 * stageScale,
        overflow: "hidden",
      }}
    />
  );
}
