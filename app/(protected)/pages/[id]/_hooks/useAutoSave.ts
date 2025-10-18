import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

/**
 * Hook to autosave page on editor updates and title changes.
 */
export function useAutoSave(
  editor: Editor | null,
  savePage: () => Promise<void>,
  isDirty: boolean
) {
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstUpdate = useRef(true);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      if (isFirstUpdate.current) {
        isFirstUpdate.current = false;
        return;
      }
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        void savePage();
      }, 2000);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, savePage]);

  useEffect(() => {
    if (!editor || !isDirty) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void savePage();
    }, 2000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editor, isDirty, savePage]);
}
