import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInspection, parseSuggestedNotes } from '../frontend/src/api/aiResults.ts'

test('점수에 따라 점검 상태를 결정한다', () => {
  assert.deepEqual(parseInspection('```json\n{"score":0,"status":"good","feedback":["수정 필요"]}\n```'), {score: 0, status: 'needs_improvement', feedback: ['수정 필요']})
  assert.equal(parseInspection('{"score":80,"feedback":["좋음"]}').status, 'good')
})
test('잘못된 AI 점검을 결과로 저장하지 않는다', () => {
  for (const result of ['오류', '{}', '{"score":101,"feedback":["좋음"]}', '{"score":50,"feedback":[]}', 'null']) assert.throws(() => parseInspection(result))
})
test('추천 메모를 검증한다', () => {
  assert.deepEqual(parseSuggestedNotes('[{"content":"  아이디어  ","color":"red"}]'), [{content:'아이디어',color:'#fef08a'}])
  for (const result of ['[]', '[{}]', '[{"content":""}]', '오류']) assert.throws(() => parseSuggestedNotes(result))
})
