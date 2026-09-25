const DB_NAME='sociobio_offline_v4';
const DB_VERSION=2;
let dbPromise;

function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{
      const db=r.result;
      if(!db.objectStoreNames.contains('interviews')){
        const s=db.createObjectStore('interviews',{keyPath:'id'});
        s.createIndex('updatedAt','updatedAt');
        s.createIndex('status','status');
        s.createIndex('syncStatus','syncStatus');
      } else {
        const s=r.transaction.objectStore('interviews');
        if(!s.indexNames.contains('updatedAt'))s.createIndex('updatedAt','updatedAt');
        if(!s.indexNames.contains('status'))s.createIndex('status','status');
        if(!s.indexNames.contains('syncStatus'))s.createIndex('syncStatus','syncStatus');
      }
      if(!db.objectStoreNames.contains('audios')){
        const s=db.createObjectStore('audios',{keyPath:'id'});
        s.createIndex('interviewId','interviewId');
      }
      if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'key'});
    };
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  return dbPromise;
}
function req(store,method,...args){return new Promise(async(res,rej)=>{try{const db=await openDB();const tx=db.transaction(store,method);const r=tx.objectStore(store);const out=r[args[0]](...args.slice(1));out.onsuccess=()=>res(out.result);out.onerror=()=>rej(out.error)}catch(e){rej(e)}})}
export async function putInterview(item){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('interviews','readwrite');tx.objectStore('interviews').put({...item,syncStatus:item.syncStatus||'pending'});tx.oncomplete=()=>res(item);tx.onerror=()=>rej(tx.error)})}
export const getInterview=id=>req('interviews','readonly','get',id);
export async function listInterviews(){const items=await req('interviews','readonly','getAll');return items.sort((a,b)=>b.updatedAt-a.updatedAt)}
export async function listPendingInterviews(){const all=await listInterviews();return all.filter(x=>x.syncStatus!=='synced')}
export async function deleteInterview(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(['interviews','audios'],'readwrite');tx.objectStore('interviews').delete(id);const idx=tx.objectStore('audios').index('interviewId');idx.openCursor(IDBKeyRange.only(id)).onsuccess=e=>{const c=e.target.result;if(c){c.delete();c.continue()}};tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
export async function putAudio(item){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('audios','readwrite');tx.objectStore('audios').put(item);tx.oncomplete=()=>res(item);tx.onerror=()=>rej(tx.error)})}
export async function getAudios(interviewId){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('audios').objectStore('audios').index('interviewId').getAll(IDBKeyRange.only(interviewId));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}

export async function allData(){return {interviews:await listInterviews(),audios:await new Promise(async(res,rej)=>{try{const db=await openDB();const r=db.transaction('audios').objectStore('audios').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}}
export async function clearAll(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(['interviews','audios'],'readwrite');tx.objectStore('interviews').clear();tx.objectStore('audios').clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
export async function saveSetting(key,value){return req('settings','readwrite','put',{key,value})}
export async function getSetting(key){return req('settings','readonly','get',key)}
export async function importData(payload){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(['interviews','audios'],'readwrite');
    for(const item of payload.interviews||[])tx.objectStore('interviews').put(item);
    for(const item of payload.audios||[])tx.objectStore('audios').put(item);
    tx.oncomplete=res;tx.onerror=()=>rej(tx.error);
  });
}
export async function markSynced(id){const it=await getInterview(id);if(it){it.syncStatus='synced';it.syncedAt=Date.now();await putInterview(it)}}
