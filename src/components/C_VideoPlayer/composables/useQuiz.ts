/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 视频内测验弹窗
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, watch, type Ref, type ShallowRef } from 'vue'
import type { PlayerInstance, VideoQuiz } from '../types'

/**
 * 视频内测验 composable
 * - 在指定时间点触发测验弹窗
 * - 暂停视频等待作答
 * - 判断答案是否正确
 * - 支持必须答对才能继续
 */
export function useQuiz(
  playerRef: ShallowRef<PlayerInstance | null>,
  currentTime: Ref<number>,
  quizzes: Ref<VideoQuiz[]>
) {
  /** 当前显示的测验 */
  const activeQuiz = ref<VideoQuiz | null>(null)

  /** 已完成的测验 ID 集合 */
  const completedQuizIds = ref<Set<string>>(new Set())

  /** 当前选中的答案 */
  const selectedAnswer = ref<string | string[]>('')

  /** 是否显示结果反馈 */
  const showResult = ref(false)

  /** 上次作答是否正确 */
  const lastAnswerCorrect = ref(false)

  /** 检查时间容差（秒） */
  const TIME_TOLERANCE = 1

  /** 按内容识别同一道题，父组件重建引用不会抹掉完成记录。 */
  function getQuizIdentity(quiz: VideoQuiz): string {
    return JSON.stringify([
      quiz.id,
      quiz.triggerTime,
      quiz.type,
      quiz.title,
      quiz.options.map(option => [option.key, option.label]),
      Array.isArray(quiz.answer) ? [...quiz.answer].sort() : quiz.answer,
      quiz.required === true,
    ])
  }

  let activeIdentity: string | undefined
  const suppressedQuizIds = new Set<string>()
  let previousIdentities = new Map(
    quizzes.value.map(quiz => [quiz.id, getQuizIdentity(quiz)])
  )

  /** 数据替换只丢弃旧题状态，不擅自恢复播放。 */
  function resetActiveQuiz() {
    activeQuiz.value = null
    activeIdentity = undefined
    selectedAnswer.value = ''
    showResult.value = false
    lastAnswerCorrect.value = false
  }

  /** 检查是否需要触发测验 */
  function checkQuizTrigger() {
    if (activeQuiz.value) return /* 已有测验在显示 */
    if (!quizzes.value.length) return

    const time = currentTime.value
    const quiz = quizzes.value.find(
      q =>
        !completedQuizIds.value.has(q.id) &&
        !suppressedQuizIds.has(q.id) &&
        Math.abs(time - q.triggerTime) < TIME_TOLERANCE
    )

    if (quiz) {
      triggerQuiz(quiz)
    }
  }

  /** 触发测验 */
  function triggerQuiz(quiz: VideoQuiz) {
    activeQuiz.value = quiz
    activeIdentity = getQuizIdentity(quiz)
    selectedAnswer.value = quiz.type === 'multiple' ? [] : ''
    showResult.value = false
    lastAnswerCorrect.value = false

    /* 暂停视频 */
    playerRef.value?.pause()
  }

  /** 提交答案 */
  function submitAnswer(): boolean {
    synchronizeQuizzes()
    if (!activeQuiz.value) return false

    const quiz = activeQuiz.value
    const isCorrect = checkAnswer(quiz, selectedAnswer.value)

    lastAnswerCorrect.value = isCorrect
    showResult.value = true

    if (isCorrect || !quiz.required) {
      /* 答对或非必须题目 -> 标记完成 */
      completedQuizIds.value.add(quiz.id)
    }

    return isCorrect
  }

  /** 关闭测验弹窗并继续播放 */
  function closeQuiz() {
    synchronizeQuizzes()
    if (!activeQuiz.value) return

    const quiz = activeQuiz.value

    /* 必须答对但未答对时，不允许关闭 */
    if (quiz.required && !completedQuizIds.value.has(quiz.id)) {
      return
    }

    resetActiveQuiz()

    /* 恢复播放 */
    playerRef.value?.play()
  }

  /** 重试当前测验 */
  function retryQuiz() {
    synchronizeQuizzes()
    if (!activeQuiz.value) return
    selectedAnswer.value = activeQuiz.value.type === 'multiple' ? [] : ''
    showResult.value = false
    lastAnswerCorrect.value = false
  }

  /** 判断答案是否正确 */
  function checkAnswer(quiz: VideoQuiz, answer: string | string[]): boolean {
    if (quiz.type === 'multiple') {
      const selected = Array.isArray(answer) ? [...answer].sort() : [answer]
      const correct = Array.isArray(quiz.answer)
        ? [...quiz.answer].sort()
        : [quiz.answer]
      return (
        selected.length === correct.length &&
        selected.every((v, i) => v === correct[i])
      )
    }
    return answer === quiz.answer
  }

  /** 监听时间变化检查测验触发 */
  watch(currentTime, () => {
    suppressedQuizIds.clear()
    if (!synchronizeQuizzes()) checkQuizTrigger()
  })

  const getQuizEntries = () =>
    quizzes.value.map(quiz => ({
      quiz,
      identity: getQuizIdentity(quiz),
    }))

  /** 命令执行前也同步身份，不能在合并更新尚未刷新时提交旧答案。 */
  function synchronizeQuizzes(entries = getQuizEntries()): boolean {
    const nextIdentities = new Map(
      entries.map(({ quiz, identity }) => [quiz.id, identity])
    )
    completedQuizIds.value.forEach(id => {
      if (
        !nextIdentities.has(id) ||
        previousIdentities.get(id) !== nextIdentities.get(id)
      ) {
        completedQuizIds.value.delete(id)
      }
    })
    previousIdentities = nextIdentities

    if (activeQuiz.value) {
      const next = entries.find(({ quiz }) => quiz.id === activeQuiz.value!.id)
      if (!next || next.identity !== activeIdentity) {
        suppressedQuizIds.add(activeQuiz.value.id)
        resetActiveQuiz()
        return true
      }
      activeQuiz.value = next.quiz
    }
    return false
  }

  // 合并 reverse/sort 的中间写入，再比较稳定内容；引用重建不丢完成记录。
  watch(getQuizEntries, entries => {
    // 当前没有弹窗时，新配置可以在现有播放位置触发；刚失效的旧题不立即重开。
    if (!synchronizeQuizzes(entries)) checkQuizTrigger()
  })

  return {
    activeQuiz,
    completedQuizIds,
    selectedAnswer,
    showResult,
    lastAnswerCorrect,
    submitAnswer,
    closeQuiz,
    retryQuiz,
  }
}
