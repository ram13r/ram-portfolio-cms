window.MediaDB=(()=>{
  const DB='ramPortfolioMediaDB',STORE='media';let dbPromise;
  function open(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
  async function put(file){const db=await open(),id='media-'+Date.now()+'-'+Math.random().toString(36).slice(2);await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({id,blob:file,name:file.name,type:file.type,size:file.size,createdAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return 'idb://'+id}
  async function get(ref){if(!ref||!ref.startsWith('idb://'))return null;const db=await open(),id=ref.slice(6);return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
  async function url(ref){if(!ref||!ref.startsWith('idb://'))return ref;const item=await get(ref);return item?URL.createObjectURL(item.blob):''}
  async function remove(ref){if(!ref||!ref.startsWith('idb://'))return;const db=await open(),id=ref.slice(6);await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  return{put,get,url,remove};
})();