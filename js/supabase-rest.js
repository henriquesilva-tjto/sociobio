import { getSetting, saveSetting } from './db.js';

export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_COLOQUE_SUA_CHAVE_AQUI';

export function isConfigured(){
  return SUPABASE_URL.includes('.supabase.co') && !SUPABASE_URL.includes('SEU-PROJETO') && !SUPABASE_PUBLISHABLE_KEY.includes('COLOQUE_SUA_CHAVE');
}

async function cfg(){
  const u = await getSetting('supabaseUrl');
  const k = await getSetting('supabasePublishableKey');
  return { url: u?.value || SUPABASE_URL, key: k?.value || SUPABASE_PUBLISHABLE_KEY };
}

export async function saveSupabaseConfig(url,key){ await saveSetting('supabaseUrl',url.trim().replace(/\/$/,'')); await saveSetting('supabasePublishableKey',key.trim()); }

export async function getSession(){ const s=await getSetting('supabaseSession'); return s?.value || null; }
async function saveSession(session){ if(session) await saveSetting('supabaseSession',session); else await saveSetting('supabaseSession',null); }

async function request(path, options={}){
  const c=await cfg();
  if(!c.url || c.url.includes('SEU-PROJETO') || !c.key || c.key.includes('COLOQUE_SUA_CHAVE')) throw new Error('Supabase ainda não configurado.');
  const headers={apikey:c.key, ...(options.headers||{})};
  const session=await getSession();
  if(session?.access_token) headers.Authorization=`Bearer ${session.access_token}`;
  const r=await fetch(c.url+path,{...options,headers});
  const text=await r.text(); let body=null; try{body=text?JSON.parse(text):null}catch{body=text}
  if(!r.ok) throw new Error(body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${r.status}`);
  return body;
}

export async function signUp(email,password){
  const c=await cfg();
  const r=await fetch(c.url+'/auth/v1/signup',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const b=await r.json(); if(!r.ok) throw new Error(b?.msg||b?.message||b?.error_description||'Falha no cadastro');
  if(b.access_token) await saveSession(b); return b;
}

export async function signIn(email,password){
  const c=await cfg();
  const r=await fetch(c.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const b=await r.json(); if(!r.ok) throw new Error(b?.msg||b?.message||b?.error_description||'Falha no login');
  await saveSession(b); return b;
}

export async function signOut(){ await saveSession(null); }

export async function refreshSession(){
  const s=await getSession(); if(!s?.refresh_token) return null;
  const c=await cfg();
  const r=await fetch(c.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
  if(!r.ok){ await saveSession(null); return null; }
  const b=await r.json(); await saveSession(b); return b;
}

export async function upsertInterview(interview){
  const s=await getSession(); if(!s?.access_token) throw new Error('Faça login para sincronizar.');
  const row={id:interview.id,user_id:s.user.id,codigo:interview.meta?.id_quest||null,data:interview.meta?.data||null,entrevistador:interview.meta?.entrevistador||null,municipio:interview.meta?.municipio||null,comunidade:interview.meta?.comunidade||null,cadeia:interview.meta?.cadeia||null,cadeia_label:interview.meta?.cadeiaLabel||null,status:interview.status,meta:interview.meta||{},answers:interview.answers||{},updated_at:new Date(interview.updatedAt||Date.now()).toISOString()};
  return request('/rest/v1/interviews?on_conflict=id',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
}

export async function uploadAudio(interview,audio){
  const s=await getSession(); if(!s?.access_token) throw new Error('Faça login para sincronizar.');
  const safe=`${s.user.id}/${interview.id}/${audio.id}.webm`;
  const c=await cfg();
  const r=await fetch(c.url+'/storage/v1/object/interview-audios/'+safe,{method:'POST',headers:{apikey:c.key,Authorization:`Bearer ${s.access_token}`,'Content-Type':audio.mime||'audio/webm','x-upsert':'true'},body:audio.blob});
  const t=await r.text(); let b=null; try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok) throw new Error(b?.message||b?.error||`Áudio HTTP ${r.status}`);
  await request('/rest/v1/interview_audios?on_conflict=id',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:audio.id,user_id:s.user.id,interview_id:interview.id,question_id:audio.questionId,storage_path:safe,mime:audio.mime||'audio/webm',created_at:new Date(audio.createdAt||Date.now()).toISOString()})});
}

export async function syncInterview(interview,audios){
  await upsertInterview(interview);
  for(const a of audios) await uploadAudio(interview,a);
}
