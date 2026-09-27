/* Deliberately bounded, stateful simulator for the twelve avdf_handson scenarios.
 * No command is sent to a real database or operating system. */
const StaticEngine = {
  state: null, base: null, labs: [], scenarios: [], key: 'avdf_pages_state_v2', sequence: 0,
  clone(x) { return JSON.parse(JSON.stringify(x)); },
  async init() {
    const [base, labs, scenarios] = await Promise.all(['state.json','labs.json','scenarios.json'].map(async f => {
      const r = await fetch('./'+f); if (!r.ok) throw new Error('Tidak dapat memuat '+f); return r.json();
    }));
    this.base=base; this.labs=labs; this.scenarios=scenarios;
    try { const saved=JSON.parse(localStorage.getItem(this.key)); if(saved?.meta?.engine_version===2) this.state=saved; } catch {}
    if(!this.state) this.reset('scenario01');
    this.decorate(); return this.state;
  },
  decorate() {
    const s=this.state; s.meta.engine_version=2; s.meta.hybrid_available=false;
    s._counts={labs:this.labs.length,completed_labs:Object.values(s.lab_progress||{}).filter(Boolean).length};
    s._hybrid={enabled:false,message:'Simulasi browser saja. Tidak terhubung ke Oracle, Linux, atau AVDF sungguhan.'};
  },
  save() { this.state.meta.updated_at=new Date().toISOString(); this.decorate(); try { localStorage.setItem(this.key,JSON.stringify(this.state)); } catch { this.state.storage_warning='Penyimpanan browser tidak tersedia; progres hanya berlaku selama halaman terbuka.'; } },
  id() { return Date.now().toString(36)+'_'+(++this.sequence); },
  require(ok,message) { if(!ok) throw new Error(message); },
  job(type,detail='') { this.state.jobs.unshift({id:this.id(),time:new Date().toISOString(),type,target:'PDB1_26AI',status:'Completed',detail}); },
  user(name,password) { return this.state.db.users[name]={password,status:'OPEN',profile:'DEFAULT',roles:[],system_privileges:[],object_privileges:[]}; },
  reset(checkpoint='scenario01') {
    const legacy={day1:3,day2:5,day3:6,day4:8,day5:12};
    const n=legacy[checkpoint]||Number(checkpoint.replace('scenario',''));
    this.require(Number.isInteger(n)&&n>=1&&n<=12,'Checkpoint tidak dikenal');
    const old=this.state, progress=old?.learning||{};
    this.state=this.clone(this.base); const s=this.state;
    s.meta.role=old?.meta.role||'admin'; s.learning=this.clone(progress); s.db.connected=true;
    s.trainer.checkpoint='scenario'+String(n).padStart(2,'0'); s.trainer.checkpoint_label='Start Scenario '+String(n).padStart(2,'0');
    delete s.learning[s.trainer.checkpoint];
    s.db.users.SYS.password='oracle'; s.db.users.SYSTEM.password='oracle'; s.db.users.HR.password='oracle';
    s.db.tables['HR.EMPLOYEES'].data=Array.from({length:107},(_,i)=>({EMPLOYEE_ID:100+i,FIRST_NAME:i?'Employee'+i:'Steven',LAST_NAME:i?'Training':'King'}));
    if(n>1) {
      const u=this.user('AVDF_DEMO','Oracle#26Lab1'); u.system_privileges=['CREATE SESSION'];u.object_privileges=['HR.EMPLOYEES SELECT'];
      s.db.audit_policies.AVDF_DAY1_HR_ACCESS={name:'AVDF_DAY1_HR_ACCESS',actions:['SELECT'],object:'HR.EMPLOYEES',enabled:true,users:['AVDF_DEMO']};
      s.db.audit_policies.AVDF_DAY1_LOGIN={name:'AVDF_DAY1_LOGIN',actions:['LOGON','LOGOFF'],enabled:true,users:['ALL USERS']};
      s.db.container='PDB1';
    }
    if(n>2) {
      const u=this.user('AVDFCOLLECT','Oracle#AVDF26');u.system_privileges=['CREATE SESSION'];u.roles=['AVDF_SIM_SETUP'];s.system.setup_script_present=true;
      this.perform('register_target',{password:'Oracle#AVDF26'});this.perform('add_table_trail');this.startCollection();
    }
    if(n>3) {
      const app=this.user('AVDF_D2_APP','Oracle#D2App26');app.system_privileges=['CREATE SESSION','CREATE TABLE','CREATE PROCEDURE'];app.quota=true;
      const reader=this.user('AVDF_D2_READER','Oracle#D2Read26');reader.system_privileges=['CREATE SESSION'];reader.object_privileges=['AVDF_D2_APP.CUSTOMER_SECURE SELECT','AVDF_D2_APP.CUSTOMER_SECURE UPDATE'];
      s.db.tables['AVDF_D2_APP.CUSTOMER_SECURE']={owner:'AVDF_D2_APP',name:'CUSTOMER_SECURE',rows:5,data:['Budi Santoso','Siti Aminah','Andi Wijaya','Rina Putri','Dewi Lestari'].map((name,i)=>({CUSTOMER_ID:i+1,CUSTOMER_NAME:name,CITY:['Jakarta','Bandung','Surabaya','Depok','Bogor'][i],CREDIT_LIMIT:[50000000,35000000,75000000,25000000,60000000][i],ACCOUNT_STATUS:i===4?'SUSPENDED':'ACTIVE'}))};
      s.db.audit_policies.AVDF_D2_SENSITIVE_ACCESS={name:'AVDF_D2_SENSITIVE_ACCESS',enabled:true,users:['ALL USERS'],actions:['SELECT','UPDATE'],object:'AVDF_D2_APP.CUSTOMER_SECURE'};
      s.db.audit_policies.AVDF_D2_SCHEMA_CHANGES={name:'AVDF_D2_SCHEMA_CHANGES',enabled:true,users:['ALL USERS'],actions:['CREATE TABLE','ALTER TABLE','DROP TABLE']};
      ['retrieve_audit_policies','create_retention','apply_retention','create_failed_login_alert'].forEach(a=>this.perform(a));
    }
    if(n>4) {
      ['register_host','download_agent','install_agent','get_activation_key','activate_agent','download_hostmon','install_hostmon','register_firewall','create_monitor','toggle_monitor','add_network_trail'].forEach(a=>this.perform(a));
    }
    if(n>5) this.perform('enable_response_monitoring');
    if(n>6) {
      ['deploy_log_all','generate_normal_workload','create_d4_policy_shell','create_d4_user_set','create_d4_object_set','create_d4_client_set','create_d4_profile','create_d4_cluster_set','add_d4_sql_rule','add_d4_object_rule','configure_d4_default','configure_d4_unknown','configure_d4_login','add_d4_session_rule','set_d4_evaluation_order','publish_d4_policy','deploy_d4_policy'].forEach(a=>this.perform(a));
    }
    if(n>7) {
      this.perform('create_large_result_alert');
      for(let i=0;i<3;i++) this.connect('AVDF_D2_READER','WrongPassword');
      this.connect('AVDF_D2_READER','Oracle#D2Read26');this.sql('SELECT * FROM avdf_d2_app.customer_secure');
    }
    if(n>8) ['save_report','schedule_report','create_target_group','add_target_to_group','add_compliance_target'].forEach(a=>this.perform(a));
    // Later independent checkpoints deliberately keep the reader unprivileged.
    if(n>9) s.db.users.AVDFCOLLECT.roles.push('AVDF_SIM_ENTITLEMENT');
    if(n>10) {
      this.perform('retrieve_entitlements');
      s.db.users.AVDFCOLLECT.roles.push('AVDF_SIM_SPA');s.db.session_user='AVDF_D2_APP';
      this.sql("CREATE OR REPLACE PROCEDURE show_customer_count AS l_count NUMBER; BEGIN SELECT COUNT(*) INTO l_count FROM customer_secure; DBMS_OUTPUT.PUT_LINE('CUSTOMERS=' || l_count); END;");
      this.perform('schedule_spa');this.perform('retrieve_spa');
      this.sql("CREATE OR REPLACE PROCEDURE show_customer_count AS l_count NUMBER; BEGIN SELECT COUNT(*) INTO l_count FROM customer_secure; DBMS_OUTPUT.PUT_LINE('CURRENT CUSTOMER COUNT=' || l_count); END;");
      this.perform('retrieve_spa');
    }
    if(n===12){s.db.native_events=[];s.avdf_repository=[];s.firewall_events=[];s.alerts=[];}
    s.db.session_user='SYS';s.db.connected=true;s.db.container=n===1?'CDB$ROOT':'PDB1';
    s.history=[]; this.save(); return s;
  },
  act(a,p={}) {
    const before=this.clone(this.state);
    try { const result=this.perform(a,p);this.save();return result||a.replaceAll('_',' ')+' — selesai (simulasi)'; }
    catch(e) { this.state=before;return 'Gagal: '+e.message; }
  },
  perform(a,p={}) {
    const s=this.state, t=s.targets[0], mp=s.monitoring_points[0], policy=s.firewall_policies.find(x=>x.name==='LAB_D4_DETECTIVE');
    const put=(list,item,key='name')=>{const i=list.findIndex(x=>x[key]===item[key]);if(i<0)list.push(item);else list[i]=item;};
    const needTarget=()=>this.require(t,'Daftarkan PDB1_26AI terlebih dahulu.');
    const needPolicy=()=>this.require(policy,'Buat LAB_D4_DETECTIVE terlebih dahulu.');
    switch(a) {
      case 'set_role': this.require(['admin','auditor'].includes(p.role),'Role tidak dikenal');s.meta.role=p.role;break;
      case 'complete_lab':s.lab_progress[p.key]=true;break;
      case 'reset_lab_progress':s.lab_progress={};break;
      case 'download_setup_script':s.system.setup_script_present=true;return 'Script simulasi tersedia: /home/oracle/avdf_setup/oracle_user_setup.sql';
      case 'register_target': {
        const u=s.db.users.AVDFCOLLECT;this.require(u?.roles.includes('AVDF_SIM_SETUP'),'AVDFCOLLECT harus menjalankan SETUP.');
        this.require(p.password===undefined||p.password===u.password,'Registration failed: password AVDFCOLLECT salah.');
        put(s.targets,{name:'PDB1_26AI',type:'Oracle Database',host:'192.168.56.26',port:1521,service:'PDB1',credential:'AVDFCOLLECT',jdbc:'jdbc:oracle:thin:@//192.168.56.26:1521/PDB1',status:'Registered',retention_policy:'Default',firewall_policy:'Default'});break;
      }
      case 'add_table_trail':needTarget();if(!s.trails.some(x=>x.type==='TABLE'))s.trails.push({type:'TABLE',target:t.name,location:'UNIFIED_AUDIT_TRAIL',host:'agentless collection',status:'CONFIGURED'});break;
      case 'start_collection':this.startCollection();break;
      case 'add_network_trail':needTarget();this.require(mp,'Buat monitoring point dahulu');if(!s.trails.some(x=>x.type==='NETWORK'))s.trails.push({type:'NETWORK',target:t.name,location:'DBFW1',host:'db26ai',status:'COLLECTING'});break;
      case 'retrieve_audit_policies':needTarget();s.audit_policy_catalog=this.clone(Object.values(s.db.audit_policies));this.job('Audit Policy Retrieval');break;
      case 'enable_d2_policies':needTarget();for(const name of ['AVDF_D2_SENSITIVE_ACCESS','AVDF_D2_SCHEMA_CHANGES']){this.require(s.db.audit_policies[name],'Buat policy '+name+' dahulu');s.db.audit_policies[name].enabled=true;s.db.audit_policies[name].users=['ALL USERS'];}s.audit_policy_catalog=this.clone(Object.values(s.db.audit_policies));this.job('Audit Policy Provisioning');break;
      case 'create_retention':put(s.retention_policies,{name:'LAB_3M_ONLINE',online_months:3,archive_months:0});break;
      case 'apply_retention':needTarget();this.require(s.retention_policies.some(x=>x.name==='LAB_3M_ONLINE'),'Buat retention dahulu');t.retention_policy='LAB_3M_ONLINE';break;
      case 'create_failed_login_alert':needTarget();put(s.alert_policies,{name:'LAB_FAILED_LOGIN',type:'Oracle Database',target:t.name,severity:'Critical',threshold:3,duration:5,enabled:true,condition:"EVENT_STATUS=FAILURE AND EVENT=LOGON; >=3 / 5 menit per user"});break;
      case 'create_large_result_alert':needTarget();put(s.alert_policies,{name:'LAB_D4_LARGE_RESULT',type:'Database Firewall',target:t.name,severity:'Critical',threshold:3,operator:'>',enabled:true,condition:'USER=AVDF_D2_READER AND OBJECT=CUSTOMER_SECURE AND ROW_COUNT > 3'});break;
      case 'register_host':put(s.hosts,{name:'db26ai',ip:'192.168.56.26',agent_status:'Registered'});break;
      case 'download_agent':s.system.agent_package_present=true;break;
      case 'install_agent':this.require(s.hosts.length&&s.system.agent_package_present,'Register Host dan Download Agent dahulu');s.system.agent_installed=true;s.hosts[0].agent_status='Installed';break;
      case 'get_activation_key':this.require(s.system.agent_installed,'Install agent dahulu');s.system.activation_key='TRAINING-DB26AI';return 'Activation key simulasi: TRAINING-DB26AI';
      case 'activate_agent':this.require(s.system.activation_key,'Ambil Activation Key dahulu');s.system.agent_activated=true;s.system.agent_running=true;s.hosts[0].agent_status='RUNNING';break;
      case 'download_hostmon':s.system.hostmon_package_present=true;break;
      case 'install_hostmon':this.require(s.system.hostmon_package_present&&s.system.agent_running,'Download Host Monitor dan aktifkan agent dahulu');s.system.hostmon_installed=true;s.system.hostmon_unzipped=true;s.system.hostmon_running=true;break;
      case 'register_firewall':put(s.firewalls,{name:'DBFW1',ip:'192.168.56.27',nic:'eth0',fingerprint:'TRAINING-SHA256',status:'RUNNING'});break;
      case 'create_monitor':needTarget();this.require(s.firewalls.length,'Register DBFW1 dahulu');if(!mp)s.monitoring_points.push({target:t.name,firewall:'DBFW1',mode:'Monitoring',nic:'eth0',address:'192.168.56.26:1521:PDB1',policy:'Default',status:'Stopped',database_response:false,full_error_message:false});break;
      case 'toggle_monitor':this.require(mp,'Buat monitor dahulu');mp.status=mp.status==='Running'?'Stopped':'Running';break;
      case 'enable_response_monitoring':this.require(mp,'Buat monitor dahulu');mp.database_response=true;mp.full_error_message=true;break;
      case 'deploy_log_all':this.require(mp,'Buat monitor dahulu');mp.policy='Log all';mp.deployed_policy=this.clone(s.firewall_policies.find(x=>x.name==='Log all'));t.firewall_policy='Log all';this.job('Database Firewall Policy Deployment');break;
      case 'create_d4_policy_shell':if(!policy)s.firewall_policies.push({name:'LAB_D4_DETECTIVE',type:'Oracle Database',status:'Draft',rules:[],description:'Detective monitoring policy for training'});break;
      case 'create_d4_user_set':s.firewall_sets.db_users.D4_APP_READERS=['AVDF_D2_READER'];break;
      case 'create_d4_object_set':s.firewall_sets.db_objects.D4_SENSITIVE_OBJECTS=['CUSTOMER_SECURE'];break;
      case 'create_d4_client_set':s.firewall_sets.client_programs.D4_SQLPLUS_CLIENT=['sqlplus'];break;
      case 'create_d4_profile':this.require(s.firewall_sets.db_users.D4_APP_READERS,'Buat user set dahulu');s.profiles.D4_READER_PROFILE={db_user_set:'D4_APP_READERS'};break;
      case 'create_d4_cluster_set': {
        const names=p.clusters||['COUNT_CUSTOMER','CUSTOMER_BY_ID','ACTIVE_CUSTOMERS'];this.require(names.every(n=>s.firewall_cluster_catalog.some(c=>c.name===n)),'Generate Normal SQL Workload saat monitor Running dahulu');s.firewall_sets.sql_clusters.D4_NORMAL_SQL=names;break;
      }
      case 'add_d4_sql_rule':case 'add_d4_object_rule':case 'add_d4_session_rule': {
        needPolicy();this.require(s.profiles.D4_READER_PROFILE,'Buat profile dahulu');
        const sql=a==='add_d4_sql_rule',obj=a==='add_d4_object_rule';
        this.require(!sql||s.firewall_sets.sql_clusters.D4_NORMAL_SQL,'Buat SQL Cluster Set dahulu');this.require(!obj||s.firewall_sets.db_objects.D4_SENSITIVE_OBJECTS,'Buat Object Set dahulu');
        put(policy.rules,{name:sql?'KNOWN_APPLICATION_SQL':obj?'MONITOR_SENSITIVE_CUSTOMER_DATA':'MONITOR_READER_SESSION',kind:sql?'SQL Statement':obj?'Database Object':'Session Context',action:sql?'Pass':'Alert',logging:obj?'Always':'Unique',severity:sql?'Minimal':obj?'Major':'Moderate',capture_row_count:obj});policy.status='Draft';break;
      }
      case 'configure_d4_default':needPolicy();put(policy.rules,{name:'DEFAULT_RULE',kind:'Default',action:'Alert',logging:'Always',severity:'Moderate'});policy.status='Draft';break;
      case 'configure_d4_unknown':needPolicy();policy.unknown_traffic={action:'Alert',severity:'Major',logging:'Always'};policy.status='Draft';break;
      case 'configure_d4_login':needPolicy();policy.login_logout={success:'Log',failure:'Alert'};policy.status='Draft';break;
      case 'set_d4_evaluation_order':needPolicy();policy.evaluation_order=p.order||['SQL Statement','Database Object','Session Context','Default'];this.require(policy.evaluation_order.length===4&&new Set(policy.evaluation_order).size===4&&policy.evaluation_order.every(x=>['SQL Statement','Database Object','Session Context','Default'].includes(x)),'Urutan harus memuat empat jenis rule');policy.status='Draft';break;
      case 'publish_d4_policy':needPolicy();this.require(policy.rules.length&&policy.evaluation_order,'Lengkapi rules dan Evaluation Order');policy.status='Published';this.job('Database Firewall Policy Publication');break;
      case 'deploy_d4_policy':needPolicy();this.require(mp&&policy.status==='Published','Publish policy dan buat monitor dahulu');mp.policy=policy.name;mp.deployed_policy=this.clone(policy);mp.deployed_sets=this.clone(s.firewall_sets);t.firewall_policy=policy.name;this.job('Database Firewall Policy Deployment');break;
      case 'copy_d4_policy':needPolicy();put(s.firewall_policies,{...this.clone(policy),name:'LAB_D4_DETECTIVE_COPY',status:'Draft'});break;
      case 'export_d4_policy':needPolicy();s.policy_exports.unshift({time:new Date().toISOString(),policy:this.clone(policy)});break;
      case 'save_report':needTarget();put(s.saved_reports,{name:'D5_READER_INVESTIGATION',description:'Investigasi AVDF_D2_READER',sort:p.sort||'asc',filter:p.filter||{target:t.name,user:'AVDF_D2_READER'},kind:p.kind||'all'});break;
      case 'schedule_report':this.require(s.saved_reports.length,'Save Report dahulu');put(s.report_schedules,{name:'D5_DAILY_INVESTIGATION',report:'D5_READER_INVESTIGATION',frequency:'Daily (metadata simulasi)',format:'PDF',status:'Configured'});this.job('Report Schedule','Metadata saja; tidak menghasilkan PDF atau menjalankan scheduler latar belakang');break;
      case 'create_target_group':put(s.target_groups,{name:'D5_TRAINING_GROUP',description:'Training',targets:[]});break;
      case 'add_target_to_group':needTarget();this.require(s.target_groups.length,'Create Target Group dahulu');if(!s.target_groups[0].targets.includes(t.name))s.target_groups[0].targets.push(t.name);break;
      case 'add_compliance_target':needTarget();if(!s.compliance_groups[0].targets.includes(t.name))s.compliance_groups[0].targets.push(t.name);break;
      case 'retrieve_entitlements':needTarget();this.require(s.db.users.AVDFCOLLECT?.roles.includes('AVDF_SIM_ENTITLEMENT'),'Jalankan setup ENTITLEMENT sebagai SYS dahulu');s.entitlement_snapshots.unshift({id:this.id(),time:new Date().toISOString(),target:t.name,users:this.clone(s.db.users),roles:this.clone(s.db.roles)});this.job('Entitlement Retrieval');break;
      case 'label_latest_entitlement':this.require(s.entitlement_snapshots.length,'Retrieve entitlement dahulu');this.require(!s.entitlement_snapshots.slice(1).some(x=>x.label===p.label),'Label sudah digunakan; mulai ulang skenario untuk baseline baru');s.entitlement_snapshots[0].label=p.label;break;
      case 'schedule_spa':needTarget();this.require(s.db.users.AVDFCOLLECT?.roles.includes('AVDF_SIM_SPA'),'Jalankan setup SPA dahulu');s.spa_schedule.enabled=true;break;
      case 'retrieve_spa': {
        this.require(s.spa_schedule.enabled,'Enable Retrieval dahulu');const prev=s.spa_snapshots[0]?.procedures||{},cur=s.db.procedures;
        for(const name of new Set([...Object.keys(prev),...Object.keys(cur)]))if(prev[name]?.source!==cur[name]?.source)s.spa_changes.unshift({time:new Date().toISOString(),target:'PDB1_26AI',procedure:name,change:!cur[name]?'Deleted':!prev[name]?'Created':'Modified',version:cur[name]?.version||prev[name].version+1});
        s.spa_snapshots.unshift({procedures:this.clone(cur),time:new Date().toISOString()});this.job('Stored Procedure Retrieval');break;
      }
      case 'open_alert':case 'ack_alert':case 'close_alert':{const alert=s.alerts.find(x=>x.id===p.id);this.require(alert,'Alert tidak ditemukan');alert.status=a==='open_alert'?'Open':a==='ack_alert'?'Acknowledged':'Closed';break;}
      case 'create_notification_list':put(s.notifications.distribution_lists,{name:'D5_SECURITY_TEAM',members:p.members||[]});break;
      case 'generate_normal_workload':this.normalWorkload();break;
      case 'generate_incident':this.incident();break;
      case 'inject_failure':this.inject(p.kind);break;
      case 'clear_failures':for(const f of s.trainer.injected_failures){let obj=s;const path=f.path.split('.');for(const k of path.slice(0,-1))obj=obj[k];obj[path.at(-1)]=f.before;}s.trainer.injected_failures=[];this.collect();break;
      default:throw new Error('Aksi belum didukung: '+a);
    }
  },
  inject(kind) {
    const s=this.state,defs={network:['system.network_ok',false],listener:['system.listener','STOPPED'],pdb:['system.pdb1','MOUNTED'],agent:['system.agent_running',false],hostmon:['system.hostmon_running',false],monitor_address:['monitoring_points.0.address','192.168.56.99:1521:PDB1'],trail:['trails.0.status','ERROR'],firewall_network:['system.dbfw_network_ok',false]};
    this.require(defs[kind],'Jenis failure tidak dikenal');if(s.trainer.injected_failures.some(f=>f.kind===kind))return;
    const [path,value]=defs[kind];let obj=s;const keys=path.split('.');for(const k of keys.slice(0,-1)){obj=obj?.[k];this.require(obj,'Konfigurasi komponen terlebih dahulu');}
    s.trainer.injected_failures.push({kind,path,before:obj[keys.at(-1)],time:new Date().toISOString()});obj[keys.at(-1)]=value;
  },
  healthyDB() {const x=this.state.system;return x.network_ok&&x.listener==='RUNNING'&&x.pdb1==='READ WRITE';},
  healthyFW() {const s=this.state,m=s.monitoring_points[0];return this.healthyDB()&&s.system.agent_running&&s.system.hostmon_running&&s.system.dbfw_network_ok&&s.firewalls[0]?.status==='RUNNING'&&m?.status==='Running'&&m.address==='192.168.56.26:1521:PDB1'&&s.trails.some(t=>t.type==='NETWORK'&&t.status==='COLLECTING');},
  startCollection() {const tr=this.state.trails.find(t=>t.type==='TABLE');this.require(tr,'Add TABLE Trail dahulu');this.require(this.healthyDB(),'Target tidak sehat: periksa network, listener, PDB');tr.status='COLLECTING';tr.last_start=new Date().toISOString();this.collect();},
  collect() {
    const s=this.state,tr=s.trails.find(t=>t.type==='TABLE'&&t.status==='COLLECTING');if(!tr||!this.healthyDB())return;
    const known=new Set(s.avdf_repository.map(e=>e.source_event_id));
    for(const e of [...s.db.native_events].reverse())if(!known.has(e.id)){s.avdf_repository.unshift({...this.clone(e),source_event_id:e.id});this.evaluateLogin(e);}
    tr.collected_through=new Date().toISOString();
  },
  alert(policy,e,message) {this.state.alerts.unshift({id:this.id(),time:e.event_time,severity:policy.severity,status:'New',message,target:'PDB1_26AI',user:e.dbusername||e.user,object:e.object_name||e.object,row_count:e.row_count,policy:policy.name,event_id:e.id,sql_text:e.sql_text,command:e.action_name||e.command,rule:e.rule});},
  evaluateLogin(e) {
    const s=this.state,p=s.alert_policies.find(x=>x.name==='LAB_FAILED_LOGIN'&&x.enabled);if(!p||e.action_name!=='LOGON'||e.return_code!==1017)return;
    const recent=s.avdf_repository.filter(x=>x.dbusername===e.dbusername&&x.action_name==='LOGON'&&x.return_code===1017&&Date.parse(e.event_time)-Date.parse(x.event_time)>=0&&Date.parse(e.event_time)-Date.parse(x.event_time)<=p.duration*60000);
    const last=s.alerts.find(a=>a.policy===p.name&&a.user===e.dbusername);if(recent.length>=p.threshold&&(!last||Date.parse(e.event_time)-Date.parse(last.time)>p.duration*60000))this.alert(p,e,'Tiga login gagal dalam lima menit');
  },
  cluster(sql) {const u=sql.toUpperCase();if(!u.includes('CUSTOMER_SECURE')||!u.startsWith('SELECT'))return 'OTHER_SQL';if(/COUNT\s*\(\*\)/.test(u))return 'COUNT_CUSTOMER';if(/WHERE CUSTOMER_ID\s*=\s*\d+/.test(u))return 'CUSTOMER_BY_ID';if(/WHERE ACCOUNT_STATUS\s*=\s*'ACTIVE'/.test(u))return 'ACTIVE_CUSTOMERS';return 'FULL_CUSTOMER';},
  event(action,object,sql,code=0,rowCount=null,user=this.state.db.session_user) {
    const s=this.state,[owner,name]=object?.includes('.')?object.split('.'):['',object||''];
    const pol=Object.values(s.db.audit_policies).filter(p=>p.enabled&&(!p.users?.length||p.users.includes('ALL USERS')||p.users.includes(user))&&(!p.object||p.object===object)&&((p.actions||[]).includes(action)||(p.name==='ORA_LOGIN_LOGOUT'&&['LOGON','LOGOFF'].includes(action))||(p.name==='ORA_SECURECONFIG'&&['GRANT','REVOKE','CREATE USER','CREATE ROLE','DROP ROLE'].includes(action))));
    const e={id:this.id(),event_time:new Date().toISOString(),target:'PDB1_26AI',source:'Unified Audit',dbusername:user,action_name:action,object_schema:owner,object_name:name,return_code:code,sql_text:sql,unified_audit_policies:pol.map(p=>p.name).join(', '),client_ip:'192.168.56.26',client_program:'sqlplus',client_program_name:'sqlplus',client_host:'db26ai',userhost:'db26ai',status:code?'FAILURE':'SUCCESS'};
    if(pol.length){s.db.native_events.unshift(e);this.collect();}
    if(this.healthyFW()) {
      const m=s.monitoring_points[0],p=m.deployed_policy,cluster=this.cluster(sql);let rule={name:'LOG_ALL',action:'Pass',severity:'Minimal'};
      if(p?.name==='LAB_D4_DETECTIVE') {
        const sets=m.deployed_sets||s.firewall_sets;
        for(const kind of p.evaluation_order) {
          const candidate=p.rules.find(r=>r.kind===kind);if(!candidate)continue;
          const reader=(sets.db_users.D4_APP_READERS||[]).includes(user);
          if((kind==='SQL Statement'&&reader&&(sets.sql_clusters.D4_NORMAL_SQL||[]).includes(cluster))||(kind==='Database Object'&&reader&&(sets.db_objects.D4_SENSITIVE_OBJECTS||[]).includes(name)&&['SELECT','UPDATE'].includes(action))||(kind==='Session Context'&&reader&&!['LOGON','LOGOFF'].includes(action))||kind==='Default'){rule=candidate;break;}
        }
      }
      const fw={...e,id:this.id(),source:'Database Firewall',user,command:action,object:name,policy:m.policy,rule:rule.name,action:rule.action,threat_severity:rule.severity,cluster,row_count:m.database_response?rowCount:null,error_code:m.database_response?code:null,error_message:m.full_error_message&&code?'ORA-'+String(code).padStart(5,'0'):null,monitoring_point:'PDB1_26AI / DBFW1',network_connection:'192.168.56.26 → 192.168.56.26:1521'};
      s.firewall_events.unshift(fw);
      if(action==='SELECT') {let c=s.firewall_cluster_catalog.find(x=>x.name===cluster);if(!c){c={name:cluster,sample_sql:sql,executions:0,first_seen:e.event_time};s.firewall_cluster_catalog.push(c);}c.executions++;c.last_seen=e.event_time;}
      const large=s.alert_policies.find(x=>x.name==='LAB_D4_LARGE_RESULT'&&x.enabled);if(large&&user==='AVDF_D2_READER'&&name==='CUSTOMER_SECURE'&&fw.row_count>large.threshold)this.alert(large,fw,'Hasil query melebihi 3 baris');
    }
    return e;
  },
  connect(name,password) {
    const s=this.state;name=name.toUpperCase();this.require(this.healthyDB(),'ORA-12541: koneksi gagal; periksa network, listener, PDB');
    const u=s.db.users[name];
    if(!u||u.password!==password){this.event('LOGON','',`CONNECT ${name}/***`,1017,null,name);s.db.connected=false;return 'ORA-01017: invalid username/password; koneksi SQL terputus. Hubungkan kembali.';}
    if(!['SYS','SYSTEM'].includes(name)&&!u.system_privileges.includes('CREATE SESSION')){s.db.connected=false;return 'ORA-01045: CREATE SESSION diperlukan';}
    s.db.session_user=name;s.db.container='PDB1';s.db.connected=true;this.event('LOGON','',`CONNECT ${name}/***`,0,null,name);return 'Connected as '+name+' @ PDB1';
  },
  normalWorkload() {
    this.require(this.healthyFW(),'Aktifkan seluruh jalur firewall dahulu');const s=this.state,prev=[s.db.session_user,s.db.connected,s.db.container];
    this.connect('AVDF_D2_READER','Oracle#D2Read26');
    for(const q of ['SELECT COUNT(*) FROM avdf_d2_app.customer_secure','SELECT customer_name, credit_limit FROM avdf_d2_app.customer_secure WHERE customer_id=1','SELECT customer_name, credit_limit FROM avdf_d2_app.customer_secure WHERE customer_id=5',"SELECT customer_id, customer_name FROM avdf_d2_app.customer_secure WHERE account_status='ACTIVE'"])this.sql(q);
    [s.db.session_user,s.db.connected,s.db.container]=prev;
  },
  incident() {
    const s=this.state;this.require(this.healthyFW()&&s.monitoring_points[0].policy==='LAB_D4_DETECTIVE'&&s.alert_policies.some(x=>x.name==='LAB_D4_LARGE_RESULT'),'Mulai checkpoint 12 untuk menyiapkan capstone');
    this.require(!s.trainer.incident_generated,'Insiden sudah dibuat. Mulai ulang checkpoint 12 untuk mengulang.');
    const prev=[s.db.session_user,s.db.connected,s.db.container];s.db.users.AVDFCOLLECT.roles.push('AVDF_SIM_ENTITLEMENT');
    this.perform('retrieve_entitlements');this.perform('label_latest_entitlement',{label:'D5_BASELINE'});
    s.db.session_user='SYS';s.db.connected=true;
    for(const q of ['CREATE ROLE avdf_d5_power_role','GRANT CREATE TABLE TO avdf_d5_power_role','GRANT avdf_d5_power_role TO avdf_d2_reader','GRANT SELECT ON hr.employees TO avdf_d2_reader','CREATE AUDIT POLICY avdf_d5_hr_access ACTIONS SELECT ON hr.employees','AUDIT POLICY avdf_d5_hr_access'])this.sql(q);
    for(let i=0;i<3;i++)this.connect('AVDF_D2_READER','WrongPassword');
    this.connect('AVDF_D2_READER','Oracle#D2Read26');
    this.sql('SELECT COUNT(*) FROM hr.employees');this.sql('SELECT * FROM avdf_d2_app.customer_secure');this.sql("UPDATE avdf_d2_app.customer_secure SET account_status='REVIEW' WHERE customer_id=1");this.sql('ROLLBACK');
    this.perform('retrieve_entitlements');this.perform('label_latest_entitlement',{label:'D5_AFTER_ESCALATION'});s.trainer.incident_generated=true;
    [s.db.session_user,s.db.connected,s.db.container]=prev;
  },
  command(channel,command) {
    const before=this.clone(this.state);let output;
    try {
      this.require(command.trim(),'Masukkan perintah');
      if(channel==='sql-hybrid')throw new Error('Hybrid tidak tersedia pada edisi browser.');
      if(channel==='os')output=this.os(command);
      else if(channel==='sql')output=this.sqlBatch(command);
      else if(channel==='avcli')output=this.avcli(command);
      else throw new Error('Kanal tidak dikenal');
    } catch(e) {this.state=before;output='Gagal: '+e.message;}
    this.state.history.push({time:new Date().toISOString(),channel,command,output});this.save();return output;
  },
  os(command) {
    const s=this.state,e=s.environment;
    if(/^for i in /m.test(command)) {
      const iterations=command.match(/^for i in ([\d ]+)\s*$/m)?.[1].trim().split(/\s+/).length;
      this.require(iterations&&iterations<=20,'Loop hanya mendukung daftar angka (maksimal 20)');const login=command.match(/sqlplus[^\n]+/)?.[0];this.require(login,'Loop memerlukan sqlplus');
      const body=command.match(/<<'EOF'\s*\n([\s\S]*?)\nEOF/)?.[1]||'';const lines=[];
      for(let i=0;i<iterations;i++){lines.push(this.os(login));if(s.db.connected&&body)lines.push(this.sqlBatch(body));}return lines.join('\n');
    }
    return command.trim().split(/\r?\n/).map(line=>{
      line=line.trim();if(!line)return '';
      if(/^sqlplus\b/i.test(line)) {if(/\/ as sysdba/i.test(line)){s.db.session_user='SYS';s.db.container='CDB$ROOT';s.db.connected=true;return 'Connected as SYS @ CDB$ROOT';}const m=line.match(/['"]?(\w+)\/([^@\s]+)@\/\/192\.168\.56\.26:1521\/PDB1/i);this.require(m,'Gunakan sqlplus -L user/password@//192.168.56.26:1521/PDB1');return this.connect(m[1],m[2]);}
      const variable=line.match(/^echo \$(ORACLE_BASE|ORACLE_HOME|ORACLE_SID)$/);if(variable)return e[variable[1].toLowerCase()];
      if(line==='which sqlplus')return e.oracle_home+'/bin/sqlplus';if(line==='hostname')return e.hostname;
      if(line==='ip -br addr')return e.nic+' UP 192.168.56.26/24';if(line==='ip route')return 'default via '+e.gateway+' dev '+e.nic;
      if(line==='lsnrctl status')return 'LISTENER '+s.system.listener+'\nService PDB1 '+s.system.pdb1;
      if(line==='ss -lntp | grep 1521')return s.system.listener==='RUNNING'?'LISTEN 0 128 *:1521':'No listener on port 1521';
      if(/^cd \/home\/oracle\/avdf_agent\/bin$/.test(line))return '/home/oracle/avdf_agent/bin';
      if(line==='./agentctl status')return s.system.agent_running?'Agent RUNNING':'Agent STOPPED';
      if(/^(ping -c 4|nc -vz) 192\.168\.56\.27(?: 2051)?$/.test(line))return s.system.dbfw_network_ok?'DBFW1 reachable / 2051 open':'DBFW1 unreachable / connection timed out';
      throw new Error('Perintah OS belum didukung: '+line);
    }).join('\n');
  },
  sqlBatch(command) {
    // SQL*Plus directives and PL/SQL slash delimiters must not be split at inner semicolons.
    let buffer='',plsql=false;const units=[];
    for(const line of command.replace(/\r/g,'').split('\n')) {
      const t=line.trim();if(!t||t.startsWith('--'))continue;
      if(!buffer&&/^(SHOW |SET |CONNECT |CONN |EXIT$|@)/i.test(t)){units.push(t.replace(/;$/,''));continue;}
      if(!buffer&&/^(CREATE OR REPLACE PROCEDURE|BEGIN\b)/i.test(t))plsql=true;
      if(plsql&&t==='/'){units.push(buffer.trim());buffer='';plsql=false;continue;}
      buffer+=(buffer?'\n':'')+line;
      if(!plsql){let quote=false,start=0;for(let i=0;i<buffer.length;i++){if(buffer[i]==="'"){if(quote&&buffer[i+1]==="'"){i++;continue;}quote=!quote;}if(buffer[i]===';'&&!quote){units.push(buffer.slice(start,i).trim());start=i+1;}}buffer=buffer.slice(start).trim();}
    }
    if(buffer)units.push(buffer.trim());
    const outputs=[];for(const q of units){const out=this.sql(q);outputs.push(out);if(/^(ORA-|Gagal:)/.test(out))break;}return outputs.join('\n\n');
  },
  sql(raw) {
    const s=this.state,d=s.db,q=raw.trim().replace(/;$/,''),u=q.replace(/\s+/g,' ').toUpperCase();let m;
    if((m=q.match(/^(?:CONNECT|CONN) (\w+)\/(.+?)(?:@.*)?$/i)))return this.connect(m[1],m[2]);
    if(u==='EXIT'){if(d.connected)this.event('LOGOFF','','EXIT');d.connected=false;return 'Disconnected';}
    this.require(d.connected,'SQL terputus; hubungkan ulang via OS Terminal.');
    const admin=['SYS','SYSTEM'].includes(d.session_user),user=d.users[d.session_user];
    const privilege=p=>admin||user.system_privileges.includes(p)||user.roles.some(r=>(d.roles[r]?.system_privileges||[]).includes(p));
    const qualify=name=>name.includes('.')?name.toUpperCase():d.session_user+'.'+name.toUpperCase();
    const access=(object,p)=>admin||object.startsWith(d.session_user+'.')||user.object_privileges.includes(object+' '+p);
    const adminOnly=()=>this.require(admin,'ORA-01031: jalankan sebagai SYS; gunakan sqlplus / as sysdba lalu ALTER SESSION SET CONTAINER=PDB1');
    if(u==='SHOW PDBS')return 'CON_ID CON_NAME OPEN MODE\n2 PDB$SEED READ ONLY\n3 PDB1 '+s.system.pdb1;
    if(u==='SHOW CON_NAME')return d.container;if(u==='SET SERVEROUTPUT ON'){d.serveroutput=true;return 'SERVEROUTPUT ON';}
    if(u==='ALTER SESSION SET CONTAINER=PDB1'){adminOnly();d.container='PDB1';return 'Session altered: PDB1';}
    if((m=u.match(/^@\/HOME\/ORACLE\/AVDF_SETUP\/ORACLE_USER_SETUP.SQL AVDFCOLLECT (SETUP|ENTITLEMENT|SPA)$/))){adminOnly();this.require(s.system.setup_script_present&&d.users.AVDFCOLLECT,'Download script dan buat AVDFCOLLECT dahulu');const role='AVDF_SIM_'+m[1];if(!d.users.AVDFCOLLECT.roles.includes(role))d.users.AVDFCOLLECT.roles.push(role);return m[1]+' privileges granted to AVDFCOLLECT';}
    if((m=q.match(/^CREATE USER (\w+)\s+IDENTIFIED BY "([^"]+)"$/i))){adminOnly();this.require(d.container==='PDB1','Pindah ke PDB1 dahulu');const name=m[1].toUpperCase();this.require(!d.users[name],'ORA-01920: user sudah ada; lanjutkan atau mulai ulang skenario');this.user(name,m[2]);this.event('CREATE USER','',q);return 'User created: '+name;}
    if((m=u.match(/^ALTER USER (\w+) QUOTA UNLIMITED ON USERS$/))){adminOnly();this.require(d.users[m[1]],'User tidak ditemukan');d.users[m[1]].quota=true;return 'User altered';}
    if((m=u.match(/^CREATE ROLE (\w+)$/))){adminOnly();this.require(!d.roles[m[1]],'Role sudah ada');d.roles[m[1]]={system_privileges:[],object_privileges:[],roles:[]};this.event('CREATE ROLE','',q);return 'Role created';}
    if((m=u.match(/^(GRANT|REVOKE) (.+?) (TO|FROM) (\w+)$/))){
      const granting=m[1]==='GRANT',who=d.users[m[4]]||d.roles[m[4]];this.require(who,'Grantee tidak ditemukan');
      const obj=m[2].match(/^(.+?) ON ([\w.]+)$/);if(!obj)adminOnly();else this.require(access(qualify(obj[2]),'GRANT'),'ORA-01031: insufficient privileges');
      for(const value of (obj?obj[1]:m[2]).split(',').map(x=>x.trim())){const key=obj?'object_privileges':d.roles[value]?'roles':'system_privileges',item=obj?qualify(obj[2])+' '+value:value;who[key]||=[];if(granting&&!who[key].includes(item))who[key].push(item);if(!granting)who[key]=who[key].filter(x=>x!==item);}
      this.event(m[1],obj?qualify(obj[2]):'',q);return granting?'Grant succeeded':'Revoke succeeded';
    }
    if((m=u.match(/^DROP ROLE (\w+)$/))){adminOnly();this.require(d.roles[m[1]],'Role tidak ditemukan');delete d.roles[m[1]];for(const x of Object.values(d.users))x.roles=x.roles.filter(r=>r!==m[1]);this.event('DROP ROLE','',q);return 'Role dropped';}
    if((m=u.match(/^CREATE AUDIT POLICY (\w+) ACTIONS (.+)$/))){adminOnly();this.require(!d.audit_policies[m[1]],'Audit policy sudah ada');const obj=m[2].match(/ ON ([\w.]+)$/);d.audit_policies[m[1]]={name:m[1],actions:m[2].replace(/ ON [\w.]+$/,'').split(',').map(x=>x.trim()),object:obj?qualify(obj[1]):null,enabled:false,users:[]};return 'Audit policy created';}
    if((m=u.match(/^(AUDIT|NOAUDIT) POLICY (\w+)(?: BY (\w+))?$/))){adminOnly();this.require(d.audit_policies[m[2]],'Policy tidak ditemukan');Object.assign(d.audit_policies[m[2]],{enabled:m[1]==='AUDIT',users:[m[3]||'ALL USERS']});return 'Audit policy '+(m[1]==='AUDIT'?'enabled':'disabled');}
    if((m=u.match(/^CREATE TABLE ([\w.]+)\s*\(/))){this.require(privilege('CREATE TABLE'),'ORA-01031: CREATE TABLE diperlukan');const name=qualify(m[1]);this.require(!d.tables[name],'ORA-00955: table sudah ada');d.tables[name]={owner:name.split('.')[0],name:name.split('.')[1],rows:0,data:[]};this.event('CREATE TABLE',name,q);return 'Table created';}
    if((m=q.match(/^INSERT INTO ([\w.]+) VALUES\s*\(([\s\S]+)\)$/i))){const name=qualify(m[1]),tab=d.tables[name];this.require(tab&&access(name,'INSERT'),'ORA-00942: table tidak tersedia');this.require(admin||user.quota,'ORA-01950: grant quota pada USERS dahulu');const vals=m[2].match(/'(?:[^']|'')*'|[^,]+/g).map(x=>x.trim().replace(/^'|'$/g,''));this.require(vals.length===5,'Dataset lab memerlukan lima kolom');tab.data.push({CUSTOMER_ID:+vals[0],CUSTOMER_NAME:vals[1],CITY:vals[2],CREDIT_LIMIT:+vals[3],ACCOUNT_STATUS:vals[4]});tab.rows=tab.data.length;return '1 row inserted';}
    if((m=q.match(/^CREATE OR REPLACE PROCEDURE (\w+)[\s\S]*$/i))){this.require(privilege('CREATE PROCEDURE'),'ORA-01031: GRANT CREATE PROCEDURE dahulu');const name=qualify(m[1]);d.procedures[name]={source:q,version:(d.procedures[name]?.version||0)+1,status:'VALID'};this.event('CREATE PROCEDURE',name,q);return 'Procedure created';}
    if(/^BEGIN\s+SHOW_CUSTOMER_COUNT;\s*END;?$/i.test(u)){const proc=d.procedures[qualify('SHOW_CUSTOMER_COUNT')];this.require(proc,'Procedure belum dibuat');const count=d.tables[qualify('CUSTOMER_SECURE')]?.rows||0;return (d.serveroutput?(proc.source.includes('CURRENT CUSTOMER COUNT=')?'CURRENT CUSTOMER COUNT=':'CUSTOMERS=')+count+'\n':'')+'PL/SQL procedure successfully completed';}
    if(u==='COMMIT'){d.transaction.pending_updates=[];return 'Commit complete';}
    if(u==='ROLLBACK'){for(const x of d.transaction.pending_updates.reverse())d.tables[x.name].data=x.before;d.transaction.pending_updates=[];return 'Rollback complete; audit/network evidence tetap ada';}
    if((m=u.match(/^DROP TABLE ([\w.]+)$/))){const name=qualify(m[1]);if(!access(name,'DROP')){this.event('DROP TABLE',name,q,1031);return 'ORA-01031: insufficient privileges';}this.require(d.tables[name],'ORA-00942: table tidak ditemukan');delete d.tables[name];this.event('DROP TABLE',name,q);return 'Table dropped';}
    if((m=q.match(/^UPDATE ([\w.]+)\s+SET account_status='(\w+)'\s+WHERE customer_id=(\d+)$/i))){const name=qualify(m[1]),tab=d.tables[name];if(!tab||!access(name,'UPDATE')){this.event('UPDATE',name,q,1031);return 'ORA-01031: insufficient privileges';}d.transaction.pending_updates.push({name,before:this.clone(tab.data)});const rows=tab.data.filter(r=>r.CUSTOMER_ID===+m[3]);rows.forEach(r=>r.ACCOUNT_STATUS=m[2]);this.event('UPDATE',name,q,0,rows.length);return rows.length+' row updated';}
    if(u.startsWith('SELECT '))return this.query(q,admin,qualify,access);
    throw new Error('SQL belum didukung oleh simulator: '+q);
  },
  query(q,admin,qualify,access) {
    const s=this.state,d=s.db,u=q.replace(/\s+/g,' ').toUpperCase(),from=u.match(/\bFROM ([\w.$]+)/)?.[1];this.require(from,'SELECT memerlukan FROM');let rows;
    const privileged=/^(DBA_|ROLE_SYS_PRIVS|UNIFIED_AUDIT_TRAIL|AUDIT_UNIFIED_|V\$)/.test(from);this.require(!privileged||admin,'ORA-01031: baca evidence/dictionary sebagai SYS');
    switch(from) {
      case 'V$INSTANCE':rows=[{INSTANCE_NAME:'ORCLCDB',STATUS:'OPEN',DATABASE_STATUS:'ACTIVE'}];break;
      case 'V$VERSION':rows=[{BANNER_FULL:s.environment.oracle}];break;
      case 'V$OPTION':rows=[{PARAMETER:'Unified Auditing',VALUE:'TRUE'}];break;
      case 'DUAL':this.event('SELECT','SYS.DUAL',q,0,1);rows=[{SYSDATE:new Date().toISOString()}];break;
      case 'DBA_USERS':rows=Object.entries(d.users).map(([n,x])=>({USERNAME:n,ACCOUNT_STATUS:x.status,PROFILE:x.profile}));break;
      case 'AUDIT_UNIFIED_POLICIES':rows=Object.values(d.audit_policies).flatMap(p=>(p.actions||[]).map(a=>({POLICY_NAME:p.name,AUDIT_OPTION:a,OBJECT_SCHEMA:p.object?.split('.')[0]||'',OBJECT_NAME:p.object?.split('.')[1]||''})));break;
      case 'AUDIT_UNIFIED_ENABLED_POLICIES':rows=Object.values(d.audit_policies).filter(p=>p.enabled).flatMap(p=>(p.users||[]).map(name=>({POLICY_NAME:p.name,ENTITY_NAME:name,ENTITY_TYPE:'USER',SUCCESS:'YES',FAILURE:'YES'})));break;
      case 'UNIFIED_AUDIT_TRAIL':rows=d.native_events.map(e=>({...Object.fromEntries(Object.entries(e).map(([k,v])=>[k.toUpperCase(),v])),EVENT_TIMESTAMP:e.event_time,EVENT_TIME:e.event_time}));break;
      case 'DBA_ROLE_PRIVS':rows=Object.entries(d.users).flatMap(([n,x])=>x.roles.map(r=>({GRANTEE:n,GRANTED_ROLE:r,ADMIN_OPTION:'NO'})));break;
      case 'DBA_SYS_PRIVS':rows=Object.entries(d.users).flatMap(([n,x])=>x.system_privileges.map(p=>({GRANTEE:n,PRIVILEGE:p})));break;
      case 'ROLE_SYS_PRIVS':rows=Object.entries(d.roles).flatMap(([n,x])=>x.system_privileges.map(p=>({ROLE:n,PRIVILEGE:p})));break;
      case 'DBA_TAB_PRIVS':rows=Object.entries(d.users).flatMap(([n,x])=>x.object_privileges.map(p=>{const [obj,priv]=p.split(' '),[owner,name]=obj.split('.');return {GRANTEE:n,OWNER:owner,TABLE_NAME:name,PRIVILEGE:priv};}));break;
      case 'USER_OBJECTS':rows=Object.entries(d.procedures).filter(([n])=>n.startsWith(d.session_user+'.')).map(([n,x])=>({OBJECT_NAME:n.split('.')[1],OBJECT_TYPE:'PROCEDURE',STATUS:x.status}));break;
      default: {
        const name=qualify(from),tab=d.tables[name];if(!tab||!access(name,'SELECT')){this.event('SELECT',name,q,942);return 'ORA-00942: table or view does not exist (atau akses belum diberikan)';}
        rows=this.filterRows(this.clone(tab.data),q);
        const count=/SELECT COUNT\(\*\)/.test(u);const fetch=+(u.match(/FETCH FIRST (\d+) ROWS ONLY/)?.[1]||rows.length);
        this.event('SELECT',name,q,0,count?1:Math.min(rows.length,fetch));
        if(count)return 'COUNT(*)\n'+rows.length+'\n1 row selected';rows=rows.slice(0,fetch);break;
      }
    }
    rows=this.filterRows(rows,q);
    if(/ORDER BY EVENT_TIMESTAMP/.test(u))rows.sort((a,b)=>String(a.EVENT_TIMESTAMP).localeCompare(String(b.EVENT_TIMESTAMP))*(u.includes(' DESC')?-1:1));
    const limit=u.match(/FETCH FIRST (\d+) ROWS ONLY/);if(limit)rows=rows.slice(0,+limit[1]);
    if(!rows.length)return 'no rows selected';
    // Return explicit named columns; keep SQL text and native evidence visible.
    const projection=u.slice(7,u.indexOf(' FROM '));let keys=Object.keys(rows[0]).filter(k=>projection==='*'||new RegExp('\\b'+k+'\\b').test(projection));if(!keys.length)keys=Object.keys(rows[0]);
    return keys.join(' | ')+'\n'+rows.map(r=>keys.map(k=>r[k]??'').join(' | ')).join('\n')+'\n'+rows.length+' row(s) selected';
  },
  filterRows(rows,q) {
    const where=q.match(/\bWHERE\s+([\s\S]*?)(?:\bORDER BY|\bFETCH FIRST|$)/i)?.[1];if(!where)return rows;
    for(const match of where.matchAll(/(\w+)\s*=\s*(?:'([^']*)'|(\d+))/g)){const key=match[1].toUpperCase(),value=match[2]??match[3];rows=rows.filter(r=>String(r[key]).toUpperCase()===value.toUpperCase());}
    for(const match of where.matchAll(/(\w+)\s+IN\s*\(([^)]+)\)/gi)){const values=[...match[2].matchAll(/'([^']+)'/g)].map(x=>x[1].toUpperCase());rows=rows.filter(r=>values.includes(String(r[match[1].toUpperCase()]).toUpperCase()));}
    return rows;
  },
  avcli(command) {
    const u=command.replace(/\s+/g,' ').trim().replace(/;$/,'').toUpperCase(),s=this.state,m=s.monitoring_points[0];let action;
    if(/^REGISTER SECURED TARGET PDB1_26AI /.test(u))action='register_target';
    else if(u==='LIST SECURED TARGET')return JSON.stringify(s.targets,null,2);
    else if(/^START COLLECTION FOR SECURED TARGET PDB1_26AI /.test(u))action='start_collection';
    else if(u==='LIST TRAIL FOR SECURED TARGET PDB1_26AI')return JSON.stringify(s.trails,null,2);
    else if(u==='RETRIEVE AUDIT POLICIES FROM TARGET PDB1_26AI')action='retrieve_audit_policies';
    else if(u==='SHOW RETENTION POLICY FOR TARGET PDB1_26AI')return s.targets[0]?.retention_policy||'Target belum ada';
    else if(u==='LIST FIREWALL'||u==='SHOW STATUS FOR FIREWALL DBFW1')return JSON.stringify(s.firewalls,null,2);
    else if(u==='CREATE DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI USING FIREWALL DBFW1')action='create_monitor';
    else if(u==='LIST DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI')return JSON.stringify(s.monitoring_points,null,2);
    else if(/^(START|STOP) DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI$/.test(u)){this.require(m,'Buat monitor dahulu');m.status=u.startsWith('START')?'Running':'Stopped';return 'Monitor '+m.status;}
    else if(u==='ALTER DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI USING FIREWALL DBFW1 SET DATABASE_RESPONSE=TRUE FULL_ERROR_MESSAGE=TRUE')action='enable_response_monitoring';
    else if(u==='ALTER DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI USING FIREWALL DBFW1 SET ADD_ADDRESS=192.168.56.26:1521:PDB1'){this.require(m,'Buat monitor dahulu');m.address='192.168.56.26:1521:PDB1';s.trainer.injected_failures=s.trainer.injected_failures.filter(x=>x.kind!=='monitor_address');return 'Monitor address corrected';}
    else if(u==='CREATE TARGET GROUP D5_TRAINING_GROUP')action='create_target_group';
    else if(u==='ALTER TARGET GROUP D5_TRAINING_GROUP ADD TARGET PDB1_26AI')action='add_target_to_group';
    else if(u==='RETRIEVE USER ENTITLEMENT FROM TARGET PDB1_26AI')action='retrieve_entitlements';
    else if(u==='LIST ALERT POLICIES')return JSON.stringify(s.alert_policies,null,2);
    else throw new Error('AVCLI belum didukung: '+command);
    return this.perform(action)||action.replaceAll('_',' ')+' selesai';
  }
};
if(typeof module!=='undefined')module.exports=StaticEngine;
