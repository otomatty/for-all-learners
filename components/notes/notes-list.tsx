"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface NotesListProps {
  notes: any[]
}

export function NotesList({ notes }: NotesListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 border rounded-lg">
        <p className="text-muted-foreground">ノートがありません</p>
        <p className="text-sm text-muted-foreground">「新規ノート」ボタンからノートを作成してください</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="h-full overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-1">{note.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">{note.description || "説明なし"}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: ja })}に更新
              </div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
