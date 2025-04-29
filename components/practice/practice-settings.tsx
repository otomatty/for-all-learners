"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface PracticeSettingsProps {
  deckId: string
  cardCount: number
}

export function PracticeSettings({ deckId, cardCount }: PracticeSettingsProps) {
  const router = useRouter()
  const [mode, setMode] = useState("all")
  const [answerType, setAnswerType] = useState("flashcard")

  const startPractice = () => {
    router.push(`/practice/session?deckId=${deckId}&mode=${mode}&answerType=${answerType}`)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>練習モード</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={mode} onValueChange={setMode} className="space-y-4">
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="all" id="all" />
              <div className="grid gap-1.5">
                <Label htmlFor="all" className="font-medium">
                  すべてのカード
                </Label>
                <p className="text-sm text-muted-foreground">デッキ内のすべてのカードを練習します（{cardCount}枚）</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="review" id="review" />
              <div className="grid gap-1.5">
                <Label htmlFor="review" className="font-medium">
                  復習が必要なカード
                </Label>
                <p className="text-sm text-muted-foreground">復習が必要なカードのみを練習します</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>回答形式</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={answerType} onValueChange={setAnswerType} className="space-y-4">
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="flashcard" id="flashcard" />
              <div className="grid gap-1.5">
                <Label htmlFor="flashcard" className="font-medium">
                  フラッシュカード
                </Label>
                <p className="text-sm text-muted-foreground">カードをめくって答えを確認します</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="multiple-choice" id="multiple-choice" />
              <div className="grid gap-1.5">
                <Label htmlFor="multiple-choice" className="font-medium">
                  4択問題
                </Label>
                <p className="text-sm text-muted-foreground">4つの選択肢から正解を選びます</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="fill-in-blank" id="fill-in-blank" />
              <div className="grid gap-1.5">
                <Label htmlFor="fill-in-blank" className="font-medium">
                  穴埋め問題
                </Label>
                <p className="text-sm text-muted-foreground">空欄に適切な言葉を入力します</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="free-response" id="free-response" />
              <div className="grid gap-1.5">
                <Label htmlFor="free-response" className="font-medium">
                  自由記述
                </Label>
                <p className="text-sm text-muted-foreground">自分の言葉で回答を入力します</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => router.push(`/decks/${deckId}`)}>
            キャンセル
          </Button>
          <Button onClick={startPractice}>練習を開始する</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
