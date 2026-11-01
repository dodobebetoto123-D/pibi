import { useEffect, useRef, useState } from 'react'
import { Monitor, RefreshCw, Maximize2 } from 'lucide-react'

interface CodePreviewProps {
  html: string
}

export default function CodePreview({ html }: CodePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [key, setKey] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!iframeRef.current || !html) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
  }, [html, key])

  const refresh = () => setKey((k) => k + 1)

  if (!html) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
        <Monitor size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">AI와 대화하면 여기에 미리보기가 나타납니다</p>
        <p className="text-xs mt-1 opacity-70">개발 단계에서 코드를 생성해보세요</p>
      </div>
    )
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 mx-2 bg-gray-50 rounded-full px-3 py-1 text-xs text-gray-600 border border-gray-200 truncate">
          미리보기
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-[8px] hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={13} />
        </button>
        <button
          onClick={() => setFullscreen(true)}
          className="p-2 rounded-[8px] hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          title="전체화면"
        >
          <Maximize2 size={13} />
        </button>
      </div>
      <iframe
        key={key}
        ref={iframeRef}
        sandbox="allow-scripts allow-forms"
        className="flex-1 w-full bg-white"
        title="App Preview"
      />
    </div>
  )

  return (
    <>
      {content}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
            <span className="text-gray-900 text-sm font-medium flex-1">전체화면 미리보기</span>
            <button
              onClick={() => setFullscreen(false)}
              className="text-gray-600 hover:text-gray-900 text-sm px-3 py-2 rounded-[8px] hover:bg-gray-100"
            >
              닫기
            </button>
          </div>
          <iframe
            sandbox="allow-scripts allow-forms"
            srcDoc={html}
            className="flex-1 w-full bg-white"
            title="App Preview Fullscreen"
          />
        </div>
      )}
    </>
  )
}
