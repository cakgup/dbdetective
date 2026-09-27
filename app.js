const App = {
  state: null,
  labs: [],
  route: 'home',
  tab: '',
  labDay: 1,
  selectedLab: null,
  console: 'os',
  reportFilter: {target:'PDB1_26AI', user:'', objectOwner:'', object:'', source:'', policy:''},
  reportSort: 'desc',
  reportKind: 'all',
  _reportRows: [],

  async init(){
    await this.refresh();
    if(!sessionStorage.getItem('avdf_login')) document.getElementById('loginScreen').classList.remove('hidden');
    const hash = location.hash.replace('#/','');
    if(hash) this.route=hash.split('?')[0];
    this.render();
    window.addEventListener('hashchange',()=>{const h=location.hash.replace('#/','');if(h){this.route=h.split('?')[0];this.render();}});
  },

  async login(){
    const u=document.getElementById('loginUser').value.trim().toLowerCase(), p=document.getElementById('loginPass').value;
    if(!['admin','auditor'].includes(u)||p!=='oracle'){this.toast('Invalid training credentials');return;}
    sessionStorage.setItem('avdf_login',u); document.getElementById('loginScreen').classList.add('hidden'); await this.setRole(u==='auditor'?'auditor':'admin');
  },
  logout(){sessionStorage.removeItem('avdf_login');document.getElementById('loginScreen').classList.remove('hidden');},
  async api(url, opts={}){
    if(url==='/api/state'){if(!StaticEngine.state)await StaticEngine.init();return StaticEngine.state;}
    if(url.startsWith('/api/labs')){const q=new URLSearchParams(url.split('?')[1]||'');const day=+(q.get('day')||0),search=(q.get('q')||'').toLowerCase();let labs=StaticEngine.labs;if(day)labs=labs.filter(x=>x.day===day);if(search)labs=labs.filter(x=>(x.title+' '+x.section).toLowerCase().includes(search));return {labs,total:StaticEngine.labs.length};}
    const body=opts.body?JSON.parse(opts.body):{};
    if(url==='/api/action'){const message=StaticEngine.act(body.action,body.payload||{});return {ok:true,message,state:StaticEngine.state};}
    if(url==='/api/command'){const output=StaticEngine.command(body.channel,body.command);return {ok:true,output,state:StaticEngine.state};}
    if(url==='/api/reset'){StaticEngine.reset();return {ok:true,message:'Resetting static simulator',state:StaticEngine.state};}
    throw new Error('Unsupported static endpoint');
  },
  async refresh(){
    this.state=await this.api('/api/state');
    document.getElementById('roleSelect').value=this.state.meta.role;
  },
  async action(action,payload={},quiet=false){
    const j=await this.api('/api/action',{method:'POST',body:JSON.stringify({action,payload})});
    this.state=j.state; if(!quiet) this.toast(j.message||'Done'); this.render(); return j;
  },
  async reset(checkpoint='scenario01'){
    const j=await this.api('/api/reset',{method:'POST',body:JSON.stringify({checkpoint})}); this.state=j.state; this.toast(j.message); this.render();
  },
  async setRole(role){await this.action('set_role',{role},true);this.route=role==='admin'?'home':'dashboard';location.hash='#/'+this.route;},
  go(route,tab=''){this.route=route;this.tab=tab;location.hash='#/'+route;this.render();},
  toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(this._tt);this._tt=setTimeout(()=>t.classList.remove('show'),2600);},
  closeModal(){document.getElementById('modal').classList.add('hidden')},
  modal(html){document.getElementById('modalBody').innerHTML=html;document.getElementById('modal').classList.remove('hidden')},

  render(){
    if(!this.state) return;
    this.renderNav();
    const fn={home:this.home,dashboard:this.dashboard,insights:this.insights,targets:this.targets,agents:this.agents,firewalls:this.firewalls,retention:this.retention,policies:this.policies,alerts:this.alerts,reports:this.reports,settings:this.settings,labs:this.labCenter,console:this.consolePage,trainer:this.trainer}[this.route]||this.home;
    document.getElementById('crumbs').innerHTML=`Oracle AVDF Training &nbsp;›&nbsp; ${esc(titleCase(this.route))}`;
    document.getElementById('page').innerHTML=fn.call(this);
    this.bindPage();
  },
  renderNav(){
    document.getElementById('roleSelect').value=this.state.meta.role;
    const admin=[['home','Home','home'],['targets','Targets','target'],['agents','Agents','agent'],['firewalls','Database Firewalls','firewall'],['retention','Data Retention','archive'],['settings','Settings','settings']];
    const auditor=[['dashboard','Home','home'],['targets','Targets','target'],['policies','Policies','policy'],['alerts','Alerts','alert'],['reports','Reports','report'],['settings','Settings','settings']];
    const nav=this.state.meta.role==='admin'?admin:auditor;
    document.getElementById('topNav').innerHTML=nav.map(([r,n,i])=>`<button class="${this.route===r?'active':''}" onclick="App.go('${r}')">${navIcon(i)}<span>${esc(n)}</span></button>`).join('');
    const side={
      targets:[['targets','Targets'],['trails','Audit Trails'],['firewall','Database Firewall Monitoring'],['groups','Target Groups'],['rights','Access Rights'],['entitlements','User Entitlement Snapshots']],
      policies:[['audit','Audit Policies'],['firewall','Database Firewall Policies'],['alert','Alert Policies']],
      reports:[['activity','Activity Reports'],['summary','Summary Reports'],['compliance','Compliance Reports'],['pdf','PDF/XLS Reports'],['entitlement','Entitlement Reports'],['stored','Stored Procedure Changes'],['saved','Saved Reports'],['scheduled','Report Schedules'],['generated','Generated Reports']],
      settings:[['jobs','Jobs'],['users','User Accounts'],['system','System'],['network','Network']]
    };
    const items=side[this.route]||[];
    const current=this.tab||items[0]?.[0]||'';
    document.getElementById('leftNav').innerHTML=items.length?items.map(([t,n])=>`<button class="${current===t?'active':''}" onclick="App.tab='${t}';App.render()">${esc(n)}</button>`).join(''):`<button class="active">${esc(titleCase(this.route))}</button>`;
  },
  bindPage(){},

  pageHeader(title,desc,actions=''){return `<div class="page-header"><div class="page-title"><h1>${esc(title)}</h1><p>${desc}</p></div><div class="actions">${actions}</div></div>`},
  status(v){const s=String(v||'');const cl=/RUNNING|ACTIVE|OPEN|READ WRITE|COLLECTING|COMPLETED|PUBLISHED|ENABLED|REGISTERED/i.test(s)?'good':/IDLE|MOUNTED|STARTING|INSTALLED/i.test(s)?'warn':/STOP|FAIL|ERROR|DOWN|NOT/i.test(s)?'bad':'info';return `<span class="status ${cl}">${esc(s)}</span>`},
  badge(v){let c=/Critical|FAIL|STOP|ERROR/i.test(v)?'red':/RUNNING|SUCCESS|OPEN|Published|Completed|Enabled|Registered/i.test(v)?'green':/Major|Moderate|IDLE|Installed/i.test(v)?'orange':'gray';return `<span class="badge ${c}">${esc(v)}</span>`},

  home(){
    const s=this.state, t=s.targets[0], tr=s.trails, fw=s.firewalls[0], mp=s.monitoring_points[0];
    const alerts=s.alerts.filter(a=>a.status!=='Closed');
    return this.pageHeader('Home','High-level system status for targets, audit collection, Database Firewall monitoring, jobs, retention, and system health.',`<button class="btn" onclick="App.refresh().then(()=>App.render())">Refresh</button>`)+
    `<div class="kpi-strip">
      ${kpi(s.targets.length,'Targets',t?t.status:'Not configured')}
      ${kpi(tr.length,'Audit Trails',tr.length?tr.map(x=>x.status).join(' / '):'None')}
      ${kpi(s.firewalls.length,'Database Firewalls',fw?fw.status:'Not registered')}
      ${kpi(alerts.length,'Open Alerts',alerts[0]?alerts[0].severity:'None')}
      ${kpi(s.jobs.length,'Jobs',s.jobs[0]?s.jobs[0].status:'No jobs')}
    </div>
    <div class="grid cols-2">
      ${card('System Overview',summaryRows([
        ['Database service',s.system.database_service],['Listener',s.system.listener],['CDB',s.system.cdb],['PDB1',s.system.pdb1],['Oracle',s.environment.oracle],['AVDF baseline',s.environment.avdf_version]
      ],this.status.bind(this)))}
      ${card('Audit Collection', tr.length?table(['Type','Location','Target','Status'],tr.map(x=>[x.type,x.location||'—',x.target,this.status(x.status)])):'<div class="empty">No audit trails configured yet.</div>')}
      ${card('Database Firewall Monitoring', mp?summaryRows([['Firewall',mp.firewall],['Target',mp.target],['Mode',mp.mode],['Address',mp.address],['Policy',mp.policy],['Status',mp.status]],this.status.bind(this)):'<div class="empty">No monitoring point configured.</div>')}
      ${card('System Alerts', alerts.length?table(['Severity','Message','Target','Status'],alerts.slice(0,8).map(a=>[`<span class="severity-${esc(a.severity)}">${esc(a.severity)}</span>`,a.message,a.target,this.badge(a.status)])):'<div class="empty">No open alerts.</div>')}
    </div>`;
  },
  dashboard(){
    const s=this.state; const ev=[...s.db.native_events,...s.firewall_events]; const open=s.alerts.filter(a=>a.status!=='Closed');
    const userCounts=countBy(ev,e=>e.dbusername||e.user||'Unknown');
    return this.pageHeader('Dashboard','Auditor view of database activity, alerts, targets, policies, and investigation signals.',`<button class="btn primary" onclick="App.go('reports')">Open Reports</button>`)+
    `<div class="kpi-strip">${kpi(ev.length,'Collected Events','Native + network')}${kpi(open.length,'Open Alerts',open[0]?.severity||'None')}${kpi(s.targets.length,'Targets','Accessible')}${kpi(s.firewall_policies.length,'Firewall Policies','Defined')}${kpi(s.entitlement_snapshots.length,'Entitlement Snapshots','Available')}</div>
    <div class="grid cols-2">${card('Top Database Users',barList(userCounts))}${card('Recent Alerts',open.length?table(['Time','Severity','User','Policy'],open.slice(0,7).map(a=>[fmtTime(a.time),a.severity,a.user||'—',a.policy||'—'])):'<div class="empty">No alerts.</div>')}${card('Recent Activity',activityTable(ev.slice(0,10)))}${card('Target Health',this.targetHealth())}</div>`;
  },
  insights(){
    const s=this.state; const nat=s.db.native_events, fw=s.firewall_events;
    return this.pageHeader('Audit Insights','Summarized view of target activity and independent evidence sources used by the detective-control workflow.')+
    `<div class="grid cols-3">${card('Native Audit Evidence',`<div class="metric"><div><div class="num">${nat.length}</div><div class="label">Unified Audit events</div></div></div><div class="callout">Answers who, what database action, object, success/failure, and native SQL context.</div>`)}${card('Database Firewall Evidence',`<div class="metric"><div><div class="num">${fw.length}</div><div class="label">Network SQL events</div></div></div><div class="callout">Answers SQL network behavior, source, policy match, row count, and suspicious patterns.</div>`)}${card('Entitlement Evidence',`<div class="metric"><div><div class="num">${s.entitlement_snapshots.length}</div><div class="label">Snapshots</div></div></div><div class="callout">Explains what access users had and whether privileges drifted from baseline.</div>`)}</div>
    ${card('Five-Day Detective Model',`<div class="topology">ACTIVITY\n   │\n   ▼\nOBSERVE ──► AUDIT + MONITOR\n   │\n   ▼\nDETECT → ALERT → CORRELATE → INVESTIGATE → REPORT → COMPLIANCE</div>`)}`;
  },
  targetHealth(){const s=this.state,t=s.targets[0];if(!t)return '<div class="empty">No secured target registered.</div>';return summaryRows([['Name',t.name],['Type',t.type],['JDBC',t.jdbc],['Retention',t.retention_policy],['Firewall Policy',t.firewall_policy],['Status',t.status]],this.status.bind(this));},
  targets(){
    const s=this.state,t=s.targets[0],tab=this.tab||'targets';
    if(!t){
      return this.pageHeader('Targets','Register a secured target to begin audit collection.',`<button class="btn primary" onclick="App.registerTargetModal()">Register</button><button class="btn" onclick="App.action('download_setup_script')">Target Setup Script</button>`)+`<div class="empty"><h3>No secured targets</h3><p>Register PDB1_26AI using the Day 1 worksheet.</p><button class="btn primary" onclick="App.registerTargetModal()">Register Target</button></div>`;
    }
    if(tab==='trails'){
      return this.pageHeader('Audit Trails','Audit data collection trails configured for PDB1_26AI.',`<button class="btn" onclick="App.action('add_table_trail')">Add TABLE Trail</button><button class="btn" onclick="App.action('add_network_trail')">Add NETWORK Trail</button>`)+avdfRegion('Audit Trails',s.trails.length?table(['','Trail Location','Trail Type','Status','Agent / Host','Last Start','Data Collected Through'],s.trails.map(x=>['<span class="row-doc-icon"></span>',x.location||'—',x.type,this.status(x.status),x.host||'agentless collection',fmtTime(x.last_start||s.meta.updated_at),fmtTime(x.collected_through||s.meta.updated_at)])):'<div class="empty">No audit trails configured.</div>');
    }
    if(tab==='firewall'){
      const mp=s.monitoring_points[0];
      return this.pageHeader('Database Firewall Monitoring','Monitoring points associated with this secured target.')+avdfRegion('Database Firewall Monitoring',mp?table(['Target','Firewall','Mode','Address','Database Response','Policy','Status'],[[mp.target,mp.firewall,mp.mode,mp.address,mp.database_response?'Enabled':'Disabled',mp.policy,this.status(mp.status)]])+`<div class="table-actions"><button class="btn" onclick="App.action('toggle_monitor')">Start / Stop</button> <button class="btn" onclick="App.action('enable_response_monitoring')">Enable Database Response</button></div>`:`<div class="empty">No monitoring point.<br><br><button class="btn primary" onclick="App.action('create_monitor')">Create Monitoring Point</button></div>`);
    }
    if(tab==='groups'){
      return this.pageHeader('Target Groups','Organize secured targets for auditor access and compliance reporting.',`<button class="btn" onclick="App.action('create_target_group')">Create D5_TRAINING_GROUP</button> <button class="btn primary" onclick="App.action('add_target_to_group')">Add PDB1_26AI</button>`)+avdfRegion('Target Groups',s.target_groups.length?table(['Name','Description','Members'],s.target_groups.map(g=>[g.name,g.description||'—',g.targets.join(', ')||'—'])):'<div class="empty">No target groups.</div>');
    }
    if(tab==='rights'){
      return this.pageHeader('Access Rights','Training representation of auditor access to secured targets.')+avdfRegion('Access Rights',table(['User','Role','Target / Group','Permission'],[['auditor','Auditor',t.name,'View reports, policies and alerts'],['admin','Administrator',t.name,'Configure target and collection']]));
    }
    if(tab==='entitlements'){
      return this.pageHeader('User Entitlement Snapshots','Point-in-time snapshots of users, roles and privileges.',`<button class="btn" onclick="App.action('retrieve_entitlements')">Retrieve</button> <button class="btn" onclick="App.action('label_latest_entitlement',{label:'D5_BASELINE',description:'Approved entitlement baseline before Day 5 privilege changes'})">Label Baseline</button> <button class="btn primary" onclick="App.action('label_latest_entitlement',{label:'D5_AFTER_ESCALATION',description:'Entitlement state after deliberate privilege escalation'})">Label After Escalation</button>`)+avdfRegion('User Entitlement Snapshots',s.entitlement_snapshots.length?table(['','Retrieval Time','Label','Target'],s.entitlement_snapshots.map(x=>['<span class="row-doc-icon"></span>',fmtTime(x.time),x.label||'—',x.target])):'<div class="empty">No entitlement snapshots.</div>');
    }
    const tr=s.trails, mp=s.monitoring_points[0];
    return this.pageHeader(`${t.name} (Oracle Database)`,'',`<button class="btn">Cancel</button>`)+
      `<div class="avdf-split"><div class="property-grid" style="grid-template-columns:130px 1fr"><div class="property-label">Connection String</div><div class="property-value">${esc(t.jdbc)}</div><div class="property-label">Retention Policy</div><div class="property-value">${esc(t.retention_policy||'Not assigned')} &nbsp; <span class="link" onclick="App.go('retention')">✎</span></div></div><div class="property-grid" style="grid-template-columns:100px 1fr"><div class="property-label">Description</div><div class="property-value">Oracle AI Database 26ai training target</div><div class="property-label">Status</div><div class="property-value">${this.status(t.status)}</div></div></div>`+
      avdfRegion('Audit Data Collection',tr.length?table(['','Trail Location','Trail Type','Status','Agent','Last Start','Data Collected Through'],tr.map(x=>['<span class="row-doc-icon"></span>',x.location||'—',x.type,this.status(x.status),x.host||'agentless collection',fmtTime(x.last_start||s.meta.updated_at),fmtTime(x.collected_through||s.meta.updated_at)])):'<div class="empty">No audit data collection trail configured.</div>',`<button class="btn" onclick="App.action('add_table_trail')">Add</button>`)+
      avdfRegion('Database Firewall Monitoring',mp?table(['Firewall','Mode','Address','Policy','Database Response','Status'],[[mp.firewall,mp.mode,mp.address,mp.policy,mp.database_response?'Enabled':'Disabled',this.status(mp.status)]])+'<div class="table-actions"><button class="btn" onclick="App.action(\'toggle_monitor\')">Start / Stop</button></div>':'<div class="empty">Database Firewall monitoring is not configured for this target.</div>')+
      `<div class="avdf-region"><div class="avdf-region-title"><span>Audit Policy</span><span>User Entitlements</span><span>Stored Procedure Auditing</span></div></div>`;
  },
  registerTargetModal(){
    const e=this.state.environment;
    this.modal(`<div class="modal-head"><b>Register Target</b><button class="icon-btn" onclick="App.closeModal()">✕</button></div><div class="modal-body"><div class="grid cols-2"><div class="field"><label>Name</label><input value="PDB1_26AI" readonly></div><div class="field"><label>Type</label><select><option>Oracle Database</option></select></div><div class="field"><label>Host</label><input value="${e.listener_host}" readonly></div><div class="field"><label>Port</label><input value="${e.listener_port}" readonly></div><div class="field"><label>Service</label><input value="PDB1" readonly></div><div class="field"><label>Credential User</label><input value="AVDFCOLLECT" readonly></div><div class="field" style="grid-column:1/-1"><label>JDBC Connect String</label><input value="jdbc:oracle:thin:@//${e.listener_host}:${e.listener_port}/PDB1" readonly></div><div class="field" style="grid-column:1/-1"><label>Target Password</label><input id="targetRegPassword" type="password" value="Oracle#AVDF26" autocomplete="off"></div></div><div class="callout warn">Training credential validation is enabled. Use the Day 1 target-account password from the lab.</div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.submitTargetRegistration()">Register</button></div>`);
  },
  async submitTargetRegistration(){
    const password=document.getElementById('targetRegPassword').value;
    const j=await this.action('register_target',{password},true);
    if(j.message.startsWith('Registration failed')){this.toast(j.message);return;}
    this.closeModal();this.toast(j.message);this.render();
  },
  agents(){
    const s=this.state;
    return this.pageHeader('Agents','Register host computers, deploy the Audit Vault Agent, activate it, and monitor agent status.',`<button class="btn primary" onclick="App.registerHostModal()">Register Host</button><button class="btn" onclick="App.action('download_agent')">Download Agent</button><button class="btn" onclick="App.action('download_hostmon')">Download Host Monitor</button><button class="btn" onclick="App.action('get_activation_key')">Activation Key</button>`)+
    `${s.hosts.length?card('Agent Hosts',table(['Host','IP Address','Agent Status','Actions'],s.hosts.map(h=>[h.name,h.ip,this.badge(h.agent_status),`<button class="btn small" onclick="App.action('install_agent')">Install</button> <button class="btn small" onclick="App.action('activate_agent')">Activate</button>`]))):'<div class="empty">No hosts registered. Day 2 optional Agent track begins by registering db26ai.</div>'}
    <div class="grid cols-2" style="margin-top:15px">${card('Audit Vault Agent',summaryRows([['Package',s.system.agent_package_present?'Downloaded':'Not downloaded'],['Installed',s.system.agent_installed?'Yes':'No'],['Activated',s.system.agent_activated?'Yes':'No'],['Runtime',s.system.agent_running?'RUNNING':'STOPPED']],this.status.bind(this)))}${card('Host Monitor',summaryRows([['Package',s.system.hostmon_package_present?'Downloaded':'Not downloaded'],['Extracted',s.system.hostmon_unzipped?'Yes':'No'],['Installed',s.system.hostmon_installed?'Yes':'No'],['Runtime',s.system.hostmon_running?'RUNNING':'STOPPED']],this.status.bind(this))+`<div class="actions" style="margin-top:12px"><button class="btn small" onclick="App.action('install_hostmon')">Install Host Monitor</button></div>`)}</div>`;
  },
  registerHostModal(){this.modal(`<div class="modal-head"><b>Register Agent Host</b><button class="icon-btn" onclick="App.closeModal()">✕</button></div><div class="modal-body"><div class="field"><label>Host Name</label><input value="db26ai"></div><div class="field"><label>IP Address</label><input value="192.168.56.26"></div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('register_host')">Register</button></div>`);},
  firewalls(){
    const s=this.state,fw=s.firewalls[0],mp=s.monitoring_points[0];
    return this.pageHeader('Database Firewalls','Register and monitor Database Firewall appliances and configure monitoring points for secured targets.',`<button class="btn primary" onclick="App.firewallModal()">Register Database Firewall</button>`)+
      (fw?`${card('Database Firewalls',table(['Name','IP Address','NIC','SHA-256 Fingerprint','Status'],[[fw.name,fw.ip,fw.nic,fw.fingerprint||'—',this.badge(fw.status)]]))}<div class="grid cols-2" style="margin-top:15px">${card('Monitoring Point',mp?summaryRows([['Target',mp.target],['Firewall',mp.firewall],['Mode',mp.mode],['Network Interface',mp.nic||'eth0'],['Address',mp.address],['Policy',mp.policy],['Database Response',mp.database_response?'Enabled':'Disabled'],['Full Error Message',mp.full_error_message?'Enabled':'Disabled'],['Status',mp.status]],this.status.bind(this))+`<div class="actions" style="margin-top:12px"><button class="btn small" onclick="App.action('toggle_monitor')">Start / Stop</button><button class="btn small" onclick="App.action('enable_response_monitoring')">Enable DB Response</button></div>`:`<div class="empty">No monitoring point.<br><br><button class="btn primary" onclick="App.action('create_monitor')">Create Monitoring Point</button></div>`)}${card('Host Monitor Channel',summaryRows([['Audit Vault Agent',s.system.agent_running?'RUNNING':'STOPPED'],['Host Monitor',s.system.hostmon_running?'RUNNING':'STOPPED'],['NETWORK Trail',s.trails.some(x=>x.type==='NETWORK')?'Configured':'Not configured'],['Connectivity',s.system.dbfw_network_ok?'Reachable':'Unreachable']],this.status.bind(this)))}</div>`:'<div class="empty">No Database Firewall registered.</div>');
  },
  firewallModal(){this.modal(`<div class="modal-head"><b>Register Database Firewall</b><button class="icon-btn" onclick="App.closeModal()">✕</button></div><div class="modal-body"><div class="field"><label>Name</label><input value="DBFW1"></div><div class="field"><label>IP Address</label><input value="192.168.56.27"></div><div class="field"><label>SHA-256 Certificate Fingerprint</label><input value="9A:21:7C:61:3D:20:18:AA:DF:01:20:18:7B:9F:11:42"></div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('register_firewall')">Register</button></div>`);},
  retention(){const s=this.state;return this.pageHeader('Data Retention','View and create data retention policies, then assign them to secured targets.',`<button class="btn primary" onclick="App.action('create_retention')">Create LAB_3M_ONLINE</button>`)+card('Retention Policies',table(['Policy','Online','Archive','Type'],s.retention_policies.map(p=>[p.name,p.online_months+' months',p.archive_months+' months',p.builtin?'Pre-configured':'User-defined'])))+`<div style="margin-top:15px">${card('Target Assignment',s.targets.length?summaryRows([['Target','PDB1_26AI'],['Current Policy',s.targets[0].retention_policy]],this.status.bind(this))+`<div class="actions" style="margin-top:12px"><button class="btn small" onclick="App.action('apply_retention')">Apply LAB_3M_ONLINE</button></div>`:'<div class="empty">Register target first.</div>')}</div>`},
  policies(){
    const s=this.state,tab=this.tab||'audit';
    if(tab==='audit'){
      const pol=s.audit_policy_catalog.length?s.audit_policy_catalog:Object.values(s.db.audit_policies);
      const predefined=pol.filter(x=>x.oracle_supplied), custom=pol.filter(x=>!x.oracle_supplied);
      const core=[['Critical Database Activity',true],['Database Schema Changes',true],['Logon/Logoff Events',pol.some(x=>x.name==='AVDF_DAY1_LOGIN'&&x.enabled)],['All Admin Activity',true],['All User Activity',false]];
      const col=(items,isCore=false)=>items.map(x=>{const name=isCore?x[0]:x.name;const checked=isCore?x[1]:x.enabled;return `<label class="policy-check"><input type="checkbox" ${checked?'checked':''} disabled><span>${esc(name)}</span></label>`}).join('');
      return this.pageHeader('Audit Policies','',`<button class="btn" onclick="App.action('retrieve_audit_policies')">Retrieve</button><button class="btn primary" onclick="App.action('enable_d2_policies')">Save</button>`)+
      `<div class="policy-columns"><section class="policy-column"><h3>Core Policies</h3>${col(core,true)}<div class="policy-subtext">Exclude Users</div><textarea style="margin:8px 0 18px 28px;width:78%;height:48px;border:1px solid #ccc"></textarea></section><section class="policy-column"><h3>Oracle Predefined Policies</h3>${col(predefined)}</section><section class="policy-column"><h3>Custom Policies</h3>${custom.length?col(custom):'<div class="empty">No custom policies retrieved.</div>'}</section></div>`;
    }
    if(tab==='firewall'){
      const user=s.firewall_policies.filter(x=>!x.builtin), pre=s.firewall_policies.filter(x=>x.builtin), d4=user.find(x=>x.name==='LAB_D4_DETECTIVE');
      let out=this.pageHeader('Database Firewall Policies','',`<button class="btn primary" onclick="App.createFirewallPolicyModal()">Create</button><button class="btn" onclick="App.action('deploy_log_all')">Deploy Log all</button>${d4?'<button class="btn" onclick="App.copyD4Policy()">Copy</button><button class="btn" onclick="App.exportD4Policy()">Export</button>':''}`)+
      avdfRegion('Pre-defined Database Firewall Policies',pre.length?table(['','Policy Name','Published','Description'],pre.map(p=>['<input type="checkbox">',p.name,p.status==='Published'?'Yes':'No',p.description||'Oracle predefined firewall policy'])):'<div class="empty">No predefined policies.</div>')+
      avdfRegion('User-defined Database Firewall Policies',user.length?table(['','Policy Name','Status','Description'],user.map(p=>['<input type="checkbox">',`<span class="link">${esc(p.name)}</span>`,p.status||'Draft',p.description||'Training detective policy'])):'<div class="empty">No user-defined firewall policies.</div>',`<button class="btn" onclick="App.createFirewallPolicyModal()">Create</button>`);
      if(d4){
        const order=(d4.evaluation_order||[]).join(' → ');
        out+=avdfRegion('LAB_D4_DETECTIVE — Policy Rules',d4.rules?.length?table(['Evaluation','Rule','Rule Type','Action','Logging','Threat Severity'],d4.rules.map((r,i)=>[i+1,r.name,r.kind,r.action,r.logging||'—',r.severity||'—'])):'<div class="empty">Policy exists but has no rules yet. Build sets/profiles and add rules.</div>',`<button class="btn" onclick="App.d4SetsModal()">Sets / Profiles</button><button class="btn" onclick="App.sqlClusterModal()">SQL Cluster Sets</button><button class="btn" onclick="App.d4RuleBuilderModal()">Add Rule</button>`)+
        `<div class="grid cols-2">${card('Sets / Profiles',setsProfiles(s)+`<div class="actions" style="margin-top:12px"><button class="btn small" onclick="App.action('create_d4_user_set')">Create D4_APP_READERS</button><button class="btn small" onclick="App.action('create_d4_object_set')">Create D4_SENSITIVE_OBJECTS</button><button class="btn small" onclick="App.action('create_d4_client_set')">Create D4_SQLPLUS_CLIENT</button><button class="btn small" onclick="App.action('create_d4_profile')">Create Profile</button></div>`)}${card('Configuration',summaryRows([['Unknown Traffic',`${d4.unknown_traffic?.action||'—'} / ${d4.unknown_traffic?.severity||'—'}`],['Login Success',d4.login_logout?.success||'—'],['Login Failure',d4.login_logout?.failure||'—'],['Evaluation Order',order||'Not configured'],['Status',d4.status||'Draft']],this.status.bind(this))+`<div class="actions" style="margin-top:12px"><button class="btn small" onclick="App.action('configure_d4_default')">Default Rule</button><button class="btn small" onclick="App.action('configure_d4_unknown')">Unknown Traffic</button><button class="btn small" onclick="App.action('configure_d4_login')">Login / Logout</button><button class="btn small" onclick="App.action('add_d4_session_rule')">Session Context</button><button class="btn small" onclick="App.evaluationOrderModal()">Evaluation Order</button></div>`)}</div>`+
        `<div class="actions" style="margin-top:14px;justify-content:flex-start"><button class="btn" onclick="App.action('publish_d4_policy')">Save / Publish</button><button class="btn primary" onclick="App.action('deploy_d4_policy')">Deploy to PDB1_26AI</button><button class="btn" onclick="App.createLargeResultAlertModal()">Create Row-Count Alert</button></div>`;
      }
      return out;
    }
    return this.pageHeader('Alert Policies','',`<button class="btn primary" onclick="App.createAlertPolicyModal()">Create Failed Login Alert</button><button class="btn" onclick="App.createLargeResultAlertModal()">Create Row-Count Alert</button>`)+avdfRegion('Alert Policies',s.alert_policies.length?table(['','Alert Policy Name','Type','Severity','Condition / Threshold','Target','Status'],s.alert_policies.map(p=>['<input type="checkbox">',p.name,p.type,p.severity,p.condition||((p.operator||'>=')+' '+(p.threshold??'—')),p.target,this.badge(p.enabled?'Enabled':'Disabled')])):'<div class="empty">No alert policies.</div>');
  },
  createFirewallPolicyModal(){
    this.modal(`<div class="modal-head"><span>Create Policy</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="grid cols-2"><div class="field"><label>Target Type</label><select><option>Oracle Database</option></select></div><div></div><div class="field"><label>Policy Name *</label><input id="fwPolicyName" value="LAB_D4_DETECTIVE"></div><div></div><div class="field" style="grid-column:1/-1"><label>Description</label><textarea rows="4">Day 4 detective monitoring policy for PDB1</textarea></div></div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('create_d4_policy_shell')">Save</button></div>`);
  },
  d4SetsModal(){
    const s=this.state;
    this.modal(`<div class="modal-head"><span>Sets / Profiles</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="grid cols-2">${card('Database User Sets',`<p>D4_APP_READERS → AVDF_D2_READER</p><button class="btn primary" onclick="App.closeModal();App.action('create_d4_user_set')">Add / Save</button>`)}${card('Database Object Sets',`<p>D4_SENSITIVE_OBJECTS → CUSTOMER_SECURE</p><button class="btn primary" onclick="App.closeModal();App.action('create_d4_object_set')">Add / Save</button>`)}${card('Client Program Sets',`<p>D4_SQLPLUS_CLIENT → sqlplus</p><button class="btn primary" onclick="App.closeModal();App.action('create_d4_client_set')">Add / Save</button>`)}${card('Profiles',`<p>D4_READER_PROFILE → DB User Set D4_APP_READERS</p><button class="btn primary" onclick="App.closeModal();App.action('create_d4_profile')">Add / Save</button>`)}</div><div style="margin-top:16px">${setsProfiles(s)}</div></div><div class="modal-foot"><button class="btn primary" onclick="App.closeModal()">Close</button></div>`);
  },
  d4RuleBuilderModal(){
    this.modal(`<div class="modal-head"><span>Add Database Firewall Rule</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="grid cols-2">${card('SQL Statement Rule',`<b>KNOWN_APPLICATION_SQL</b><p>Profile: D4_READER_PROFILE<br>Cluster Set: D4_NORMAL_SQL<br>Action: Pass<br>Logging: Unique<br>Threat: Minimal</p><button class="btn primary" onclick="App.closeModal();App.action('add_d4_sql_rule')">Save SQL Rule</button>`)}${card('Database Object Rule',`<b>MONITOR_SENSITIVE_CUSTOMER_DATA</b><p>Profile: D4_READER_PROFILE<br>Commands: SELECT, UPDATE<br>Object Set: D4_SENSITIVE_OBJECTS<br>Capture Row Count: Yes<br>Action: Alert / Always / Major</p><button class="btn primary" onclick="App.closeModal();App.action('add_d4_object_rule')">Save Object Rule</button>`)}</div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button></div>`);
  },
  evaluationOrderModal(){
    const d4=this.state.firewall_policies.find(x=>x.name==='LAB_D4_DETECTIVE');
    const o=d4?.evaluation_order||['SQL Statement','Database Object','Session Context','Default'];
    this.modal(`<div class="modal-head"><span>Evaluation Order</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><p>Rules stop evaluation after a match. This training order preserves known SQL and sensitive-object behavior before the broad optional session rule.</p>${table(['Order','Rule Type'],o.map((x,i)=>[i+1,x]))}<div class="callout warn">A broad Session Context rule placed first can mask SQL Statement and Database Object rules.</div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('set_d4_evaluation_order',{order:['SQL Statement','Database Object','Session Context','Default']})">Save Order</button></div>`);
  },
  createAlertPolicyModal(){
    const fields=['ACTION_TAKEN','APPLICATION_CONTEXT','AUDIT_TYPE','AV_TIME','CLIENT_HOST_NAME','CLIENT_ID','CLIENT_IP','CLIENT_PROGRAM','CLUSTER_TYPE','COMMAND_CLASS','ERROR_CODE','ERROR_MESSAGE','EVENT_NAME','OBJECT_NAME','ROW_COUNT','TARGET_NAME','USER','USER_NAME'];
    this.modal(`<div class="modal-head"><span>Create Alert Policy</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:28px"><div><div class="grid cols-2"><div class="field"><label>Alert Policy Name</label><input value="LAB_FAILED_LOGIN"></div><div class="field"><label>Type</label><select><option>Oracle Database</option></select></div><div class="field"><label>Severity</label><select><option selected>Critical</option><option>Major</option><option>Moderate</option></select></div><div class="field"><label>Threshold (items)</label><input value="3"></div><div class="field"><label>Duration (min.)</label><input value="5"></div><div class="field"><label>Group By (Field)</label><select><option>USER_NAME</option></select></div><div class="field"><label>Description</label><input value="Repeated failed login attempts"></div><div class="field"><label>Condition</label><textarea rows="5">upper(:EVENT_STATUS)='FAILURE'
and upper(:EVENT)='LOGON'</textarea></div></div><h3 style="font-size:14px;margin-top:28px">Notification</h3><div class="field"><label>Email Distribution List</label><input placeholder="Optional in training simulator"></div></div><div class="available-fields"><b>Condition: Available Fields</b>${fields.map(x=>`<div>${x}</div>`).join('')}</div></div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('create_failed_login_alert')">Save</button></div>`);
  },
  createLargeResultAlertModal(){
    const fields=['ROW_COUNT','USER','OBJECT','EVENT','EVENT_STATUS','CLIENT_IP','CLIENT_PROGRAM','TARGET_NAME'];
    this.modal(`<div class="modal-head"><span>Create Alert Policy</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div style="display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:28px"><div class="grid cols-2"><div class="field"><label>Alert Policy Name</label><input value="LAB_D4_LARGE_RESULT" readonly></div><div class="field"><label>Type</label><select><option>Oracle Database</option></select></div><div class="field"><label>Severity</label><select><option selected>Critical</option></select></div><div class="field"><label>Target</label><input value="PDB1_26AI" readonly></div><div class="field" style="grid-column:1/-1"><label>Description</label><input value="Detect unusually large SELECT result on training data"></div><div class="field" style="grid-column:1/-1"><label>Condition</label><textarea rows="5">upper(:USER)='AVDF_D2_READER'
AND :ROW_COUNT > 3</textarea></div></div><div class="available-fields"><b>Condition: Available Fields</b>${fields.map(x=>`<div>${x}</div>`).join('')}</div></div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('create_large_result_alert')">Save</button></div>`);
  },
  sqlClusterModal(){
    const cat=(this.state.firewall_cluster_catalog||[]).filter(x=>x.user==='AVDF_D2_READER');
    const known=['COUNT_CUSTOMER','CUSTOMER_BY_ID','ACTIVE_CUSTOMERS'];
    this.modal(`<div class="modal-head"><span>Add SQL Cluster Set</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="grid cols-2"><div class="field"><label>Name *</label><input value="D4_NORMAL_SQL"></div><div class="field"><label>Description</label><input value="Known normal SQL for AVDF_D2_READER"></div><div class="field"><label>Target</label><select><option>PDB1_26AI</option></select></div><div class="field"><label>Database User</label><select><option>AVDF_D2_READER</option></select></div><div class="field"><label>Show clusters for</label><select><option>Last 24 Hours</option></select></div></div><div style="margin-top:18px">${cat.length?table(['','Cluster','Sample SQL','Executions','First Seen','Last Seen'],cat.map(x=>[`<input type="checkbox" ${known.includes(x.name)?'checked':''}>`,x.name,`<span style="white-space:normal">${esc(x.sample_sql)}</span>`,x.executions,fmtTime(x.first_seen),fmtTime(x.last_seen)])):'<div class="empty">Deploy Log all and generate representative SQL workload to populate clusters.</div>'}</div></div><div class="modal-foot"><button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn primary" onclick="App.closeModal();App.action('create_d4_cluster_set',{clusters:['COUNT_CUSTOMER','CUSTOMER_BY_ID','ACTIVE_CUSTOMERS']})">Save</button></div>`);
  },
  async copyD4Policy(){await this.action('copy_d4_policy');},
  async exportD4Policy(){
    const password=prompt('Enter export password for LAB_D4_DETECTIVE:'); if(password===null)return;
    const j=await this.action('export_d4_policy',{password},true); this.toast(j.message);
    if(!j.message.startsWith('LAB_D4_DETECTIVE exported')) return;
    const pol=this.state.firewall_policies.find(x=>x.name==='LAB_D4_DETECTIVE');
    const blob=new Blob([JSON.stringify({format:'AVDF Training Policy Export',passwordProtected:true,policy:pol},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='LAB_D4_DETECTIVE.avdfpolicy';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  },
  alerts(){const s=this.state;return this.pageHeader('Alerts','Triage alert events generated by failed-login thresholds and Database Firewall policy matches.',`<button class="btn" onclick="App.action('generate_incident')">Generate Forensic Incident</button>`)+(s.alerts.length?table(['Time','Severity','Message','Target','User','Object','Row Count','Policy','Status','Actions'],s.alerts.map(a=>[fmtTime(a.time),`<span class="severity-${a.severity}">${a.severity}</span>`,a.message,a.target||'PDB1_26AI',a.user||'—',a.object||'—',a.row_count??'—',a.policy||'—',this.badge(a.status),`<button class="btn small" onclick="App.showAlertDetail('${a.id}')">Investigate</button> <button class="btn small" onclick="App.action('open_alert',{id:'${a.id}'})">Open</button> <button class="btn small" onclick="App.action('ack_alert',{id:'${a.id}'})">Acknowledge</button> <button class="btn small" onclick="App.action('close_alert',{id:'${a.id}'})">Close</button>`])):'<div class="empty">No alerts generated.</div>')},
  showAlertDetail(id){
    const a=this.state.alerts.find(x=>x.id===id); if(!a)return;
    const fw=(this.state.firewall_events||[]).find(e=>e.id===a.event_id);
    const nat=(this.state.avdf_repository||[]).find(e=>e.id===a.event_id||e.source_event_id===a.event_id);
    const e=fw||nat||{};
    const related=[...(this.state.firewall_events||[]),...(this.state.avdf_repository||[])].filter(x=>(x.user||x.dbusername)===a.user).slice(0,12);
    this.modal(`<div class="modal-head"><span>Alert Investigation</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body">${summaryRows([['Alert Policy',a.policy],['Severity',a.severity],['Target',a.target],['User',a.user],['Object',a.object||e.object||e.object_name||'—'],['Command',a.command||e.command||e.action_name||'—'],['Row Count',a.row_count??e.row_count??'—'],['Rule',a.rule||e.rule||'—'],['Status',a.status],['Event ID',a.event_id||'—']],this.status.bind(this))}<h3>Triggering SQL / Event</h3><pre><code>${esc(a.sql_text||e.sql_text||'—')}</code></pre><h3>Related Activity</h3>${related.length?table(['Event Time','Source','User','Event','Object','Policy','Row Count'],related.map(x=>[fmtTime(x.event_time),x.source,x.user||x.dbusername,x.command||x.action_name,x.object||x.object_name||'—',x.policy||'—',x.row_count??'—'])):'<div class="empty">No related collected events.</div>'}</div><div class="modal-foot"><button class="btn primary" onclick="App.closeModal()">Close</button></div>`);
  },
  reports(){
    const s=this.state,tab=this.tab||'activity';
    const native=(s.avdf_repository||[]).map((x,i)=>({...x,_kind:'native',_idx:i,_time:x.event_time,_user:x.dbusername,_object:x.object_name,_event:x.action_name,_severity:'',_policy:x.policy}));
    const firewall=s.firewall_events.map((x,i)=>({...x,_kind:'firewall',_idx:i,_time:x.event_time,_user:x.user,_object:x.object,_event:x.command,_severity:x.threat_severity,_policy:x.policy}));
    let combined=[...native,...firewall].sort((a,b)=>this.reportSort==='asc'?a._time.localeCompare(b._time):(this.reportSort==='rowdesc'?((b.row_count??-1)-(a.row_count??-1)):b._time.localeCompare(a._time)));
    if(tab==='activity'){
      const kind=this.reportKind||'all';
      if(kind==='failed') combined=combined.filter(x=>x._event==='LOGON' && ((x.return_code||0)!==0 || x.status==='FAILURE'));
      if(kind==='schema') combined=combined.filter(x=>['CREATE TABLE','ALTER TABLE','DROP TABLE','CREATE PROCEDURE','ALTER PROCEDURE','DROP PROCEDURE'].includes(x._event));
      if(kind==='firewall') combined=combined.filter(x=>x._kind==='firewall');
      if(kind==='privileged'){const snap=(s.entitlement_snapshots||[])[0]; const privileged=new Set(); if(snap){for(const [u,v] of Object.entries(snap.users||{})){if((v.roles||[]).length || (v.system_privileges||[]).some(p=>['DBA','CREATE TABLE','ALL PRIVILEGES'].includes(p))) privileged.add(u)}} combined=combined.filter(x=>privileged.has((x._user||'').toUpperCase()));}
      const f=this.reportFilter;
      let rows=combined.filter(x=>(!f.target||(x.target||'PDB1_26AI').includes(f.target))&&(!f.user||x._user?.includes(f.user.toUpperCase()))&&(!f.objectOwner||(x.object_schema||'').includes(f.objectOwner.toUpperCase()))&&(!f.object||x._object?.includes(f.object.toUpperCase()))&&(!f.source||x.source===f.source)&&(!f.policy||(x._policy||'').includes(f.policy)));
      this._reportRows=rows.slice(0,200);
      const label=kind==='failed'?`Event = 'LOGON' and Status = 'FAILURE'`:kind==='schema'?'Database Schema Activity':kind==='firewall'?'Database Firewall Monitored Activity':(f.user?`User = '${esc(f.user.toUpperCase())}'`:'Event Time is in the last 24 hours');
      return this.pageHeader('Activity Reports','')+
      `<div class="tabs"><button class="${kind==='all'?'active':''}" onclick="App.reportKind='all';App.render()">All Activity</button><button class="${kind==='failed'?'active':''}" onclick="App.reportKind='failed';App.render()">Failed Login Events</button><button class="${kind==='schema'?'active':''}" onclick="App.reportKind='schema';App.render()">Database Schema Activity</button><button class="${kind==='firewall'?'active':''}" onclick="App.reportKind='firewall';App.render()">Database Firewall Reports</button><button class="${kind==='privileged'?'active':''}" onclick="App.reportKind='privileged';App.render()">All Activity by Privileged Users</button></div>`+
      `<div class="filters"><div class="filter-chip"><span class="filter-icon">▽</span><input value="${label}" readonly><span class="filter-clear">×</span></div><div class="field"><label>Target</label><input value="${esc(f.target||'')}" onchange="App.setReportFilter('target',this.value)" placeholder="PDB1_26AI"></div><div class="field"><label>User</label><input value="${esc(f.user)}" onchange="App.setReportFilter('user',this.value)" placeholder="AVDF_D2_READER"></div><div class="field"><label>Object Owner</label><input value="${esc(f.objectOwner||'')}" onchange="App.setReportFilter('objectOwner',this.value)" placeholder="AVDF_D2_APP"></div><div class="field"><label>Object</label><input value="${esc(f.object)}" onchange="App.setReportFilter('object',this.value)" placeholder="CUSTOMER_SECURE"></div><div class="field"><label>Policy Name</label><input value="${esc(f.policy||'')}" onchange="App.setReportFilter('policy',this.value)" placeholder="LAB_D4_DETECTIVE"></div><div class="field"><label>Sort</label><select onchange="App.reportSort=this.value;App.render()"><option value="desc" ${this.reportSort==='desc'?'selected':''}>Event Time DESC</option><option value="asc" ${this.reportSort==='asc'?'selected':''}>Event Time ASC</option><option value="rowdesc" ${this.reportSort==='rowdesc'?'selected':''}>Row Count DESC</option></select></div><button class="btn" onclick="App.reportFilter={target:'PDB1_26AI',user:'',objectOwner:'',object:'',source:'',policy:''};App.reportSort='desc';App.render()">Clear</button></div>`+
      (rows.length?table(['','Event Time','User','Client IP','Client Program','Event','Object','Event Status','Policy Name','Row Count','Threat Severity','Network Connection'],rows.slice(0,200).map((x,i)=>[`<span class="row-doc-icon link" onclick="App.showActivityDetail(${i})"></span>`,`<span class="link" onclick="App.showActivityDetail(${i})">${fmtTime(x._time)}</span>`,x._user||'—',x.client_ip||'—',x.client_program||'—',x._event||'—',x._object||'—',x.status||((x.return_code||0)===0?'SUCCESS':'FAILURE'),x._policy||'—',x.row_count??'—',x.threat_severity||'—',x.network_connection||'—'])):'<div class="empty">No matching activity.</div>');
    }
    if(tab==='summary'){
      const reports=[['Activity by User','Summary of database activity grouped by user'],['Activity by Target','Summary of events grouped by secured target'],['Top Database Objects','Frequently accessed database objects'],['Alert Summary','Alert count by severity and policy'],['Database Firewall Summary','Monitored network SQL summary']];
      return this.pageHeader('Summary Reports','')+avdfRegion('Summary Reports',table(['Name','Description','Schedule','Generate'],reports.map(r=>[r[0],r[1],'▦','▤'])));
    }
    if(tab==='compliance'){
      return this.pageHeader('Compliance Reports','')+avdfRegion('Compliance Reports',table(['Compliance Group','Secured Targets','Entitlement Data','Status'],s.compliance_groups.map(g=>[g.name,g.targets.join(', ')||'—',s.entitlement_snapshots.length?'Available':'Not retrieved',g.targets.length?'Ready':'No targets'])));
    }
    if(tab==='pdf'){
      return this.pageHeader('PDF/XLS Reports','')+avdfRegion('PDF/XLS Reports',`<div class="callout">Scheduled report generation in this simulator records the PDF/XLS job metadata without creating Oracle proprietary report output.</div>${s.report_schedules.length?table(['Schedule','Report','Format','Frequency','Status'],s.report_schedules.map(x=>[x.name,x.report,x.format,x.frequency,x.status])):'<div class="empty">No PDF/XLS report schedules.</div>'}`);
    }
    if(tab==='entitlement'){
      const names=[['Privileged Users','Privileged users'],['User Accounts','Summary of user accounts'],['User Privileges','Summary of user privileges'],['User Profiles','Summary of user profiles'],['Role Privileges','Summary of role privileges'],['System Privileges','System privileges and their grants to users'],['Object Privileges','Object privileges and their grants to users']];
      return this.pageHeader('Entitlement Reports','')+avdfRegion('Entitlement Reports',table(['Name','Description','Schedule','Generated Report'],names.map(x=>[x[0],x[1],'▦','▤'])))+`<div style="margin-top:26px">${entitlementReport(s)}</div>`;
    }
    if(tab==='stored'){
      const changes=s.spa_changes||[];
      return this.pageHeader('Stored Procedure Changes','Created, modified, and deleted stored procedures discovered by Stored Procedure Auditing.',`<button class="btn" onclick="App.action('schedule_spa')">Enable Retrieval</button> <button class="btn primary" onclick="App.action('retrieve_spa')">Retrieve Now</button>`)+
      avdfRegion('Stored Procedure Auditing',`<div class="callout"><b>Schedule:</b> ${s.spa_schedule?.enabled?'Enabled':'Not enabled'} · Target PDB1_26AI</div>${changes.length?table(['Time','Target','Procedure','Change','Version'],changes.map(x=>[fmtTime(x.time),x.target,x.procedure,x.change,x.version])):'<div class="empty">No stored procedure changes retrieved yet.</div>'}`);
    }
    if(tab==='saved') return this.pageHeader('Saved Reports','',`<button class="btn primary" onclick="App.action('save_report')">Save D5_READER_INVESTIGATION</button>`)+avdfRegion('Saved Reports',s.saved_reports.length?table(['Name','Description','Sort'],s.saved_reports.map(x=>[x.name,x.description,x.sort])):'<div class="empty">No saved reports.</div>');
    if(tab==='scheduled') return this.pageHeader('Report Schedules','',`<button class="btn primary" onclick="App.action('schedule_report')">Schedule Daily PDF</button>`)+avdfRegion('Report Schedules',s.report_schedules.length?table(['Schedule','Report','Frequency','Format','Status'],s.report_schedules.map(x=>[x.name,x.report,x.frequency,x.format,x.status])):'<div class="empty">No scheduled reports.</div>');
    if(tab==='generated') return this.pageHeader('Generated Reports','')+avdfRegion('Generated Reports',s.report_schedules.length?table(['Report','Generated Time','Format','Status'],s.report_schedules.map(x=>[x.report,fmtTime(s.meta.updated_at),x.format,'Available'])):'<div class="empty">No generated reports.</div>');
    return this.pageHeader('Reports','')+'<div class="empty">Select a report family from the left navigation.</div>';
  },
  showActivityDetail(i){
    const x=this._reportRows[i]; if(!x)return;
    const props=[['Collection Time',fmtTime(x._time)],['Event Time',fmtTime(x._time)],['Event',x._kind==='firewall'?'statement':x._event],['Event Status',x.status||((x.return_code||0)===0?'SUCCESS':'FAILURE')],['User',x._user||'—'],['Client IP',x.client_ip||'—'],['Client Host',x.client_host||x.userhost||'—'],['Client Program',x.client_program||'—'],['Command Class',x._event||'—'],['Object',x._object||'—'],['Policy Name',x._policy||'—'],['Policy Rule',x.rule||'—'],['SQL Cluster',x.cluster||'—'],['Monitoring Point',x.monitoring_point||'—'],['Network Connection',x.network_connection||'—'],['Error Code',x.error_code??x.return_code??'—'],['Error Message',x.error_message||'—'],['Action Taken',x.action||'—'],['Threat Severity',x.threat_severity||'—'],['Row Count',x.row_count??'—'],['SQL / Command Text',x.sql_text||'—']];
    this.modal(`<div class="modal-head"><span>Event Details</span><button class="modal-close" onclick="App.closeModal()">×</button></div><div class="modal-body"><div class="event-sheet"><h3>Event</h3>${props.map(([k,v])=>`<div class="event-prop"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div></div><div class="modal-foot"><button class="btn primary" onclick="App.closeModal()">Close</button></div>`);
  },
  setReportFilter(k,v){this.reportFilter[k]=v;this.render()},
  settings(){const s=this.state;const recent=s.jobs.slice(0,50);return this.pageHeader('Settings','Jobs, user access, system configuration, network settings, and training environment diagnostics.')+`<div class="grid cols-2">${card('Jobs',recent.length?table(['Time','Job Type','Target','Status','Detail'],recent.map(j=>[fmtTime(j.time),j.type,j.target,this.badge(j.status),j.detail||'—'])):'<div class="empty">No jobs submitted yet.</div>')}${card('System Configuration',summaryRows([['Server Time',new Date().toLocaleString()],['AVDF Release','20.18 training baseline'],['Database Host',s.environment.hostname],['Target Address','192.168.56.26:1521/PDB1'],['Database Firewall','192.168.56.27'],['Simulation Mode',s.meta.mode],['AVDF Repository Events',(s.avdf_repository||[]).length]],this.status.bind(this)))}${card('Network',summaryRows([['Listener',s.system.listener],['Database Network',s.system.network_ok?'Reachable':'Failure injected'],['Firewall Network',s.system.dbfw_network_ok?'Reachable':'Failure injected'],['NIC',s.environment.nic],['Gateway',s.environment.gateway]],this.status.bind(this)))}${card('AVDF Service Account',s.db.users.AVDFCOLLECT?summaryRows([['Account','AVDFCOLLECT'],['Status',s.db.users.AVDFCOLLECT.status],['Setup role',(s.db.users.AVDFCOLLECT.roles||[]).filter(x=>x.startsWith('AVDF_SIM_')).join(', ')||'Not configured'],['Target setup script',s.system.setup_script_present?'Available':'Not downloaded']],this.status.bind(this)):'<div class="empty">AVDFCOLLECT has not been created yet.</div>')}${card('Notifications',`<div class="callout">SMTP configured: <b>${s.notifications?.smtp_configured?'Yes':'No'}</b></div><button class="btn" onclick="App.action('create_notification_list',{members:[]})">Create D5_SECURITY_TEAM</button>${(s.notifications?.distribution_lists||[]).length?table(['Distribution List','Members'],s.notifications.distribution_lists.map(x=>[x.name,(x.members||[]).join(', ')||'Training placeholder'])):''}`)}</div>`},

  async loadLabs(day=this.labDay,q=''){
    this.labDay=day;const j=await this.api(`/api/labs?day=${day}&q=${encodeURIComponent(q)}`);this.labs=j.labs;if(!this.selectedLab||this.selectedLab.day!==day)this.selectedLab=this.labs[0]||null;this.render();
  },
  labCenter(){
    if(!this.labs.length){setTimeout(()=>this.loadLabs(this.labDay),0);return this.pageHeader('Training Labs','Loading Day 1–5 lab catalog...')+'<div class="empty">Loading…</div>';}
    const total=this.state._counts?.labs||394;const completed=Object.values(this.state.lab_progress||{}).filter(Boolean).length;const dayDone=this.labs.filter(l=>this.state.lab_progress[l.key]).length;
    const selected=this.selectedLab||this.labs[0];
    return this.pageHeader('Training Labs',`Every Day 1–5 hands-on section is indexed here. The simulator provides Web Console, AVCLI, SQL*Plus, and OS-terminal paths for the labs.`, `<button class="btn" onclick="App.action('reset_lab_progress')">Reset Progress</button>`)+
    `<div class="card" style="margin-bottom:12px"><div class="card-body"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>Overall Progress</b><span>${completed} / ${total}</span></div><div class="progressbar"><span style="width:${Math.min(100,completed/total*100)}%"></span></div></div></div>
    <div class="filters"><div class="field"><label>Day</label><select onchange="App.loadLabs(+this.value)">${[1,2,3,4,5].map(d=>`<option value="${d}" ${d===this.labDay?'selected':''}>Day ${d}</option>`).join('')}</select></div><div class="field grow"><label>Search within Day ${this.labDay}</label><input placeholder="policy, firewall, entitlement, listener..." onkeydown="if(event.key==='Enter')App.loadLabs(App.labDay,this.value)"></div><button class="btn" onclick="App.loadLabs(App.labDay,this.previousElementSibling.querySelector('input').value)">Search</button><span style="margin-left:auto;color:#666">${dayDone}/${this.labs.length} complete</span></div>
    <div class="lab-layout"><div class="lab-list">${this.labs.map(l=>`<div class="lab-item ${selected&&selected.key===l.key?'active':''}" onclick="App.selectLab('${l.key}')"><div class="top"><span class="title">${l.number}. ${esc(l.title)}</span>${this.state.lab_progress[l.key]?'<span class="badge green">Done</span>':''}</div><div class="meta">${esc(l.category)}</div></div>`).join('')}</div><div class="lab-doc">${selected?this.renderLab(selected):'<div class="empty">Select a lab.</div>'}</div></div>`;
  },
  selectLab(key){this.selectedLab=this.labs.find(x=>x.key===key);this.render()},
  renderLab(l){
    return `<div class="page-header"><div class="page-title"><h1>Day ${l.day} — Lab ${l.number}</h1><p>${esc(l.title)} · ${esc(l.category)}</p></div><div class="actions"><button class="btn primary" onclick="App.action('complete_lab',{key:'${l.key}'})">Mark Complete</button></div></div>${miniMarkdown(l.section)}${l.commands.length?`<hr><h3>Detected command / configuration blocks</h3><p style="color:#666">Use these shortcuts to send a block to the matching simulator console. You can also copy it manually.</p>${l.commands.map((c,i)=>`<div style="margin-bottom:14px"><pre><code>${esc(c)}</code></pre><div class="actions" style="justify-content:flex-start"><button class="btn small" onclick="App.openCommandFromLab(${JSON.stringify(l.key)},${i})">Open in Command Console</button></div></div>`).join('')}`:''}`;
  },
  openCommandFromLab(key,i){const l=this.labs.find(x=>x.key===key);if(!l)return;const c=l.commands[i]||'';this.console=detectChannel(c);sessionStorage.setItem('avdf_prefill',c);this.go('console');},

  consolePage(){const hist=this.state.history.filter(x=>x.channel===this.console).slice(-15);const pre=sessionStorage.getItem('avdf_prefill')||'';const hy=this.state._hybrid||{};setTimeout(()=>{const ta=document.getElementById('consoleInput');if(ta&&pre){ta.value=pre;sessionStorage.removeItem('avdf_prefill');}},0);return this.pageHeader('Command Consoles','Use the same command styles found in the hands-on labs. Simulation is always available; real Oracle execution is an explicit optional mode.')+`<div class="console-layout"><div class="console-tabs"><button class="${this.console==='os'?'active':''}" onclick="App.console='os';App.render()">OS Terminal</button><button class="${this.console==='sql'?'active':''}" onclick="App.console='sql';App.render()">SQL*Plus Simulator</button><button class="${this.console==='sql-hybrid'?'active':''}" onclick="App.console='sql-hybrid';App.render()">Real Oracle 26ai (Hybrid)</button><button class="${this.console==='avcli'?'active':''}" onclick="App.console='avcli';App.render()">AVCLI</button><div class="callout ${hy.enabled?'':'warn'}" style="font-size:12px"><b>Hybrid:</b> ${esc(hy.message||'Disabled by default. Set AVDF_SIM_HYBRID=1 on the database host to enable.')}</div><div class="callout" style="font-size:12px">Simulator consoles share one AVDF state. In hybrid SQL mode, a successful real SQL statement is mirrored into the AVDF simulation state so reports and alerts continue to work.</div></div><div class="terminal"><div class="term-title">${this.console==='os'?'oracle@db26ai $':this.console==='sql'||this.console==='sql-hybrid'?'SQL>':'avcli>'}</div><div id="termOut" class="term-output">${hist.length?hist.map(h=>`$ ${esc(h.command)}\n${esc(h.output)}\n`).join('\n'):'AVDF Training Simulator console ready.\n'}</div><div class="term-entry"><textarea id="consoleInput" placeholder="${this.console==='os'?'lsnrctl status':(this.console==='sql'||this.console==='sql-hybrid')?'SHOW PDBS':'LIST SECURED TARGET;'}"></textarea><button onclick="App.runConsole()">Run</button></div></div></div>`},
  async runConsole(){const ta=document.getElementById('consoleInput');const command=ta.value.trim();if(!command)return;const j=await this.api('/api/command',{method:'POST',body:JSON.stringify({channel:this.console,command})});this.state=j.state;ta.value='';this.render();setTimeout(()=>{const o=document.getElementById('termOut');if(o)o.scrollTop=o.scrollHeight},0)},

  trainer(){
    const s=this.state;
    const scenarios=[
      ['scenario01','01','Oracle Environment, Unified Audit dan Native Evidence'],
      ['scenario02','02','AVDFCOLLECT, Secured Target dan TABLE Audit Collection'],
      ['scenario03','03','Central Audit Policy Management, Retention dan Failed Login Alert'],
      ['scenario04','04','Audit Vault Agent, Host Monitor, Database Firewall'],
      ['scenario05','05','Database Response Monitoring, Network Evidence dan Troubleshooting'],
      ['scenario06','06','SQL Baseline dan Full Firewall Policy Lifecycle'],
      ['scenario07','07','Sensitive Data, Row Count, Exfiltration Signal dan Alert'],
      ['scenario08','08','Reporting, Saved Reports, Scheduling, Target Group, Compliance'],
      ['scenario09','09','Entitlement Baseline, Privilege Escalation dan Drift'],
      ['scenario10','10','Stored Procedure Auditing'],
      ['scenario11','11','Alert Triage dan Operational Health Check'],
      ['scenario12','12','Final Forensic Capstone']
    ];
    const current=s.trainer?.checkpoint||'scenario01';
    const checkpointButtons=scenarios.map(([id,no,title])=>`<button class="scenario-checkpoint ${current===id?'active':''}" onclick="App.reset('${id}')"><span class="scenario-no">${no}</span><span><b>Start Scenario ${no}</b><small>${esc(title)}</small></span></button>`).join('');
    const legacy=[1,2,3,4,5].map(d=>`<button class="btn small" onclick="App.reset('day${d}')">End of Day ${d}</button>`).join('');
    return this.pageHeader('Instructor / Trainer','Load the exact prerequisite state for each scenario, inject failures, and generate representative workloads.')+
      `<div class="scenario-checkpoint-panel">
        <div class="checkpoint-current"><span>Current training checkpoint</span><b>${esc(s.trainer?.checkpoint_label||'Start Scenario 01')}</b></div>
        <div class="checkpoint-help">Choose the scenario the student is about to begin. The simulator automatically loads the correct prerequisite state, so students no longer need to translate a scenario into a Day 1–5 checkpoint.</div>
        <div class="scenario-checkpoint-grid">${checkpointButtons}</div>
      </div>
      <div class="grid cols-2" style="margin-top:24px">
        ${card('Scenario Generator',`<p>Generate representative workload or the complete final forensic incident.</p><div class="actions" style="justify-content:flex-start"><button class="btn" onclick="App.action('generate_normal_workload')">Normal SQL Workload</button><button class="btn primary" onclick="App.action('generate_incident')">Final Forensic Incident</button></div>`)}
        ${card('Failure Injection',`<p>Use these controls for troubleshooting exercises.</p><div class="actions" style="justify-content:flex-start">${[['network','Target Network'],['listener','Listener'],['pdb','PDB State'],['agent','Audit Vault Agent'],['hostmon','Host Monitor'],['monitor_address','Monitoring Point Address'],['trail','Audit Trail'],['firewall_network','DBFW Network']].map(([k,n])=>`<button class="btn small" onclick="App.action('inject_failure',{kind:'${k}'})">Break ${n}</button>`).join('')}<button class="btn small primary" onclick="App.action('clear_failures')">Clear Failures</button></div>`)}
        ${card('Current Failure State',s.trainer.injected_failures.length?table(['Time','Failure'],s.trainer.injected_failures.map(x=>[fmtTime(x.time),x.kind])):'<div class="empty">No injected failures.</div>')}
        ${card('Legacy Day Checkpoints',`<p>Compatibility shortcuts for the original Day 1–5 labs. New scenario-based hands-on should use the Scenario Checkpoints above.</p><div class="actions" style="justify-content:flex-start"><button class="btn small danger" onclick="App.reset('scenario01')">Fresh / Scenario 01</button>${legacy}</div>`)}
      </div>
      <div style="margin-top:24px">${card('Training Topology',`<div class="topology">Client / Student\n      │ SQL\n      ▼\nOracle AI Database 26ai (PDB1)\n   ├──────────────► Unified Audit ───────────┐\n   │                                         │\n   └──────────────► Host Monitor             │\n                         │                   │\n                         ▼                   │\n                 Database Firewall DBFW1     │\n                         │                   │\n                         └──────────┬────────┘\n                                    ▼\n                             Audit Vault Server\n                     Reports • Alerts • Policies\n                     Entitlements • Compliance</div>`)}</div>`;
  }
};

function navIcon(name){
  const paths={
    home:'<path d="M3 11.5 11 4l8 7.5"/><path d="M5.5 10.5V20h11V10.5"/><path d="M9 20v-6h4v6"/>',
    target:'<circle cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="3"/><path d="M16.5 16.5 21 21"/>',
    policy:'<path d="M6 3h10l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h5"/><path d="M4 6v13"/>',
    alert:'<path d="M6 16h12l-2-3V9a5 5 0 0 0-10 0v4z"/><path d="M9 19h4"/>',
    report:'<path d="M4 20V11M9 20V6M14 20v-8M19 20V3"/><path d="M2 20h20"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    agent:'<path d="M5 6h14v10H5z"/><path d="M8 20h8M10 16v4M14 16v4"/>',
    firewall:'<path d="M3 5h18v14H3z"/><path d="M3 10h18M8 5v5M16 10v4M10 14h11"/>',
    archive:'<path d="M4 6h16v4H4z"/><path d="M6 10h12v10H6z"/><path d="M10 14h4"/>'
  };
  return `<span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.home}</svg></span>`;
}
function avdfRegion(title,body,actions=''){
  return `<section class="avdf-region"><div class="avdf-region-title"><span>${esc(title)}</span><span class="actions">${actions}</span></div><div class="avdf-region-body">${body}</div></section>`;
}

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function titleCase(s){return String(s).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function fmtTime(s){return s?String(s).replace('T',' ').slice(0,19):'—'}
function kpi(n,t,sub){return `<div class="kpi"><div class="n">${esc(n)}</div><div class="t">${esc(t)}</div><div style="margin-top:5px;color:#777;font-size:11px">${esc(sub||'')}</div></div>`}
function card(title,body){return `<div class="card"><div class="card-header"><h2>${esc(title)}</h2></div><div class="card-body">${body}</div></div>`}
function summaryRows(rows,statusFn){return `<div class="summary-list">${rows.map(([k,v])=>`<div class="summary-row"><span class="k">${esc(k)}</span><span class="v">${/RUNNING|STOPPED|OPEN|READ WRITE|ACTIVE|COLLECTING|MOUNTED|Reachable|Unreachable|Failure injected/i.test(String(v))?statusFn(v):esc(v)}</span></div>`).join('')}</div>`}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${String(c??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function activityTable(ev){return table(['Time','Source','User','Event','Object'],ev.map(x=>[fmtTime(x.event_time),x.source,x.dbusername||x.user||'—',x.action_name||x.command||'—',x.object_name||x.object||'—']))}
function countBy(arr,fn){const o={};for(const x of arr){const k=fn(x);o[k]=(o[k]||0)+1}return o}
function barList(obj){const es=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,8);if(!es.length)return '<div class="empty">No activity yet.</div>';const max=es[0][1];return es.map(([k,v])=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${v}</b></div><div style="height:5px;background:#eee;margin-top:4px"><span style="display:block;height:100%;width:${v/max*100}%;background:#777"></span></div></div>`).join('')}
function setsProfiles(s){return `<div class="summary-list"><div class="summary-row"><span class="k">DB User Set</span><span class="v">${esc(Object.keys(s.firewall_sets.db_users).join(', ')||'—')}</span></div><div class="summary-row"><span class="k">DB Object Set</span><span class="v">${esc(Object.keys(s.firewall_sets.db_objects).join(', ')||'—')}</span></div><div class="summary-row"><span class="k">Client Program Set</span><span class="v">${esc(Object.keys(s.firewall_sets.client_programs).join(', ')||'—')}</span></div><div class="summary-row"><span class="k">SQL Cluster Set</span><span class="v">${esc(Object.keys(s.firewall_sets.sql_clusters).join(', ')||'—')}</span></div><div class="summary-row"><span class="k">Profiles</span><span class="v">${esc(Object.keys(s.profiles).join(', ')||'—')}</span></div></div>`}
function reportFilters(f){return `<div class="filters"><div class="field"><label>User</label><input value="${esc(f.user)}" onchange="App.setReportFilter('user',this.value)" placeholder="AVDF_D2_READER"></div><div class="field"><label>Object</label><input value="${esc(f.object)}" onchange="App.setReportFilter('object',this.value)" placeholder="CUSTOMER_SECURE"></div><div class="field"><label>Source</label><select onchange="App.setReportFilter('source',this.value)"><option value="">All Sources</option><option ${f.source==='Unified Audit'?'selected':''}>Unified Audit</option><option ${f.source==='Database Firewall'?'selected':''}>Database Firewall</option></select></div><button class="btn" onclick="App.reportFilter={user:'',object:'',source:''};App.render()">Clear</button></div>`}
function entitlementReport(s){
  if(!s.entitlement_snapshots.length)return '<div class="empty">No entitlement snapshots. Retrieve one from the target first.</div>';
  const snaps=s.entitlement_snapshots;const latest=snaps[0];const base=snaps.find(x=>x.label==='D5_BASELINE')||snaps[snaps.length-1];const u='AVDF_D2_READER';const a=base.users[u]||{roles:[],system_privileges:[],object_privileges:[]}, b=latest.users[u]||a;
  const add=(x,y)=>y.filter(v=>!x.includes(v));
  return `<div class="grid cols-2">${card('Entitlement Snapshots',table(['Time','Label','Target'],snaps.map(x=>[fmtTime(x.time),x.label||'—',x.target])))}${card('AVDF_D2_READER — Drift from Baseline',`<div class="summary-list"><div class="summary-row"><span class="k">Baseline</span><span class="v">${esc(base.label||base.id)}</span></div><div class="summary-row"><span class="k">Compared To</span><span class="v">${esc(latest.label||latest.id)}</span></div><div class="summary-row"><span class="k">New Roles</span><span class="v">${esc(add(a.roles,b.roles).join(', ')||'None')}</span></div><div class="summary-row"><span class="k">New Object Privileges</span><span class="v">${esc(add(a.object_privileges,b.object_privileges).join(', ')||'None')}</span></div><div class="summary-row"><span class="k">New System Privileges</span><span class="v">${esc(add(a.system_privileges,b.system_privileges).join(', ')||'None')}</span></div></div>`)}</div>`;
}
function detectChannel(c){const t=c.trim().toLowerCase();if(t.includes('avcli>')||/^(list|register|retrieve|enable|disable|apply|create retention|show status|start collection|start database firewall|stop database firewall|alter database firewall)/i.test(c.trim()))return'avcli';if(/^(select|create|alter session|alter table|alter user|grant|revoke|audit|noaudit|show |set |column |update|insert|drop |commit|rollback|@)/i.test(c.trim()))return'sql';return'os'}
function miniMarkdown(md){
  let s=String(md||'');const codes=[];s=s.replace(/```(bash|sql|text)?\n([\s\S]*?)```/g,(m,lang,code)=>{const id=codes.length;codes.push(`<pre><code>${esc(code.trim())}</code></pre>`);return `@@CODE${id}@@`});
  s=esc(s);s=s.replace(/^#### (.+)$/gm,'<h4>$1</h4>').replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');
  s=s.replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>').replace(/^---$/gm,'<hr>');
  s=s.replace(/^\d+\. (.+)$/gm,'<div style="margin:5px 0"><b>•</b> $1</div>').replace(/^- (.+)$/gm,'<div style="margin:5px 0">• $1</div>');
  s=s.replace(/`([^`]+)`/g,'<span class="code-inline">$1</span>');
  s=s.split(/\n{2,}/).map(p=>/^<(h\d|pre|hr|blockquote|div)/.test(p.trim())?p:`<p>${p.replace(/\n/g,'<br>')}</p>`).join('\n');
  codes.forEach((c,i)=>{s=s.replace(`@@CODE${i}@@`,c)});return s;
}

document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')App.closeModal()});
App.init();
