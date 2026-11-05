/** Worker의 완료 신호를 확인해 중단된 응답이 정상 저장되지 않게 한다. */
export async function readChatStream(
  body: ReadableStream<Uint8Array> | null,
  onChunk: (text: string) => void,
  onDone: () => void | Promise<void>
): Promise<void> {
  if (!body) throw new Error('AI 응답 본문이 없습니다. 다시 시도해주세요.')
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false
  try {
    while (!completed) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      if (done && buffer) lines.push(buffer)
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload) continue
        const parsed = JSON.parse(payload)
        if (parsed.error) throw new Error(String(parsed.error))
        if (typeof parsed.text === 'string') onChunk(parsed.text)
        if (parsed.done === true) {
          completed = true
          await onDone()
          break
        }
      }
      if (done) break
    }
    if (!completed) throw new Error('AI 응답 연결이 중단되었습니다. 다시 시도해주세요.')
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
