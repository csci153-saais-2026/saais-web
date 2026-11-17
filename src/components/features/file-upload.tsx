import { useId, useState } from 'react'
import { UploadIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export function FileUpload({ accept, disabled, onFile }: { accept: string; disabled?: boolean; onFile: (file: File | undefined) => void }) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  return <div
    className={cn('rounded-md border-[1.5px] border-dashed bg-background px-5 py-9 text-center text-sm text-muted-foreground', dragging ? 'border-primary' : 'border-input')}
    onDragEnter={event => { event.preventDefault(); setDragging(true) }}
    onDragOver={event => { event.preventDefault(); setDragging(true) }}
    onDragLeave={event => { event.preventDefault(); setDragging(false) }}
    onDrop={event => { event.preventDefault(); setDragging(false); if (disabled) return; onFile(event.dataTransfer.files[0]) }}
  >
    <UploadIcon className="mx-auto mb-2.5 size-[26px] text-muted-foreground" aria-hidden />
    Drop a .json file here, or{' '}
    <label htmlFor={id} className="cursor-pointer font-semibold text-primary underline underline-offset-[3px]">choose a file</label>
    <input id={id} type="file" accept={accept} disabled={disabled} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; onFile(file) }} />
  </div>
}
