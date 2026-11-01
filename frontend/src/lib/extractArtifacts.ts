// AI 응답에서 산출물 블록을 추출 — 기존 backend/src/routes/ai.ts의 로직을 이동.
export interface ExtractedArtifact {
  type: 'html' | 'json' | 'markdown'
  content: string
}

export interface ExtractedNotes {
  content: string
  color: string
}

export function extractArtifacts(
  fullContent: string,
  step: number
): { artifacts: ExtractedArtifact[]; notes: ExtractedNotes[] } {
  const artifacts: ExtractedArtifact[] = []
  const notes: ExtractedNotes[] = []

  const htmlMatch =
    fullContent.match(/```html\r?\n([\s\S]*?)```/) ||
    (step === 3 ? fullContent.match(/```(?:xml|htm)?\r?\n([\s\S]*?)```/) : null)
  const jsonMatch = fullContent.match(/```json\r?\n([\s\S]*?)```/)
  const mdMatch = fullContent.match(/```(?:markdown|md)\r?\n([\s\S]*?)```/)

  if (htmlMatch && (htmlMatch[1].includes('<') || step === 3)) {
    artifacts.push({ type: 'html', content: htmlMatch[1].trim() })
  }
  if (jsonMatch) {
    artifacts.push({ type: 'json', content: jsonMatch[1].trim() })
    // 0단계에서 notes 배열이 있으면 스티커 메모 자동 생성용으로 파싱
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (Array.isArray(parsed.notes)) {
        for (const n of parsed.notes) {
          notes.push({
            content: n.content || n.title || JSON.stringify(n),
            color: n.color || '#fef08a',
          })
        }
      }
    } catch {
      // JSON 파싱 실패는 무시
    }
  }
  if (mdMatch) {
    artifacts.push({ type: 'markdown', content: mdMatch[1].trim() })
  } else if (step === 1 && fullContent.length > 50 && !jsonMatch) {
    artifacts.push({ type: 'markdown', content: fullContent.trim() })
  }

  return { artifacts, notes }
}
