import {it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
it('gives customer and admin distinct install identities with real PNG icons',()=>{
 const store=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));const admin=JSON.parse(fs.readFileSync('public/admin.webmanifest','utf8'));
 expect(store.id).not.toBe(admin.id);expect(admin.start_url).toBe('./admin.html');expect(store.display).toBe('standalone');
 for(const i of store.icons){const b=fs.readFileSync('public/'+i.src);expect(b.subarray(1,4).toString()).toBe('PNG');const n=Number(i.sizes.split('x')[0]);expect(b.readUInt32BE(16)).toBe(n);expect(b.readUInt32BE(20)).toBe(n)}
});
it('service worker returns a readable offline page on navigation failure',async()=>{
 const events:Record<string,(e:any)=>void>={};vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self:{addEventListener:(n:string,f:any)=>events[n]=f},fetch:()=>Promise.reject(Error('offline')),Response});
 let pending:Promise<Response>|undefined;events.fetch({request:{mode:'navigate'},respondWith:(p:Promise<Response>)=>pending=p});expect(await (await pending!)!.text()).toContain('اتصل بالإنترنت');
 let intercepted=false;events.fetch({request:{mode:'cors'},respondWith:()=>intercepted=true});expect(intercepted).toBe(false);
});
