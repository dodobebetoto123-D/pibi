function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)```/i)
  try {
    return JSON.parse((fenced?.[1] ?? text).trim())
  } catch {
    throw new Error('AI 응답을 읽을 수 없습니다. 다시 시도해주세요.')
  }
}

export function parseInspection(text: string) {
  const value = parseJson(text)
  if (!value || typeof value !== 'object') throw new Error('AI 점검 결과가 올바르지 않습니다. 다시 시도해주세요.')
  const result = value as Record<string, unknown>
  if (typeof result.score !== 'number' || !Number.isFinite(result.score) || result.score < 0 || result.score > 100 ||
      !Array.isArray(result.feedback) || result.feedback.length === 0 ||
      !result.feedback.every((item: unknown) => typeof item === 'string' && item.trim().length > 0)) {
    throw new Error('AI 점검 결과가 올바르지 않습니다. 다시 시도해주세요.')
  }
  return { score: result.score, status: result.score >= 80 ? 'good' : 'needs_improvement', feedback: result.feedback as string[] }
}

export function parseSuggestedNotes(text: string): { content: string; color: string }[] {
  const value = parseJson(text)
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) throw new Error('AI 메모 추천 결과가 올바르지 않습니다. 다시 시도해주세요.')
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('AI 메모 추천 결과가 올바르지 않습니다. 다시 시도해주세요.')
    const note = item as Record<string, unknown>
    if (typeof note.content !== 'string' || !note.content.trim() || note.content.length > 4000) throw new Error('AI 메모 추천 결과가 올바르지 않습니다. 다시 시도해주세요.')
    return { content: note.content.trim(), color: typeof note.color === 'string' && /^#[0-9a-f]{6}$/i.test(note.color) ? note.color : '#fef08a' }
  })
}
