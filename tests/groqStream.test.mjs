import { test } from 'node:test'
import assert from 'node:assert/strict'
import { convertGroqStream } from '../worker/src/groqStream.ts'
import { readChatStream } from '../frontend/src/api/chatStream.ts'

function groq(text) {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close() } })
}
test('분할된 Groq 응답과 완료 신호를 전달한다', async () => {
  let result = '', done = 0
  await readChatStream(convertGroqStream(groq('data: {"choices":[{"delta":{"content":"안녕"}}]}\n\ndata: [DONE]')), text => { result += text }, () => { done++ })
  assert.equal(result, '안녕'); assert.equal(done, 1)
})
test('완료 전에 연결이 끊기면 성공으로 저장하지 않는다', async () => {
  let done = false
  await assert.rejects(readChatStream(convertGroqStream(groq('data: {"choices":[{"delta":{"content":"일부"}}]}\n\n')), () => {}, () => { done = true }))
  assert.equal(done, false)
})
test('오류나 잘못된 데이터는 성공으로 처리하지 않는다', async () => {
  for (const input of ['data: {"error":{"message":"failed"}}\n\n', 'data: {broken}\n\n']) {
    let done = false
    await assert.rejects(readChatStream(convertGroqStream(groq(input)), () => {}, () => { done = true }))
    assert.equal(done, false)
  }
})
