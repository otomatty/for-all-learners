import { Plugin, PluginKey } from "prosemirror-state";
import tippy, { Instance, Props } from "tippy.js";
import React from "react";
import { createRoot } from "react-dom/client";
import { pagePreviewService } from "@/lib/services/page-preview-service";
import { PageLinkPreviewCard } from "@/components/page-link-preview-card";

// PageLink preview plugin based on Mark
export const pageLinkPreviewMarkPluginKey = new PluginKey(
  "pageLinkPreviewMark"
);

let globalTip: Instance<Props> | null = null;
let globalReactRoot: ReturnType<typeof createRoot> | null = null;
let globalContainer: HTMLElement | null = null;
let currentPageId: string | null = null;
let hidePreviewTimeout: NodeJS.Timeout | null = null;

function ensureContainer() {
  if (!globalContainer) {
    globalContainer = document.createElement("div");
    globalContainer.className = "preview-container";
    globalReactRoot = createRoot(globalContainer);
  }
  return globalContainer;
}

function showPreviewFor(pageId: string, referenceElement: HTMLElement) {
  if (currentPageId === pageId && globalTip) return;
  currentPageId = pageId;
  const container = ensureContainer();
  if (globalReactRoot) {
    globalReactRoot.render(
      React.createElement(PageLinkPreviewCard, {
        preview: null,
        isLoading: true,
        error: undefined,
      })
    );
  }
  if (!globalTip) {
    globalTip = tippy(referenceElement, {
      trigger: "manual",
      interactive: false,
      placement: "top-start",
      arrow: true,
      theme: "light",
      maxWidth: 320,
      content: container,
      animation: false,
      duration: 0,
    });
  } else {
    globalTip.setProps({
      getReferenceClientRect: () => referenceElement.getBoundingClientRect(),
    });
  }
  globalTip.show();
  pagePreviewService
    .getPreview(pageId)
    .then((preview: any) => {
      if (currentPageId === pageId && globalReactRoot) {
        globalReactRoot.render(
          React.createElement(PageLinkPreviewCard, {
            preview,
            isLoading: false,
            error: undefined,
          })
        );
      }
    })
    .catch((error: any) => {
      if (currentPageId === pageId && globalReactRoot) {
        globalReactRoot.render(
          React.createElement(PageLinkPreviewCard, {
            preview: null,
            isLoading: false,
            error:
              error instanceof Error ? error.message : "取得に失敗しました",
          })
        );
      }
    });
}

function hidePreviewDeferred() {
  if (hidePreviewTimeout) clearTimeout(hidePreviewTimeout);
  hidePreviewTimeout = setTimeout(() => {
    if (globalTip) {
      globalTip.hide();
    }
    currentPageId = null;
  }, 200);
}

export const pageLinkPreviewMarkPlugin = new Plugin({
  key: pageLinkPreviewMarkPluginKey,
  props: {
    handleDOMEvents: {
      mouseover(view, event) {
        const target = event.target as HTMLElement;
        if (target.tagName !== "A") return false;
        const pageId = target.getAttribute("data-page-id");
        const stateAttr = target.getAttribute("data-state");
        if (!pageId) return false;
        // pending / missing の場合は詳細フェッチせず簡易表示 (後で拡張可)
        if (stateAttr && (stateAttr === "pending" || stateAttr === "missing"))
          return false;
        // 既存タイマー消去
        if (hidePreviewTimeout) {
          clearTimeout(hidePreviewTimeout);
          hidePreviewTimeout = null;
        }
        const el = target as HTMLElement & { _hoverTimeout?: NodeJS.Timeout };
        if (el._hoverTimeout) clearTimeout(el._hoverTimeout);
        el._hoverTimeout = setTimeout(() => {
          showPreviewFor(pageId, target);
        }, 500);
        return false;
      },
      mouseout(view, event) {
        const target = event.target as HTMLElement;
        if (target.tagName !== "A") return false;
        if ((target as any)._hoverTimeout) {
          clearTimeout((target as any)._hoverTimeout);
          (target as any)._hoverTimeout = undefined;
        }
        hidePreviewDeferred();
        return false;
      },
    },
  },
});
