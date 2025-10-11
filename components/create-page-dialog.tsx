"use client";

import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { createPage } from "@/app/_actions/pages";
import { toast } from "sonner";
import type { Editor } from "@tiptap/core";

interface CreatePageDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Initial page title */
  initialTitle: string;
  /** Callback when page is successfully created */
  onPageCreated: (pageId: string) => void;
  /** TipTap editor instance for context */
  editor?: Editor;
  /** User ID for page creation */
  userId?: string;
  /** Optional note slug to associate page with */
  noteSlug?: string;
}

interface FormState {
  title: string;
  description: string;
  isPublic: boolean;
  isSubmitting: boolean;
}

export function CreatePageDialog({
  open,
  onOpenChange,
  initialTitle,
  onPageCreated,
  userId,
  noteSlug,
}: CreatePageDialogProps) {
  const [formState, setFormState] = useState<FormState>({
    title: initialTitle,
    description: "",
    isPublic: false,
    isSubmitting: false,
  });

  // Reset form when dialog opens with new title
  useEffect(() => {
    if (open) {
      setFormState({
        title: initialTitle,
        description: "",
        isPublic: false,
        isSubmitting: false,
      });
    }
  }, [open, initialTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.error("ユーザーIDが取得できませんでした");
      return;
    }

    if (!formState.title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // Create page with initial content
      const initialContent = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: formState.title }],
          },
          ...(formState.description
            ? [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: formState.description }],
                },
              ]
            : []),
          {
            type: "paragraph",
            content: [],
          },
        ],
      };

      const newPage = await createPage({
        title: formState.title,
        content_tiptap: initialContent,
        user_id: userId,
        is_public: formState.isPublic,
      });

      if (newPage?.id) {
        toast.success(`ページ「${formState.title}」を作成しました`);
        onPageCreated(newPage.id);
        onOpenChange(false);
      } else {
        throw new Error("Page creation returned no ID");
      }
    } catch (error) {
      console.error("Page creation failed:", error);
      toast.error(
        `ページの作成に失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    } finally {
      setFormState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-md"
      dialogTitle="新しいページを作成"
      dialogDescription={`「${initialTitle}」というページを作成します`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="page-title">タイトル</Label>
          <Input
            id="page-title"
            value={formState.title}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="ページタイトルを入力"
            disabled={formState.isSubmitting}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-description">説明（オプション）</Label>
          <Textarea
            id="page-description"
            value={formState.description}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="ページの概要を入力"
            disabled={formState.isSubmitting}
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="page-public"
            checked={formState.isPublic}
            onCheckedChange={(checked) =>
              setFormState((prev) => ({ ...prev, isPublic: checked }))
            }
            disabled={formState.isSubmitting}
          />
          <Label htmlFor="page-public" className="cursor-pointer">
            公開ページとして作成
          </Label>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={formState.isSubmitting}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "作成中..." : "作成"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
