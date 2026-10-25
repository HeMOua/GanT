<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NInput, NSelect, NModal, NForm, NFormItem, NSwitch, NTag, NSpin, NEmpty, useMessage } from 'naive-ui'
import { journeyApi, type Journey } from '../api/journey'
import { projectsApi } from '../api/projects'
import { confirmAction } from '../api/dialogs'
const message = useMessage()
const records = ref<Journey[]>([]), projectNames = ref<string[]>([])
const loading = ref(false), saving = ref(false), failed = ref(false), show = ref(false)
const perspective = ref('self'), person = ref<string | null>(null), project = ref<string | null>(null), year = ref<string | null>(null), search = ref(''), view = ref('timeline')
const kinds = [{label:'参与项目',value:'participation'},{label:'工作阶段',value:'work'},{label:'重要节点',value:'milestone'}]
const statuses = [{label:'持续跟进',value:'following'},{label:'仅记录到某日',value:'cutoff'},{label:'已确认结束',value:'ended'}]
const blank = (): Journey => ({id:0,kind:'participation',parent_id:null,project_name:'',person:'我',is_self:true,title:'',role:'',start:'',end:'',tracking:'following',cutoff:'',approximate:false,tags:'',notes:''})
const draft = ref<Journey>(blank())
const options = (values: string[]) => [...new Set(values)].filter(Boolean).sort().map(value => ({label:value,value}))
const people = computed(() => options(records.value.filter(r=>!r.is_self).map(r=>r.person)))
const projects = computed(() => options([...projectNames.value,...records.value.map(r=>r.project_name)]))
function last(r: Journey) { return r.kind === 'milestone' ? r.start : r.end || r.cutoff || '' }
const years = computed(() => {
  const values:string[]=[]
  const now = new Date().getFullYear()
  for (const r of records.value) {
    const a=Number(r.start.slice(0,4)), b=Number((last(r)||String(now)).slice(0,4))
    for(let y=a;y<=Math.min(b,a+200);y++) values.push(String(y))
  }
  return options(values).reverse()
})
const filtered = computed(() => records.value.filter(r => {
  if (perspective.value==='self' && !r.is_self) return false
  if (perspective.value==='person' && person.value && (person.value==='__self' ? !r.is_self : r.is_self || r.person!==person.value)) return false
  if(project.value && r.project_name!==project.value) return false
  if(year.value && (r.start.slice(0,4)>year.value || (last(r) && last(r).slice(0,4)<year.value!))) return false
  const query=search.value.trim().toLowerCase()
  return !query || [r.title,r.project_name,r.person,r.role,r.tags,r.notes].join(' ').toLowerCase().includes(query)
}).sort((a,b)=>b.start.localeCompare(a.start)||b.id-a.id))
const groups = computed(() => {
  const map=new Map<string,Journey[]>()
  for(const r of filtered.value) {
    const key=perspective.value==='project'?r.project_name:perspective.value==='year'?(year.value||r.start.slice(0,4)):r.start.slice(0,7)
    if(!map.has(key)) map.set(key,[])
    map.get(key)!.push(r)
  }
  return [...map.entries()]
})
const participationOptions = computed(() => records.value.filter(r=>r.kind==='participation').map(r=>({label:`${r.is_self?'我':r.person} · ${r.project_name} · ${r.start} · ${r.title}`,value:r.id})))
function useParent(id: number | null) {
  const p=records.value.find(r=>r.id===id)
  if(p) Object.assign(draft.value,{parent_id:p.id,project_name:p.project_name,person:p.person,is_self:p.is_self})
}
function edit(r?: Journey) { draft.value=r?{...r}:blank(); show.value=true }
function child(r:Journey, kind:'work'|'milestone') { draft.value={...blank(),kind};useParent(r.id);show.value=true }
async function load() {
  loading.value=true; failed.value=false
  try { const [r,p]=await Promise.all([journeyApi.all(),projectsApi.getAll()]);records.value=r;projectNames.value=p.map(x=>x.name) }
  catch { failed.value=true;message.error('无法读取历程，请重试') }
  finally {loading.value=false}
}
async function save() {
  const d={...draft.value}
  if(d.is_self) d.person='我'
  if(d.kind==='participation') d.parent_id=null
  if(d.kind==='milestone') {d.end='';d.cutoff='';d.tracking='ended'}
  else {if(d.tracking!=='ended') d.end='';if(d.tracking!=='cutoff') d.cutoff=''}
  if(!d.project_name.trim()||!d.person.trim()||!d.title.trim()||!d.start) {message.warning('请填写项目、人员、名称和开始时间');return}
  saving.value=true
  try { const saved=await journeyApi.save(d);records.value=[...records.value.filter(r=>r.id!==saved.id),saved];show.value=false;message.success('已保存') }
  catch(e:any) {message.error(e.response?.data?.message || '保存失败，请重试')}
  finally {saving.value=false}
}
async function remove(r:Journey) {
  if(records.value.some(x=>x.parent_id===r.id)) {message.warning('请先删除这段参与经历下的工作和节点');return}
  if(!await confirmAction('删除这条历程记录？此操作无法撤销。')) return
  try {await journeyApi.remove(r.id);records.value=records.value.filter(x=>x.id!==r.id);message.success('已删除')}
  catch {message.error('删除失败，请重试')}
}
function status(r:Journey) {return r.kind==='milestone'?'重要节点':r.tracking==='cutoff'?'后续未知':r.tracking==='ended'?'已结束':'持续跟进'}
function range(r:Journey) {return `${r.approximate?'约 ':''}${r.start}${r.kind==='milestone'?'':r.end?' — '+r.end:r.cutoff?' · 记录截至 '+r.cutoff:' — 持续跟进'}`}
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const chartEnd = (r:Journey) => last(r) || (r.tracking==='following' && today()>r.start ? today() : r.start)
const ganttRows = computed(() => {
  const result:Journey[]=[]
  const all=filtered.value
  for(const p of all.filter(r=>r.kind==='participation').reverse()) {
    result.push(p,...all.filter(r=>r.parent_id===p.id).sort((a,b)=>a.start.localeCompare(b.start)))
  }
  return [...result,...all.filter(r=>!result.includes(r))]
})
const dateNum = (s:string) => Date.parse(s.length===7?s+'-01':s)
const bounds = computed(() => {
  const points=filtered.value.flatMap(r=>[dateNum(r.start),dateNum(chartEnd(r))])
  const min=Math.min(...points),max=Math.max(...points)
  return {min,max:Math.max(max,min+86400000*30)}
})
function bar(r:Journey) {
  const {min,max}=bounds.value, a=dateNum(r.start), b=dateNum(chartEnd(r))
  return {left:`${(a-min)/(max-min)*94}%`,width:`${Math.max(1,(b-a)/(max-min)*94)}%`}
}
onMounted(load)
</script>
<template>
  <div class="journey-page">
    <header><div><div class="eyebrow">工作历程</div><h1>{{perspective==='self'?'我的历程':perspective==='project'?'项目历程':perspective==='person'?'人员历程':'年度回顾'}}</h1></div><NButton type="primary" :disabled="loading||failed" @click="edit()">加入项目</NButton></header>
    <div class="perspectives"><NButton v-for="tab in [{label:'我的历程',value:'self'},{label:'项目历程',value:'project'},{label:'人员历程',value:'person'},{label:'年度回顾',value:'year'}]" :key="tab.value" :type="perspective===tab.value?'primary':'default'" :quaternary="perspective!==tab.value" @click="perspective=tab.value">{{tab.label}}</NButton></div>
    <div class="filters">
      <NInput v-model:value="search" clearable placeholder="搜索工作、成果或标签" aria-label="搜索历程" />
      <NSelect v-if="perspective==='person'" v-model:value="person" clearable :options="[{label:'我',value:'__self'},...people]" placeholder="全部人员" />
      <NSelect v-model:value="project" clearable filterable :options="projects" placeholder="全部项目" aria-label="项目筛选" />
      <NSelect v-model:value="year" clearable :options="years" placeholder="全部年份" aria-label="年份筛选" />
    </div>
    <div class="overview"><span><strong>{{new Set(filtered.map(r=>r.project_name)).size}}</strong> 个项目</span><span><strong>{{filtered.filter(r=>r.kind==='work').length}}</strong> 段工作</span><span><strong>{{filtered.filter(r=>r.kind==='milestone').length}}</strong> 个节点</span><div class="view-switch"><NButton v-for="tab in [{label:'时间轴',value:'timeline'},{label:'甘特图',value:'gantt'},{label:'列表',value:'list'}]" :key="tab.value" size="small" :type="view===tab.value?'primary':'default'" @click="view=tab.value">{{tab.label}}</NButton></div></div>
    <NSpin :show="loading">
      <div v-if="failed" class="empty"><NEmpty description="历程读取失败"><template #extra><NButton @click="load">重新加载</NButton></template></NEmpty></div>
      <div v-else-if="!filtered.length&&!loading" class="empty"><NEmpty :description="records.length?'没有符合筛选条件的历程':'从第一次参与的项目开始，记下你的工作经历'"><template #extra><NButton v-if="!records.length" @click="edit()">加入项目</NButton><NButton v-else @click="search='';project=null;year=null;person=null">清除筛选</NButton></template></NEmpty></div>
      <div v-else-if="view==='gantt'" class="gantt-wrap"><div class="gantt-scale"><span>{{new Date(bounds.min).toISOString().slice(0,10)}}</span><span>{{new Date(bounds.max).toISOString().slice(0,10)}}</span></div><div v-for="r in ganttRows" :key="r.id" class="gantt-row"><button class="gantt-label" :class="{child:r.parent_id}" @click="edit(r)">{{r.title}}<small>{{r.project_name}} · {{r.is_self?'我':r.person}}</small></button><div class="gantt-track"><button :aria-label="r.title+' '+range(r)" class="gantt-bar" :class="{unknown:r.tracking==='cutoff',following:r.tracking==='following',milestone:r.kind==='milestone'}" :style="bar(r)" @click="edit(r)"></button></div><span class="gantt-status">{{range(r)}}</span></div></div>
      <div v-else :class="view">
        <section v-for="[label,items] in groups" :key="label"><h2>{{label}}</h2><article v-for="r in items" :key="r.id" class="record" :class="r.kind">
          <div class="record-head"><span class="record-kind">{{kinds.find(k=>k.value===r.kind)?.label}}</span><NTag size="small" :bordered="false" :type="r.tracking==='cutoff'?'warning':r.tracking==='ended'?'default':'info'">{{status(r)}}</NTag><time>{{range(r)}}</time></div>
          <h3><button @click="edit(r)">{{r.title}}</button></h3><div class="record-meta">{{r.project_name}} · {{r.is_self?'我':r.person}}<span v-if="r.role"> · {{r.role}}</span></div>
          <div v-if="r.parent_id" class="parent">参与经历：{{records.find(p=>p.id===r.parent_id)?.title}}</div>
          <p v-if="r.notes">{{r.notes}}</p><div v-if="r.tags" class="tags"><NTag v-for="tag in r.tags.split(/[,，]/).filter(Boolean)" :key="tag" size="small" :bordered="false">{{tag.trim()}}</NTag></div>
          <div class="actions"><template v-if="r.kind==='participation'"><NButton size="small" quaternary @click="child(r,'work')">新增工作</NButton><NButton size="small" quaternary @click="child(r,'milestone')">新增节点</NButton></template><NButton size="small" quaternary @click="edit(r)">编辑</NButton><NButton size="small" quaternary type="error" @click="remove(r)">删除</NButton></div>
        </article></section>
      </div>
    </NSpin>
    <NModal v-model:show="show" preset="card" :title="draft.id?'编辑历程':draft.kind==='participation'?'加入项目':draft.kind==='work'?'新增工作':'新增节点'" class="journey-modal" style="width:620px;max-width:calc(100vw - 40px)" :mask-closable="!saving" :closable="!saving">
      <NForm label-placement="top" @submit.prevent="save">
        <NFormItem v-if="draft.kind!=='participation'" label="所属参与经历"><NSelect :value="draft.parent_id" :options="participationOptions" @update:value="useParent" /></NFormItem>
        <div v-else class="form-grid"><NFormItem label="为自己记录"><NSwitch v-model:value="draft.is_self" /></NFormItem><NFormItem v-if="!draft.is_self" label="同事姓名"><NInput v-model:value="draft.person" @focus="draft.person==='我'&&(draft.person='')" /></NFormItem><NFormItem label="项目"><NSelect v-model:value="draft.project_name" filterable tag :options="projects" placeholder="选择或输入项目名称" /></NFormItem><NFormItem label="担任角色"><NInput v-model:value="draft.role" placeholder="可选" /></NFormItem></div>
        <NFormItem :label="draft.kind==='participation'?'经历名称':draft.kind==='work'?'工作内容':'节点名称'"><NInput v-model:value="draft.title" :placeholder="draft.kind==='participation'?'例如：第一期建设':draft.kind==='work'?'例如：需求调研':'例如：首次上线'" /></NFormItem>
        <div class="form-grid"><NFormItem :label="draft.kind==='milestone'?'发生时间':'开始时间'"><NInput v-model:value="draft.start" placeholder="2025-03 或 2025-03-12" /></NFormItem><NFormItem label="大约时间"><NSwitch v-model:value="draft.approximate" /></NFormItem></div>
        <NFormItem v-if="draft.kind!=='milestone'" label="记录状态"><NSelect v-model:value="draft.tracking" :options="statuses" /></NFormItem>
        <NFormItem v-if="draft.kind!=='milestone'&&draft.tracking==='ended'" :label="draft.kind==='participation'?'实际退出时间':'实际结束时间'"><NInput v-model:value="draft.end" placeholder="YYYY-MM 或 YYYY-MM-DD" /></NFormItem>
        <NFormItem v-if="draft.kind!=='milestone'&&draft.tracking==='cutoff'" label="已知情况截至"><NInput v-model:value="draft.cutoff" placeholder="YYYY-MM 或 YYYY-MM-DD" /></NFormItem>
        <NFormItem label="标签"><NInput v-model:value="draft.tags" placeholder="用逗号分隔，例如：开发，交付" /></NFormItem>
        <NFormItem label="成果与备注"><NInput v-model:value="draft.notes" type="textarea" placeholder="可选" :autosize="{minRows:2,maxRows:6}" /></NFormItem>
        <div class="form-actions"><NButton :disabled="saving" @click="show=false">取消</NButton><NButton type="primary" attr-type="submit" :loading="saving">保存</NButton></div>
      </NForm>
    </NModal>
  </div>
</template>
<style scoped>
.journey-page{height:100%;overflow:auto;padding:32px 40px;background:var(--page);box-sizing:border-box}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.eyebrow{font-size:11px;letter-spacing:2px;color:var(--muted)}h1{font-size:26px;margin:6px 0 0}h2{font-size:15px;color:#62718a;margin:24px 0 14px}h3{margin:10px 0 6px;font-size:17px}h3 button{border:0;background:none;font:inherit;color:inherit;padding:0;cursor:pointer;text-align:left}.perspectives{display:flex;gap:8px;margin-bottom:22px}.filters{display:flex;gap:12px}.filters>.n-input{flex:2}.filters>.n-select{flex:1;min-width:130px}.overview{display:flex;gap:24px;align-items:center;margin:24px 0;color:var(--muted);font-size:12px}.overview strong{color:#243653;font-size:20px;margin-right:4px}.view-switch{margin-left:auto;display:flex;gap:5px}.record{background:white;border:1px solid var(--line);border-radius:10px;margin-bottom:14px;padding:18px 22px;border-left:3px solid #99aac8}.record.participation{border-left-color:#4265cc}.record.milestone{border-left-color:#c99743}.record-head{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--muted)}.record-head time{margin-left:auto}.record-kind{font-weight:600}.record-meta,.parent{font-size:12px;color:#6e7e93}.parent{margin-top:5px}p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.7}.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.actions{display:flex;justify-content:flex-end;gap:5px;margin-top:10px}.timeline section{padding-left:22px;border-left:1px solid #dbe2ef}.timeline h2{position:relative}.timeline h2:before{content:'';position:absolute;width:8px;height:8px;border-radius:50%;background:#4265cc;left:-27px;top:8px}.empty{padding:90px 0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.form-actions{display:flex;justify-content:flex-end;gap:10px}.list .record{border-left-width:1px;padding:12px 18px}.list section{margin-bottom:24px}.gantt-wrap{background:white;border:1px solid var(--line);border-radius:10px;padding:20px;overflow:auto}.gantt-scale{display:flex;justify-content:space-between;margin-left:220px;margin-right:230px;font-size:11px;color:var(--muted)}.gantt-row{display:flex;align-items:center;min-width:760px;gap:12px;padding:12px 0;border-bottom:1px solid #edf0f5}.gantt-label{width:208px;flex-shrink:0;border:0;background:none;text-align:left;cursor:pointer;color:#253954;overflow-wrap:anywhere}.gantt-label.child{padding-left:20px}.gantt-label small{display:block;color:var(--muted);margin-top:5px}.gantt-track{position:relative;flex:1;height:24px;background:repeating-linear-gradient(90deg,#f3f5fa 0,#f3f5fa 1px,transparent 1px,transparent 25%)}.gantt-bar{position:absolute;top:3px;height:18px;min-width:8px;background:#5676d4;border:0;border-radius:4px;cursor:pointer}.gantt-bar.unknown{background:#fff3db;border:1px dashed #ba8527}.gantt-bar.following{background:linear-gradient(90deg,#5676d4,#5676d422);border-right:1px dashed #5676d4}.gantt-bar.milestone{background:#c99743;min-width:10px;width:10px!important;transform:rotate(45deg);border-radius:1px}.gantt-status{width:218px;font-size:11px;color:var(--muted)}@media(max-width:1100px){.journey-page{padding:24px}.filters{flex-wrap:wrap}.record-head{flex-wrap:wrap}.record-head time{margin-left:0}.overview{gap:12px;flex-wrap:wrap}}
</style>
