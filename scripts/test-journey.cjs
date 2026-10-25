// Run after build:server. Only synthetic data and an in-memory repository.
const assert=require('node:assert/strict');
const {validate,JourneyService}=require('../packages/server/dist/modules/journey/journey.module');
const sample=()=>({kind:'participation',parent_id:null,project_name:'模拟项目',person:'我',is_self:true,title:'模拟参与',role:'',start:'2024-12',end:'',cutoff:'',tracking:'following',approximate:false,tags:'',notes:''});
(async()=>{
 validate(sample(),[],null);
 validate({...sample(),person:'模拟同事',is_self:false},[{...sample(),id:1}],null);
 for(const patch of [{start:'2024-02-30'},{start:'2024-99-99'},{tracking:'cutoff'},{tracking:'ended'},{end:'2023-12',tracking:'ended'},{kind:'work',parent_id:99}]) assert.throws(()=>validate({...sample(),...patch},[],null));
 validate({...sample(),tracking:'cutoff',cutoff:'2025-06'},[],null);
 let rows=[],next=1;
 const repo={findBy:async({owner})=>rows.filter(r=>r.owner===owner),create:x=>x,save:async x=>{x={...x,id:x.id||next++};rows=[...rows.filter(r=>r.id!==x.id),x];return x},delete:async({owner,id})=>{rows=rows.filter(r=>r.owner!==owner||r.id!==id)}};
 const svc=new JourneyService(repo);
 const p=await svc.save(1,null,sample());
 assert.equal((await svc.all(2)).length,0);
 await assert.rejects(()=>svc.save(2,p.id,sample()));
 const child=await svc.save(1,null,{...sample(),kind:'work',parent_id:p.id});
 await assert.rejects(()=>svc.remove(1,p.id));
 await svc.remove(2,child.id);assert.equal((await svc.all(1)).length,2);
 await svc.remove(1,child.id);await svc.remove(1,p.id);
 assert.equal((await svc.all(1)).length,0);
 console.log('Journey server: dates, repeated participation, cutoff, parent references, owner isolation, delete protection passed');
})().catch(()=>{console.error('Journey server test failed');process.exitCode=1});
