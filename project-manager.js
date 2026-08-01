Object.assign(L.de,{
  newproject:'Neues Projekt',createproject:'Projekt anlegen',projectname:'Projektname (Deutsch)',projectnamefa:'Projektname (Persisch, optional)',projecttype:'Projekttyp',projectstatus:'Status',projecturl:'Projekt-Link (optional)',cancel:'Abbrechen',design:'Design & Print',internal:'Intern',created:'Projekt wurde angelegt.'
});
Object.assign(L.fa,{
  newproject:'پروژه جدید',createproject:'ساخت پروژه',projectname:'نام پروژه به آلمانی',projectnamefa:'نام پروژه به فارسی (اختیاری)',projecttype:'نوع پروژه',projectstatus:'وضعیت',projecturl:'لینک پروژه (اختیاری)',cancel:'انصراف',design:'طراحی و چاپ',internal:'داخلی',created:'پروژه ساخته شد.'
});

const businessCardProject={
  id:106,account_id:1,title_de:'Business Card',title_fa:'کارت ویزیت',
  description_de:'Konzeption, Gestaltung und Druckvorbereitung der A+ Solution Visitenkarte.',
  description_fa:'طراحی، نهایی‌سازی و آماده‌سازی چاپ کارت ویزیت A+ Solution.',
  kind:'design',status:'in_progress',url:null,progress:50,sort_order:6,
  created_at:new Date().toISOString()
};

if(typeof P!=='undefined'&&!P.some(p=>+p.id===106))P.push(businessCardProject);

const projectManagerStyle=document.createElement('style');
projectManagerStyle.textContent=`
.addproject{width:100%;border:0;border-radius:15px;padding:11px 13px;background:transparent;color:var(--p);font-weight:850;cursor:pointer;box-shadow:var(--shadow2);margin-top:2px}
.addproject:hover{box-shadow:var(--inset)}
.project-modal{position:fixed;inset:0;z-index:350;display:grid;place-items:center;padding:16px}
.project-modal[hidden]{display:none}.project-modal-back{position:absolute;inset:0;background:rgba(25,34,56,.3);backdrop-filter:blur(8px)}
.project-modal-box{position:relative;width:min(560px,100%);border-radius:28px;padding:24px;max-height:calc(100vh - 32px);overflow:auto}
.project-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.project-modal-head h2{margin:4px 0 0;font-size:30px;letter-spacing:-.04em}.project-modal-head small{color:var(--p);font-weight:850}
.project-form{display:grid;gap:13px;margin-top:20px}.project-form label{display:grid;gap:7px;color:var(--muted);font-size:12px;font-weight:750}.project-form input,.project-form select{width:100%;border:0;background:var(--bg);box-shadow:var(--inset);border-radius:13px;padding:12px;color:var(--ink);outline:0}
.project-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.project-form-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:5px}.project-form-actions .primary{width:auto}
@media(max-width:560px){.project-form-grid{grid-template-columns:1fr}.project-form-actions{flex-direction:column-reverse}.project-form-actions button{width:100%}}
`;
document.head.append(projectManagerStyle);

document.body.insertAdjacentHTML('beforeend',`
<div class="project-modal" id="projectModal" hidden>
  <div class="project-modal-back" data-project-close></div>
  <section class="project-modal-box soft">
    <header class="project-modal-head">
      <div><small id="pm-account"></small><h2 id="pm-title"></h2></div>
      <button class="close" type="button" data-project-close>×</button>
    </header>
    <form class="project-form" id="projectForm">
      <input type="hidden" id="pm-account-id">
      <label><span id="pm-name-label"></span><input id="pm-name" maxlength="160" required></label>
      <label><span id="pm-name-fa-label"></span><input id="pm-name-fa" maxlength="160" dir="rtl"></label>
      <div class="project-form-grid">
        <label><span id="pm-kind-label"></span><select id="pm-kind"></select></label>
        <label><span id="pm-status-label"></span><select id="pm-status"></select></label>
      </div>
      <label><span id="pm-url-label"></span><input id="pm-url" type="url" placeholder="https://…"></label>
      <label><span data-t="progress">Fortschritt</span><div class="range"><input id="pm-progress" type="range" min="0" max="100" step="5" value="0"><output id="pm-progress-out">0%</output></div></label>
      <div class="project-form-actions"><button class="secondary" type="button" data-project-close id="pm-cancel"></button><button class="primary" type="submit" id="pm-submit"></button></div>
    </form>
  </section>
</div>`);

const pm=$('#projectModal');
function projectModalText(){
  $('#pm-title').textContent=tr('createproject');$('#pm-name-label').textContent=tr('projectname');$('#pm-name-fa-label').textContent=tr('projectnamefa');
  $('#pm-kind-label').textContent=tr('projecttype');$('#pm-status-label').textContent=tr('projectstatus');$('#pm-url-label').textContent=tr('projecturl');
  $('#pm-cancel').textContent=tr('cancel');$('#pm-submit').textContent=tr('createproject');
  $('#pm-kind').innerHTML=['design','website','seo','redesign','app','product','demo','internal'].map(k=>`<option value="${k}">${tr(k)}</option>`).join('');
  $('#pm-status').innerHTML=['idea','planning','in_progress','review','live','maintenance','paused','done'].map(s=>`<option value="${s}" ${s==='planning'?'selected':''}>${statusText(s)}</option>`).join('');
}
function openProjectModal(accountId){
  const account=S.data.accounts.find(a=>+a.id===+accountId);if(!account)return;
  projectModalText();$('#pm-account-id').value=accountId;$('#pm-account').textContent=name(account);$('#projectForm').reset();
  $('#pm-account-id').value=accountId;$('#pm-kind').value='design';$('#pm-status').value='planning';$('#pm-progress').value=0;$('#pm-progress-out').textContent='0%';pm.hidden=false;$('#pm-name').focus();
}
function closeProjectModal(){pm.hidden=true}
$$('[data-project-close]').forEach(x=>x.onclick=closeProjectModal);
$('#pm-progress').oninput=e=>$('#pm-progress-out').textContent=e.target.value+'%';

function enhanceAccountCards(){
  if(!S.data)return;const arr=visible();
  $$('.account').forEach((card,index)=>{const account=arr[index],box=card.querySelector('.projects');if(!account||!box||box.querySelector('.addproject'))return;
    const button=document.createElement('button');button.type='button';button.className='addproject';button.textContent='＋ '+tr('newproject');button.onclick=e=>{e.stopPropagation();openProjectModal(account.id)};box.append(button);
  });
}
function ensureLocalBusinessCard(){
  if(!S.data||S.mode==='remote'||S.data.projects.some(p=>+p.id===106))return;
  S.data.projects.push({...businessCardProject});save();
}
const baseRenderGrid=renderGrid;
renderGrid=function(){baseRenderGrid();enhanceAccountCards()};
const baseRender=render;
render=function(){ensureLocalBusinessCard();baseRender()};

async function createProjectRecord(payload){
  if(S.mode==='remote')return api('projects',{method:'POST',body:JSON.stringify(payload)});
  const siblings=S.data.projects.filter(p=>+p.account_id===+payload.account_id);
  const created={id:next(S.data.projects),account_id:payload.account_id,title_de:payload.title_de,title_fa:payload.title_fa||'',description_de:'',description_fa:'',kind:payload.kind,status:payload.status,url:payload.url||null,progress:payload.progress||0,sort_order:siblings.reduce((m,p)=>Math.max(m,+p.sort_order||0),0)+1,created_at:new Date().toISOString()};
  S.data.projects.push(created);save();return created;
}
$('#projectForm').onsubmit=async e=>{
  e.preventDefault();const payload={account_id:+$('#pm-account-id').value,title_de:$('#pm-name').value.trim(),title_fa:$('#pm-name-fa').value.trim(),kind:$('#pm-kind').value,status:$('#pm-status').value,url:$('#pm-url').value.trim()||null,progress:+$('#pm-progress').value};
  if(!payload.title_de)return;
  try{const created=await createProjectRecord(payload);S.data.projects.push(...(S.mode==='remote'?[created]:[]));S.open.add(payload.account_id);closeProjectModal();render();openProject(created.id);toast(tr('created'))}catch(err){toast(err.message||tr('err'))}
};

setTimeout(()=>{if(S.data){ensureLocalBusinessCard();render()}else enhanceAccountCards()},0);
