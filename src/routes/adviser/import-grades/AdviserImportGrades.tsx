import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { AdviserPage } from '../Adviser'
import { useAuth } from '@/hooks/use-auth'
import { apiClient, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/features/file-upload'

function ImportForm(){
 const [input,setInput]=useState<ApiSchema<'GradeBatchImportRequest'> | null>(null);const [preview,setPreview]=useState<ApiSchema<'GradeBatchImportResponse'> | null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('')
 const fileRevision=useRef(0);const [uploadKey,setUploadKey]=useState(0)
 function download(){const blob=new Blob([JSON.stringify({school_term_id:'',rows:[{row_number:1,student_number:'',course_code:'',instructor:'',midterm_grade:null,final_grade:null}]},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='grade-import-template.json';anchor.click();URL.revokeObjectURL(url)}
 async function read(file:File|undefined){const current=++fileRevision.current;setInput(null);setPreview(null);setError('');setMessage('');if(!file)return;try{const value:unknown=JSON.parse(await file.text());if(current!==fileRevision.current)return;if(!value||typeof value!=='object'||!('school_term_id' in value)||typeof value.school_term_id!=='string'||!('rows' in value)||!Array.isArray(value.rows))throw new Error('The file must contain school_term_id and a rows array.');setInput({school_term_id:value.school_term_id,rows:value.rows,mode:'preview'})}catch(e){if(current===fileRevision.current)setError(e instanceof Error?e.message:'Unable to read file.')}}
 async function run(mode:'preview'|'commit'){if(!input)return;setBusy(true);setError('');setMessage('');try{const result=unwrapApiResult(await apiClient.POST('/functions/v1/grades/import',{body:{...input,mode}}));if(mode==='preview')setPreview(result);else{setMessage(`Imported ${result.imported_count} rows.`);setPreview(null);setInput(null);setUploadKey(n=>n+1)}}catch(e){setError(e instanceof Error?e.message:'Import failed.')}finally{setBusy(false)}}
 return <><PageHeading title="Import grades (JSON)" subtitle="For many advisees or terms at once" actions={<Button variant="outline" onClick={download}>Download template</Button>}/><Panel title="Upload a file" description="Every row is checked before anything is saved."><FileUpload key={uploadKey} accept="application/json,.json" disabled={busy} onFile={file=>void read(file)}/>{input&&<p className="mt-2">{input.rows.length} rows selected for term {input.school_term_id || '(missing)' }.</p>}<Button className="mt-4" disabled={!input||!input.school_term_id||!input.rows.length||busy} onClick={()=>void run('preview')}>Validate file</Button></Panel>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<Panel title="Check results">{preview?<><p>{preview.valid_count} valid · {preview.warning_count} warnings · {preview.error_count} errors</p><ul className="my-4">{preview.results.map(row=><li key={row.row_number} className="border-b py-2">Row {row.row_number}: {row.student_number} · {row.course_code} · {row.outcome} {row.message}</li>)}</ul><Button disabled={busy||preview.valid_count===0} onClick={()=>void run('commit')}>{busy?'Saving…':'Confirm and save valid rows'}</Button></>:<p>Choose a file and validate it to preview results.</p>}<Button asChild variant="outline" className="ml-2"><Link to="/adviser/encode-grades">Cancel</Link></Button></Panel></>
}
export default function AdviserImportGrades(){const {user}=useAuth();return <AdviserPage title="Import grades" sample={false}>{user&&<ImportForm key={user.id}/>}</AdviserPage>}
