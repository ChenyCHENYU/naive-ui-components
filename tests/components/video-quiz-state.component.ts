/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-20
 * @Description: 同一视频的测验配置更新与内容身份隔离回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import { useQuiz } from '../../src/components/C_VideoPlayer/composables/useQuiz'
import type {
  PlayerInstance,
  VideoQuiz,
} from '../../src/components/C_VideoPlayer/types'

const question = (id = 'first', triggerTime = 10): VideoQuiz => ({
  id,
  triggerTime,
  type: 'single',
  title: `题目 ${id}`,
  options: [
    { key: 'a', label: '答案 A' },
    { key: 'b', label: '答案 B' },
  ],
  answer: 'a',
  required: true,
})

function harness(initial: VideoQuiz[] = [question()]) {
  const quizzes = ref(initial)
  const time = ref(0)
  const player = { pause: vi.fn(), play: vi.fn() }
  let quiz!: ReturnType<typeof useQuiz>
  const wrapper = mount(
    defineComponent({
      setup() {
        quiz = useQuiz(
          shallowRef(player as unknown as PlayerInstance),
          time,
          quizzes
        )
        return () => h('div', quiz.activeQuiz.value?.title ?? '无测验')
      },
    })
  )
  return { quiz, quizzes, time, player, wrapper }
}

test.each(['remove', 'replace', 'mutate'] as const)(
  'a %s of the active question clears all stale state without resuming playback',
  async operation => {
    const { quiz, quizzes, time, player, wrapper } = harness()
    time.value = 10
    await nextTick()
    quiz.selectedAnswer.value = 'a'
    expect(quiz.submitAnswer()).toBe(true)
    expect(quiz.showResult.value).toBe(true)
    if (operation === 'remove') quizzes.value.splice(0)
    else if (operation === 'replace')
      quizzes.value = [{ ...question(), answer: 'b' }]
    else {
      // 一次业务更新连续修改多个字段，也不能在第二次写入时重开旧题。
      quizzes.value[0].title = '新题目'
      quizzes.value[0].answer = 'b'
      quizzes.value[0].options[0].label = '新选项'
    }
    await nextTick()
    expect(quiz.activeQuiz.value).toBeNull()
    expect(quiz.selectedAnswer.value).toBe('')
    expect(quiz.showResult.value).toBe(false)
    expect(quiz.lastAnswerCorrect.value).toBe(false)
    expect(quiz.completedQuizIds.value.has('first')).toBe(false)
    expect(player.play).not.toHaveBeenCalled()
    expect(player.pause).toHaveBeenCalledOnce()
    expect(wrapper.text()).toBe('无测验')
  }
)

test('equivalent replacement references retain the active answer and completed history', async () => {
  const { quiz, quizzes, time, player } = harness()
  time.value = 10
  await nextTick()
  quiz.selectedAnswer.value = 'a'
  quiz.submitAnswer()
  quizzes.value = JSON.parse(JSON.stringify(quizzes.value))
  await nextTick()
  expect(quiz.activeQuiz.value?.id).toBe('first')
  expect(quiz.selectedAnswer.value).toBe('a')
  expect(quiz.showResult.value).toBe(true)
  expect(quiz.completedQuizIds.value.has('first')).toBe(true)
  expect(player.pause).toHaveBeenCalledOnce()
})

test('only changed or removed question identities lose completion and changed answers cannot be skipped', async () => {
  const { quiz, quizzes, time } = harness([question(), question('second', 20)])
  time.value = 10
  await nextTick()
  quiz.selectedAnswer.value = 'a'
  quiz.submitAnswer()
  quiz.closeQuiz()
  time.value = 20
  await nextTick()
  quiz.selectedAnswer.value = 'a'
  quiz.submitAnswer()
  quiz.closeQuiz()
  quizzes.value = [{ ...question(), answer: 'b' }, question('second', 20)]
  await nextTick()
  expect([...quiz.completedQuizIds.value]).toEqual(['second'])
  time.value = 10
  await nextTick()
  expect(quiz.activeQuiz.value?.id).toBe('first')
  quiz.selectedAnswer.value = 'a'
  expect(quiz.submitAnswer()).toBe(false)
  quiz.closeQuiz()
  expect(quiz.activeQuiz.value?.id).toBe('first')
  quizzes.value = [question('second', 20)]
  await nextTick()
  expect([...quiz.completedQuizIds.value]).toEqual(['second'])
})

test('new questions can trigger at the current position without requiring a timeupdate', async () => {
  const { quiz, quizzes, time, player } = harness([])
  time.value = 10
  await nextTick()
  quizzes.value = [question()]
  await nextTick()
  expect(quiz.activeQuiz.value?.id).toBe('first')
  expect(quiz.selectedAnswer.value).toBe('')
  expect(player.pause).toHaveBeenCalledOnce()
  expect(player.play).not.toHaveBeenCalled()
})

test('an invalidated same-id question waits for a later time update, then starts with fresh state', async () => {
  const { quiz, quizzes, time } = harness()
  time.value = 10
  await nextTick()
  quiz.selectedAnswer.value = 'a'
  quizzes.value[0].answer = 'b'
  await nextTick()
  expect(quiz.activeQuiz.value).toBeNull()
  time.value = 10.2
  await nextTick()
  expect(quiz.activeQuiz.value?.answer).toBe('b')
  expect(quiz.selectedAnswer.value).toBe('')
  expect(quiz.showResult.value).toBe(false)
})

test('multiple-answer order and an explicit false required flag preserve semantic identity', async () => {
  const { quiz, quizzes, time } = harness([
    {
      ...question(),
      type: 'multiple',
      answer: ['a', 'b'],
      required: undefined,
    },
  ])
  time.value = 10
  await nextTick()
  quiz.selectedAnswer.value = ['b', 'a']
  expect(quiz.submitAnswer()).toBe(true)
  quizzes.value = [{ ...quizzes.value[0], answer: ['b', 'a'], required: false }]
  await nextTick()
  expect(quiz.completedQuizIds.value.has('first')).toBe(true)
  expect(quiz.activeQuiz.value).not.toBeNull()
  expect(quiz.showResult.value).toBe(true)
})

test.each(['reverse', 'sort'] as const)(
  'in-place %s preserves completion despite intermediate array positions',
  async operation => {
    const { quiz, quizzes, time } = harness([
      question('first', 10),
      question('second', 20),
      question('third', 30),
    ])
    time.value = 10
    await nextTick()
    quiz.selectedAnswer.value = 'a'
    quiz.submitAnswer()
    quiz.closeQuiz()
    time.value = 20
    await nextTick()
    quiz.selectedAnswer.value = 'a'
    quiz.submitAnswer()
    quiz.closeQuiz()
    if (operation === 'reverse') quizzes.value.reverse()
    else quizzes.value.sort((left, right) => right.id.localeCompare(left.id))
    await nextTick()
    expect([...quiz.completedQuizIds.value].sort()).toEqual(['first', 'second'])
    expect(quiz.activeQuiz.value).toBeNull()
  }
)

test.each(['submitAnswer', 'closeQuiz', 'retryQuiz'] as const)(
  '%s synchronizes a changed question before the queued watcher runs',
  async command => {
    const { quiz, quizzes, time, player } = harness()
    time.value = 10
    await nextTick()
    quiz.selectedAnswer.value = 'a'
    expect(quiz.submitAnswer()).toBe(true)
    quizzes.value[0].answer = 'b'
    const result = quiz[command]()
    if (command === 'submitAnswer') expect(result).toBe(false)
    expect(quiz.activeQuiz.value).toBeNull()
    expect(quiz.completedQuizIds.value.has('first')).toBe(false)
    expect(quiz.selectedAnswer.value).toBe('')
    expect(quiz.showResult.value).toBe(false)
    expect(player.play).not.toHaveBeenCalled()
    await nextTick()
    expect(quiz.activeQuiz.value).toBeNull()
  }
)
