import { useCallback } from "react";
import { useUndoStore } from "@/lib/store/undo-store";
import { useBoardStore } from "@/lib/store/board-store";
import { broadcastObjectCreate, broadcastObjectUpdate, broadcastObjectDelete } from "@/lib/sync/broadcast";
import type { ClientMessage } from "@/types/messages";
import type { UndoEntry } from "@/types/undo";

type SendFn = (msg: ClientMessage) => void;

export function useUndoRedo(sendMessage: SendFn) {
  const { addObject, updateObject, deleteObject } = useBoardStore();

  const recordAction = useCallback(
    (entry: UndoEntry) => {
      useUndoStore.getState().push(entry);
    },
    []
  );

  const applyInverse = useCallback(
    (entry: UndoEntry) => {
      switch (entry.type) {
        case "create":
          // Undo create = delete
          for (const obj of entry.objects) {
            deleteObject(obj.id);
            broadcastObjectDelete(sendMessage, obj.id);
          }
          break;
        case "delete":
          // Undo delete = re-create
          for (const obj of entry.objects) {
            addObject(obj);
            broadcastObjectCreate(sendMessage, obj);
          }
          break;
        case "update":
          // Undo update = restore before
          for (const obj of entry.before) {
            updateObject(obj);
            broadcastObjectUpdate(sendMessage, obj, false);
          }
          break;
      }
    },
    [sendMessage, addObject, updateObject, deleteObject]
  );

  const applyForward = useCallback(
    (entry: UndoEntry) => {
      switch (entry.type) {
        case "create":
          // Redo create = re-create
          for (const obj of entry.objects) {
            addObject(obj);
            broadcastObjectCreate(sendMessage, obj);
          }
          break;
        case "delete":
          // Redo delete = delete again
          for (const obj of entry.objects) {
            deleteObject(obj.id);
            broadcastObjectDelete(sendMessage, obj.id);
          }
          break;
        case "update":
          // Redo update = restore after
          for (const obj of entry.after) {
            updateObject(obj);
            broadcastObjectUpdate(sendMessage, obj, false);
          }
          break;
      }
    },
    [sendMessage, addObject, updateObject, deleteObject]
  );

  const undo = useCallback(() => {
    const entry = useUndoStore.getState().popUndo();
    if (entry) applyInverse(entry);
  }, [applyInverse]);

  const redo = useCallback(() => {
    const entry = useUndoStore.getState().popRedo();
    if (entry) applyForward(entry);
  }, [applyForward]);

  return { recordAction, undo, redo };
}
