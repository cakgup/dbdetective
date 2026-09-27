const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const engine=require('../static-engine.js');
const {scenarioChecks,runScenarioTask,scenarioTaskPassed}=require('../scenario-checks.js');
engine.base=JSON.parse(fs.readFileSync(require.resolve('../state.json'),'utf8'));
engine.scenarios=JSON.parse(fs.readFileSync(require.resolve('../scenarios.json'),'utf8'));
const memory=new Map();global.localStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};
for(const scenario of engine.scenarios)test(scenario.id+' — '+scenario.title,()=>{
 engine.reset(scenario.id);assert.equal(engine.state.trainer.checkpoint,scenario.id);
 for(const step of scenario.steps)for(const [i,task] of step.tasks.entries()) {
   const output=runScenarioTask(engine,task);
   assert.ok(scenarioTaskPassed(task,output),`Step ${step.number}, task ${i+1}: ${task.command||task.action}\n${output}`);
 }
 for(const c of scenarioChecks(scenario.number,engine.state))assert.ok(c.ok,c.label);
});
test('command dan action tidak dikenal ditolak tanpa perubahan state',()=>{
 engine.reset('scenario01');const users=JSON.stringify(engine.state.db.users);
 assert.match(engine.command('sql','FROBNICATE DATABASE;'),/^Gagal:/);
 assert.match(engine.act('nonexistent'),/^Gagal:/);assert.equal(JSON.stringify(engine.state.db.users),users);
 assert.match(engine.act('register_target'),/^Gagal:/);assert.equal(engine.state.targets.length,0);
});
test('checkpoint independen, pengulangan menghapus progres skenario aktif',()=>{
 engine.reset('scenario09');engine.state.learning.scenario09={complete:true};engine.state.learning.scenario01={complete:true};engine.reset('scenario09');
 assert.equal(engine.state.learning.scenario09,undefined);assert.ok(engine.state.learning.scenario01.complete);
 assert.equal(engine.state.db.users.AVDF_D2_READER.object_privileges.includes('HR.EMPLOYEES SELECT'),false);
});
test('monitor berhenti: SQL dan audit lokal tetap berjalan, firewall tidak bertambah',()=>{
 engine.reset('scenario07');engine.connect('AVDF_D2_READER','Oracle#D2Read26');engine.avcli('STOP DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI;');
 const before=engine.state.firewall_events.length,native=engine.state.db.native_events.length;
 assert.match(engine.sql('SELECT * FROM avdf_d2_app.customer_secure'),/5 row/);assert.equal(engine.state.firewall_events.length,before);assert.equal(engine.state.db.native_events.length,native+1);
 engine.avcli('START DATABASE FIREWALL MONITOR FOR TARGET PDB1_26AI;');engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.firewall_events.length,before+1);
});
test('TABLE collection menahan lalu mengumpulkan backlog sekali saja',()=>{
 engine.reset('scenario07');engine.connect('AVDF_D2_READER','Oracle#D2Read26');engine.act('inject_failure',{kind:'trail'});const count=engine.state.avdf_repository.length;
 engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.avdf_repository.length,count);
 engine.act('clear_failures');assert.equal(engine.state.avdf_repository.length,count+1);engine.collect();assert.equal(engine.state.avdf_repository.length,count+1);
});
test('semua failure jalur jaringan benar-benar memutus capture dan dapat dipulihkan',()=>{
 for(const kind of ['agent','hostmon','monitor_address','firewall_network']){
  engine.reset('scenario07');engine.connect('AVDF_D2_READER','Oracle#D2Read26');engine.act('inject_failure',{kind});const n=engine.state.firewall_events.length;
  engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.firewall_events.length,n,kind);
  engine.act('clear_failures');engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.firewall_events.length,n+1,kind);
 }
});
test('COUNT hasil satu baris tidak memicu large-result; lima baris memicu',()=>{
 engine.reset('scenario07');engine.act('create_large_result_alert');engine.connect('AVDF_D2_READER','Oracle#D2Read26');
 assert.match(engine.sql('SELECT COUNT(*) FROM avdf_d2_app.customer_secure'),/COUNT\(\*\)\n5/);assert.equal(engine.state.firewall_events[0].row_count,1);assert.equal(engine.state.alerts.length,0);
 engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.firewall_events[0].row_count,5);assert.equal(engine.state.alerts.length,1);assert.equal(engine.state.alerts[0].event_id,engine.state.firewall_events[0].id);
});
test('policy edit tidak berlaku sebelum publish dan deploy ulang',()=>{
 engine.reset('scenario07');engine.act('set_d4_evaluation_order',{order:['Session Context','SQL Statement','Database Object','Default']});assert.match(engine.act('deploy_d4_policy'),/^Gagal:/);
 engine.connect('AVDF_D2_READER','Oracle#D2Read26');engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.firewall_events[0].rule,'MONITOR_SENSITIVE_CUSTOMER_DATA');
 engine.act('publish_d4_policy');engine.act('deploy_d4_policy');engine.sql('SELECT * FROM avdf_d2_app.customer_secure');assert.equal(engine.state.firewall_events[0].rule,'MONITOR_READER_SESSION');
});
test('capstone: timeline, snapshot immutable, dan 3 kegagalan tepat sebelum login sukses',()=>{
 engine.reset('scenario12');assert.equal(engine.state.alerts.length,0);engine.act('generate_incident');
 const s=engine.state,events=[...s.db.native_events].reverse();
 assert.equal(events.filter(e=>e.action_name==='LOGON'&&e.return_code===1017).length,3);
 assert.equal(events.find(e=>e.action_name==='GRANT').dbusername,'SYS');
 assert.ok(events.findIndex(e=>e.action_name==='GRANT')<events.findIndex(e=>e.action_name==='LOGON'));
 assert.ok(s.alerts.some(e=>e.policy==='LAB_FAILED_LOGIN'));assert.ok(s.alerts.some(e=>e.policy==='LAB_D4_LARGE_RESULT'&&e.row_count===5));
 const snapshot=JSON.stringify(s.entitlement_snapshots);engine.sql('REVOKE SELECT ON hr.employees FROM avdf_d2_reader');assert.equal(JSON.stringify(s.entitlement_snapshots),snapshot);
 engine.connect('AVDF_D2_READER','Oracle#D2Read26');assert.match(engine.sql('SELECT COUNT(*) FROM hr.employees'),/^ORA-00942/);
});
test('login gagal memutus sesi, dictionary memerlukan SYS',()=>{
 engine.reset('scenario07');engine.connect('AVDF_D2_READER','WrongPassword');assert.match(engine.command('sql','SELECT * FROM avdf_d2_app.customer_secure'),/^Gagal:/);
 engine.connect('AVDF_D2_READER','Oracle#D2Read26');assert.match(engine.command('sql','SELECT * FROM dba_users'),/^Gagal: ORA-01031/);
});
