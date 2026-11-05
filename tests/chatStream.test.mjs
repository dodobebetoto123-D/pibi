import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readChatStream } from '../frontend/src/api/chatStream.ts'

function stream(text) {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
    controller.close()
  } })
}

test('분할된 UTF-8 응답과 줄바꿈 없는 완료 신호 처리', async () => {
  let text = '', count = 0
  await readChatStream(stream('data: {"text":"안녕하세요"}\r\n\r\ndata: {"done":true}'), chunk => { text += chunk }, () => { count++ })
  assert.equal(text, '안녕하세요')
  assert.equal(count, 1)
})
test('완료 신호가 없으면 저장하지 않고 실패', async () => {
  let saved = false
  await assert.rejects(readChatStream(stream('data: {"text":"일부"}\n\n'), () => {}, () => { saved = true }), /중단/)
  assert.equal(saved, false)
})
test('중복 완료 신호가 있어도 한 번만 저장', async () => {
  let count = 0
  await readChatStream(stream('data: {"done":true}\n\ndata: {"done":true}\n\n'), () => {}, () => { count++ })
  assert.equal(count, 1)
})
test('본문 누락 및 서버 오류를 전달', async () => {
  await assert.rejects(readChatStream(null, () => {}, () => {}), /본문/)
  await assert.rejects(readChatStream(stream('data: {"error":"서버 오류"}\n\n'), () => {}, () => {}), /서버 오류/)
})
test('저장 실패를 호출자에게 전달', async () => {
  await assert.rejects(readChatStream(stream('data: {"done":true}\n\n'), () => {}, async () => { throw new Error('저장 실패') }), /저장 실패/)
})
