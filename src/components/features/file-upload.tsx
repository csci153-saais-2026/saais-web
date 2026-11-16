import { useId, useRef, useState } from 'react'
import { UploadIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'

export function FileUpload({ accept, disabled, onFile }: { accept: string; disabled?: boolean; onFile: (file: File | undefined) => void }) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  return <div className="grid justify-items-center gap-3 rounded-md border border-dashed border-border bg-background px-5 py-8 text-center" onDragOver={event => { event.preventDefault() }} onDrop={event => { event.preventDefault(); if (disabled) return; const file = event.dataTransfer.files[0]; setName(file?.name ?? ''); onFile(file) }}>
    <UploadIcon className="size-7 text-muted-foreground" aria-hidden />
    <label htmlFor={id} className="text-sm font-semibold">Upload a file</label>
    <p className="text-sm text-muted-foreground">{name || 'Drop a .json file here, or choose a file to validate.'}</p>
    <input ref={input} id={id} type="file" accept={accept} disabled={disabled} className="sr-only" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; setName(file?.name ?? ''); onFile(file) }} />
    <Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>Choose file</Button>
  </div>
}
