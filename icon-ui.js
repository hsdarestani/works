/* A+ Works — dependency-free SVG icon system */
const ICON_PATHS={
  search:'<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path>',
  refresh:'<path d="M20 6v5h-5"></path><path d="M4 18v-5h5"></path><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 11"></path><path d="m4 13 2.4 4.6A7 7 0 0 0 18 15"></path>',
  cloud:'<path d="M17.5 19H8a6 6 0 1 1 1.2-11.9A7 7 0 0 1 22 11.5 4.5 4.5 0 0 1 17.5 19Z"></path><path d="m9.5 13 2 2 4-4"></path>',
  folders:'<path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h4"></path>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5Z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 17 9 5 9-5"></path>',
  clock:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  checkcircle:'<circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect>',
  building:'<path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"></path><path d="M16 8h3a1 1 0 0 1 1 1v12"></path><path d="M8 7h4M8 11h4M8 15h4M9 21v-2h2v2"></path>',
  boxes:'<path d="m12 2 4 2.2v4.6L12 11 8 8.8V4.2L12 2Z"></path><path d="m6 11 4 2.2v4.6L6 20l-4-2.2v-4.6L6 11Z"></path><path d="m18 11 4 2.2v4.6L18 20l-4-2.2v-4.6l4-2.2Z"></path>',
  globe:'<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>',
  smartphone:'<rect x="6" y="2" width="12" height="20" rx="3"></rect><path d="M10 5h4M11 18h2"></path>',
  flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"></path><path d="M8 15h8"></path>',
  chevron:'<path d="m6 9 6 6 6-6"></path>',
  external:'<path d="M15 4h5v5"></path><path d="m10 14 10-10"></path><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"></path>',
  website:'<circle cx="12" cy="12" r="9"></circle><path d="M3 9h18M3 15h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path>',
  seo:'<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"></path><path d="m3 6 5-3 5 4 8-5"></path>',
  redesign:'<path d="M4 7h10M4 12h7M4 17h5"></path><path d="m15 15 4-4 3 3-4 4-4 1 1-4Z"></path>',
  app:'<rect x="4" y="3" width="16" height="18" rx="4"></rect><path d="M9 7h6M8 12h2M14 12h2M8 16h2M14 16h2"></path>',
  product:'<path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z"></path><path d="m4.5 6.8 7.5 4.3 7.5-4.3M12 11v9"></path>',
  demo:'<rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="m10 9 5 2.5-5 2.5V9Z"></path><path d="M8 22h8"></path>',
  design:'<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path><path d="m15 5 3 3"></path>',
  internal:'<rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M8 8h8v8H8z"></path>',
  message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A8 8 0 1 1 21 15Z"></path>',
  plus:'<path d="M12 5v14M5 12h14"></path>',
  close:'<path d="m6 6 12 12M18 6 6 18"></path>',
  save:'<path d="M4 4h13l3 3v13H4Z"></path><path d="M8 4v6h8V4M8 20v-6h8v6"></path>',
  arrowright:'<path d="M5 12h14M13 6l6 6-6 6"></path>',
  user:'<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
  idea:'<path d="M9 18h6M10 22h4"></path><path d="M8.5 15.5A7 7 0 1 1 15.5 15.5C14.6 16.3 14 17 14 18h-4c0-1-.6-1.7-1.5-2.5Z"></path>',
  planning:'<rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 18h6"></path>',
  in_progress:'<path d="M12 3a9 9 0 1 1-6.4 2.7"></path><path d="M3 4v6h6"></path>',
  review:'<path d="M4 5h16v12H8l-4 4Z"></path><path d="M8 9h8M8 13h5"></path>',
  live:'<path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"></path><circle cx="12" cy="12" r="1.5"></circle>',
  maintenance:'<path d="M14.5 6.5a4 4 0 0 0-5-5l2.3 2.3-2.8 2.8-2.3-2.3a4 4 0 0 0 5 5L20 17.6 17.6 20l-8.3-8.3"></path>',
  paused:'<circle cx="12" cy="12" r="9"></circle><path d="M10 9v6M14 9v6"></path>',
  done:'<path d="m5 12 4 4L19 6"></path>'
};

function uiIcon(name,classes=''){
  return `<svg class="ui-svg ${classes}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]||ICON_PATHS.internal}</svg>`;
}

const ACCOUNT_ICONS={own_company:'building',own_product:'boxes',website_client:'globe',app_client:'smartphone',demo:'flask'};
const PROJECT_ICONS={website:'website',seo:'seo',redesign:'redesign',app:'app',product:'product',demo:'demo',design:'design',internal:'internal'};
const STATUS_ICONS={idea:'idea',demo:'flask',planning:'planning',in_progress:'in_progress',review:'review',live:'live',maintenance:'maintenance',paused:'paused',done:'done'};

function enhanceStaticIcons(){
  const search=$('.search');
  if(search&&!search.querySelector('.search-icon')){
    [...search.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());
    search.insertAdjacentHTML('afterbegin',`<span class="search-icon">${uiIcon('search')}</span>`);
  }
  const refresh=$('#refresh');if(refresh)refresh.innerHTML=uiIcon('refresh');
  const metricIcons=['folders','layers','clock','checkcircle'];
  $$('.metric').forEach((el,i)=>{if(!el.querySelector('.metric-icon'))el.insertAdjacentHTML('afterbegin',`<span class="metric-icon">${uiIcon(metricIcons[i]||'grid','lg')}</span>`)});
  const sync=$('.sync strong');if(sync&&!sync.querySelector('.sync-icon'))sync.insertAdjacentHTML('afterbegin',`<span class="sync-icon">${uiIcon('cloud')}</span>`);
  const filterIcons={all:'grid',own_company:'building',own_product:'boxes',website_client:'globe',app_client:'smartphone',demo:'flask'};
  $$('.chip').forEach(btn=>{if(!btn.querySelector('svg'))btn.insertAdjacentHTML('afterbegin',uiIcon(filterIcons[btn.dataset.filter]||'grid'))});
  enhanceActionIcons();
}

function enhanceActionIcons(){
  $$('.close').forEach(btn=>btn.innerHTML=uiIcon('close'));
  const plink=$('#plink');if(plink&&!plink.querySelector('svg'))plink.insertAdjacentHTML('afterbegin',uiIcon('external'));
  const saveBtn=$('#editform .secondary');if(saveBtn&&!saveBtn.querySelector('svg'))saveBtn.insertAdjacentHTML('afterbegin',uiIcon('save'));
  const addTask=$('#newtask .primary');if(addTask&&!addTask.querySelector('svg'))addTask.insertAdjacentHTML('afterbegin',uiIcon('plus'));
  $$('.addproject').forEach(btn=>{if(!btn.querySelector('svg')){const txt=btn.textContent.replace(/^＋\s*/, '');btn.innerHTML=uiIcon('plus')+`<span>${txt}</span>`}});
  const pmSubmit=$('#pm-submit');if(pmSubmit&&!pmSubmit.querySelector('svg'))pmSubmit.insertAdjacentHTML('afterbegin',uiIcon('plus'));
}

function enhanceGridIcons(){
  const accounts=visible();
  $$('.account').forEach((card,index)=>{
    const account=accounts[index];if(!account)return;
    const avatar=card.querySelector('.avatar');if(avatar)avatar.innerHTML=uiIcon(ACCOUNT_ICONS[account.type]||'building','lg');
    const caret=card.querySelector('.summary > span:last-child');if(caret){caret.className='summary-caret';caret.innerHTML=uiIcon('chevron')}
    const projects=S.data.projects.filter(p=>+p.account_id===+account.id).sort((a,b)=>a.sort_order-b.sort_order);
    card.querySelectorAll('.project').forEach((row,pIndex)=>{
      const project=projects[pIndex];if(!project)return;
      const pi=row.querySelector('.pi');if(pi)pi.innerHTML=uiIcon(PROJECT_ICONS[project.kind]||'internal');
      const status=row.querySelector('.status');if(status&&!status.querySelector('svg'))status.insertAdjacentHTML('afterbegin',uiIcon(STATUS_ICONS[project.status]||'planning','sm'));
      const ext=row.querySelector('.ext');if(ext)ext.innerHTML=uiIcon('external');
    });
  });
  enhanceActionIcons();
}

function enhanceTaskIcons(){
  $$('.ctoggle').forEach(btn=>{
    const count=btn.textContent.replace(/[^0-9]/g,'')||'0';
    btn.innerHTML=uiIcon('message')+`<span>${count}</span>`;
  });
  $$('.commentform .secondary,.replyform .secondary').forEach(btn=>{if(!btn.querySelector('svg'))btn.insertAdjacentHTML('afterbegin',uiIcon('arrowright'))});
  enhanceActionIcons();
}

const iconicRenderGrid=renderGrid;
renderGrid=function(){iconicRenderGrid();enhanceGridIcons()};
const iconicRenderTasks=renderTasks;
renderTasks=function(){iconicRenderTasks();enhanceTaskIcons()};
const iconicRenderDrawer=renderDrawer;
renderDrawer=function(){iconicRenderDrawer();enhanceActionIcons();enhanceTaskIcons()};
const iconicRender=render;
render=function(){iconicRender();enhanceStaticIcons();enhanceGridIcons();enhanceActionIcons()};

requestAnimationFrame(()=>{enhanceStaticIcons();enhanceGridIcons();enhanceTaskIcons()});
