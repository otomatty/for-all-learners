"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

interface PracticeCardProps {
  card: any
  showAnswer: boolean
  onShowAnswer: () => void
  onAnswer: (isCorrect: boolean) => void
  answerType: string
  userAnswer: string
  setUserAnswer: (answer: string) => void
  isCorrect: boolean | null
}

export function PracticeCard({
  card,
  showAnswer,
  onShowAnswer,
  onAnswer,
  answerType,
  userAnswer,
  setUserAnswer,
  isCorrect,
}: PracticeCardProps) {
  const [options, setOptions] = useState([])

  useEffect(() => {
    if (answerType === "multiple-choice") {
      // 実際の実装では、カードの問題バリエーションから選択肢を取得する
      // ここではモックの実装
      const correctAnswer = card.back_content.split(" ")[0]
      const mockOptions = [correctAnswer, "不正解の選択肢1", "不正解の選択肢2", "不正解の選択肢3"].sort(
        () => 0.5 - Math.random(),
      )

      setOptions(mockOptions)
    }
  }, [card, answerType])

  const renderAnswerInput = () => {
    switch (answerType) {
      case "flashcard":
        return (
          <Button className="w-full" onClick={onShowAnswer} disabled={showAnswer}>
            答えを表示
          </Button>
        )

      case "multiple-choice":
        return (
          <RadioGroup value={userAnswer} onValueChange={setUserAnswer} className="space-y-2" disabled={showAnswer}>
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "fill-in-blank":
        // 実際の実装では、カードの問題バリエーションから穴埋め問題を生成する
        const blankText = card.front_content.replace(/\b\w+\b/, "______")
        return (
          <div className="space-y-4">
            <p>{blankText}</p>
            <Input
              placeholder="答えを入力"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={showAnswer}
            />
          </div>
        )

      case "free-response":
        return (
          <div className="space-y-4">
            <Input
              placeholder="答えを入力"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={showAnswer}
            />
          </div>
        )

      default:
        return null
    }
  }

  const renderAnswerButtons = () => {
    if (answerType === "flashcard" && showAnswer) {
      return (
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => onAnswer(false)}
          >
            <X className="mr-2 h-4 w-4" />
            不正解
          </Button>
          <Button
            variant="outline"
            className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
            onClick={() => onAnswer(true)}
          >
            <Check className="mr-2 h-4 w-4" />
            正解
          </Button>
        </div>
      )
    } else if (answerType !== "flashcard" && !showAnswer) {
      return (
        <Button className="w-full" onClick={onShowAnswer} disabled={!userAnswer}>
          回答する
        </Button>
      )
    }

    return null
  }

  const renderFeedback = () => {
    if (isCorrect === null || answerType === "flashcard") return null

    return (
      <div
        className={`mt-4 p-4 rounded-lg ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
      >
        <div className="flex items-center">
          {isCorrect ? <Check className="h-5 w-5 text-green-500 mr-2" /> : <X className="h-5 w-5 text-red-500 mr-2" />}
          <p className={isCorrect ? "text-green-700" : "text-red-700"}>{isCorrect ? "正解です！" : "不正解です。"}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>問題</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg">
          <p className="whitespace-pre-wrap">{card.front_content}</p>
        </div>

        {renderAnswerInput()}

        {showAnswer && (
          <div className="p-4 border rounded-lg mt-4">
            <h3 className="font-medium mb-2">正解:</h3>
            <p className="whitespace-pre-wrap">{card.back_content}</p>
          </div>
        )}

        {renderFeedback()}
      </CardContent>
      <CardFooter>
        {renderAnswerButtons()}

        {answerType !== "flashcard" && showAnswer && (
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => onAnswer(false)}
            >
              <X className="mr-2 h-4 w-4" />
              不正解
            </Button>
            <Button
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
              onClick={() => onAnswer(true)}
            >
              <Check className="mr-2 h-4 w-4" />
              正解
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
