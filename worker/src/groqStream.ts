/** Groq의 완료 신호가 없는 응답은 성공으로 처리하지 않는다. */
export function convertGroqStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete = false

  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { value, done } = await reader.read()
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          if (done && buffer) lines.push(buffer)
          let emitted = false
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (!data) continue
            if (data === '[DONE]') {
              complete = true
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
              controller.close()
              await reader.cancel().catch(() => {})
              return
            }
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error('AI 서비스에서 오류가 발생했습니다.')
            const text = parsed.choices?.[0]?.delta?.content
            if (typeof text === 'string' && text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
              emitted = true
            }
          }
          if (done && !complete) throw new Error('AI 응답 연결이 중단되었습니다. 다시 시도해주세요.')
          if (emitted) return
        }
      } catch (error) {
        controller.error(error)
        await reader.cancel().catch(() => {})
      }
    },
    async cancel() {
      await reader.cancel()
    },
  })
}
