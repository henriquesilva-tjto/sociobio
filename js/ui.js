export const $=id=>document.getElementById(id);
export function show(id){$(id).classList.remove('hidden')}
export function hide(id){$(id).classList.add('hidden')}
export function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1200)}
export function escapeCsv(v){let s=Array.isArray(v)?v.join('|'):(v??'');s=String(s).replace(/"/g,'""');return `"${s}"`}
export async function blobToBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
export function base64ToBlob(b64,type='audio/webm'){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));return new Blob([bytes],{type})}
