"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BugIcon,
  GripVertical,
  MoreVertical,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState, useEffect } from "react";

type ReleaseNoteItem = {
  type: "new" | "improvement" | "fix" | "security";
  description: string;
  display_order: number;
};

interface SortableReleaseNoteItemProps {
  item: ReleaseNoteItem;
  onRemove: (id: number) => void;
  onEdit: (item: ReleaseNoteItem) => void;
}

function getTypeAttributes(type: ReleaseNoteItem["type"]) {
  switch (type) {
    case "new":
      return {
        label: "新機能",
        icon: SparklesIcon,
        badgeVariant: "default" as const,
      };
    case "improvement":
      return {
        label: "改善",
        icon: TrendingUpIcon,
        badgeVariant: "secondary" as const,
      };
    case "fix":
      return {
        label: "修正",
        icon: BugIcon,
        badgeVariant: "destructive" as const,
      };
    case "security":
      return {
        label: "セキュリティ",
        icon: ShieldCheckIcon,
        badgeVariant: "outline" as const,
      };
    default:
      return {
        label: type,
        icon: SparklesIcon,
        badgeVariant: "default" as const,
      };
  }
}

export function SortableReleaseNoteItem({
  item,
  onRemove,
  onEdit,
}: SortableReleaseNoteItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.display_order });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const {
    label,
    icon: IconComponent,
    badgeVariant,
  } = getTypeAttributes(item.type);
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<ReleaseNoteItem["type"]>(item.type);
  const [editDescription, setEditDescription] = useState(item.description);
  useEffect(() => {
    setEditType(item.type);
    setEditDescription(item.description);
  }, [item]);
  const handleSave = () => {
    onEdit({ ...item, type: editType, description: editDescription });
    setIsEditing(false);
  };
  const handleCancel = () => {
    setEditType(item.type);
    setEditDescription(item.description);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 mb-2 rounded-md border bg-card text-card-foreground shadow-sm flex flex-col space-y-2"
    >
      <div className="flex items-center">
        <GripVertical
          {...listeners}
          {...attributes}
          className="cursor-grab text-gray-500"
        />
        <div className="flex-1 flex items-center gap-2 ml-2">
          {isEditing ? (
            <select
              value={editType}
              onChange={(e) =>
                setEditType(e.target.value as ReleaseNoteItem["type"])
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="new">新機能</option>
              <option value="improvement">改善</option>
              <option value="fix">修正</option>
              <option value="security">セキュリティ</option>
            </select>
          ) : (
            <Badge variant={badgeVariant} className="mb-1.5 text-xs">
              <IconComponent className="h-3.5 w-3.5 mr-1.5" />
              {label}
            </Badge>
          )}
          {isEditing ? (
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              {isEditing ? (
                <>
                  <DropdownMenuItem onClick={handleSave}>保存</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCancel}>
                    キャンセル
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRemove(item.display_order)}
                    variant="destructive"
                  >
                    削除
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
