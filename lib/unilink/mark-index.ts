/**
 * MarkIndex - エディタ内のUnifiedLinkMarkを効率的に検索・更新
 * P3実装: missing状態のマークをkey別に索引化
 */

import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { UnifiedLinkAttributes } from "../tiptap-extensions/unified-link-mark";

export interface MarkPosition {
  from: number;
  to: number;
  markId: string;
  attrs: UnifiedLinkAttributes;
}

export class MarkIndex {
  private editor: Editor;
  private index = new Map<string, MarkPosition[]>(); // key -> positions
  private lastScanTime = 0;
  private scanThrottleMs = 100; // スキャン頻度制限

  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * エディタ全体をスキャンしてインデックスを再構築
   * 頻繁な呼び出しを防ぐため、スロットル処理を実装
   */
  rebuild(): void {
    const now = Date.now();
    if (now - this.lastScanTime < this.scanThrottleMs) {
      return; // スロットル制限内なのでスキップ
    }

    this.index.clear();
    const { state } = this.editor.view;
    const markType = state.schema.marks.unilink;

    if (!markType) {
      console.warn("[MarkIndex] unilink mark type not found");
      return;
    }

    state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (!node.isText) return;

      node.marks.forEach((mark) => {
        if (mark.type !== markType) return;

        const attrs = mark.attrs as UnifiedLinkAttributes;

        // missing状態のマークのみをインデックス化
        if (attrs.state !== "missing") return;

        const key = attrs.key;
        if (!key) return;

        const position: MarkPosition = {
          from: pos,
          to: pos + node.nodeSize,
          markId: attrs.markId,
          attrs,
        };

        const existing = this.index.get(key);
        if (existing) {
          existing.push(position);
        } else {
          this.index.set(key, [position]);
        }
      });
    });

    this.lastScanTime = now;
    console.log(
      `[MarkIndex] Rebuilt index with ${
        this.index.size
      } unique keys, ${this.getTotalMarks()} total marks`
    );
  }

  /**
   * 指定されたkeyに関連するmissingマークの位置を取得
   */
  getPositionsByKey(key: string): MarkPosition[] {
    return this.index.get(key) || [];
  }

  /**
   * 複数のkeyに関連するmissingマークをまとめて取得
   */
  getPositionsByKeys(keys: string[]): Map<string, MarkPosition[]> {
    const result = new Map<string, MarkPosition[]>();
    keys.forEach((key) => {
      const positions = this.getPositionsByKey(key);
      if (positions.length > 0) {
        result.set(key, positions);
      }
    });
    return result;
  }

  /**
   * 全てのmissing状態のkeyを取得
   */
  getAllKeys(): string[] {
    return Array.from(this.index.keys());
  }

  /**
   * 指定されたkeyのマークをexists状態に更新
   */
  updateToExists(key: string, pageId: string): boolean {
    const positions = this.getPositionsByKey(key);
    if (positions.length === 0) {
      return false;
    }

    const { state, dispatch } = this.editor.view;
    const { tr } = state;
    const markType = state.schema.marks.unilink;
    let changed = false;

    positions.forEach((position) => {
      const newAttrs: UnifiedLinkAttributes = {
        ...position.attrs,
        state: "exists",
        exists: true,
        pageId,
        href: `/pages/${pageId}`,
      };

      try {
        tr.removeMark(position.from, position.to, markType);
        tr.addMark(position.from, position.to, markType.create(newAttrs));
        changed = true;
      } catch (error) {
        console.warn(
          `[MarkIndex] Failed to update mark at ${position.from}-${position.to}:`,
          error
        );
      }
    });

    if (changed && dispatch) {
      dispatch(tr);
      // インデックスから削除（もはやmissingではない）
      this.index.delete(key);
      console.log(
        `[MarkIndex] Updated ${positions.length} marks for key "${key}" to exists`
      );
    }

    return changed;
  }

  /**
   * デバッグ用: インデックス統計
   */
  getStats(): {
    uniqueKeys: number;
    totalMarks: number;
    keys: string[];
  } {
    return {
      uniqueKeys: this.index.size,
      totalMarks: this.getTotalMarks(),
      keys: this.getAllKeys(),
    };
  }

  private getTotalMarks(): number {
    let count = 0;
    this.index.forEach((positions) => {
      count += positions.length;
    });
    return count;
  }

  /**
   * インデックスをクリア
   */
  clear(): void {
    this.index.clear();
    this.lastScanTime = 0;
  }
}
