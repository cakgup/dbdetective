const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function harness(){
 const elements=new Map(),storage=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',value:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){}});return elements.get(id);};
 const context=vm.createContext({console,URLSearchParams,document:{getElementById:get},window:{},location:{hash:''},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},setTimeout:()=>1,clearTimeout(){}});
 for(const name of ['static-engine.js','scenario-checks.js','app.js','learning.js']){let code=fs.readFileSync(path.join(root,name),'utf8');if(name==='learning.js')code=code.replace(/App\.init\(\)\.catch[\s\S]*$/,'');vm.runInContext(code,context,{filename:name});}
 const engine=vm.runInContext('StaticEngine',context),app=vm.runInContext('App',context);engine.base=JSON.parse(fs.readFileSync(path.join(root,'state.json')));engine.scenarios=JSON.parse(fs.readFileSync(path.join(root,'scenarios.json')));engine.labs=JSON.parse(fs.readFileSync(path.join(root,'labs.json')));return {engine,app,get,storage};
}
test('semua halaman dan tab render pada 12 checkpoint tanpa error',()=>{
 const {engine,app,get}=harness();
 const views={home:[''],dashboard:[''],insights:[''],targets:['targets','trails','firewall','groups','rights','entitlements'],agents:[''],firewalls:[''],retention:[''],policies:['audit','firewall','alert'],alerts:[''],reports:['activity','summary','compliance','pdf','entitlement','stored','saved','scheduled','generated'],settings:[''],console:[''],trainer:[''],learn:['']};
 for(let n=1;n<=12;n++){
  engine.reset('scenario'+String(n).padStart(2,'0'));app.state=engine.state;app.selectedScenario=n;app.selectedStep=0;
  for(const [route,tabs] of Object.entries(views))for(const tab of tabs){app.route=route;app.tab=tab;assert.doesNotThrow(()=>app.render(),`${n}/${route}/${tab}`);assert.ok(get('page').innerHTML.length>20);}
 }
});
test('panduan menolak penyelesaian prematur dan memulihkan progres setelah reload',async()=>{
 const {engine,app,get}=harness();engine.reset('scenario01');app.state=engine.state;app.selectedScenario=1;app.route='learn';
 app.finishScenario();assert.notEqual(engine.state.learning.scenario01.complete,true);
 app.finishLearningStep();assert.equal(app.selectedStep,0);
 app.runLearningTask(0);assert.ok(engine.state.learning.scenario01.tasks['1-0'].ok);assert.match(get('page').innerHTML,/opt\/oracle/);
 app.finishLearningStep();assert.equal(app.selectedStep,1);assert.equal(engine.state.learning.scenario01.steps[1],true);
 app.saveLearningNote('Host db26ai');engine.state=JSON.parse(globalThis.JSON.stringify(engine.state));app.state=engine.state;
 assert.equal(app.state.learning.scenario01.notes[2],'Host db26ai');
 await app.startScenario(2);assert.equal(app.state.trainer.checkpoint,'scenario02');assert.equal(app.selectedStep,0);assert.equal(app.route,'learn');
 assert.equal(app.state.learning.scenario01.steps[1],true);
});
test('semua aktivitas panduan terhubung ke engine dan checklist dapat diselesaikan',async()=>{
 const {engine,app}=harness();engine.reset('scenario01');app.state=engine.state;
 for(const sc of engine.scenarios){
  await app.startScenario(sc.number);
  for(let i=0;i<sc.steps.length;i++){
   assert.equal(app.selectedStep,i);
   for(let j=0;j<sc.steps[i].tasks.length;j++)app.runLearningTask(j);
   app.saveLearningNote('Bukti diperiksa oleh uji integrasi.');app.finishLearningStep();
  }
  app.finishScenario();assert.equal(app.state.learning[sc.id].complete,true,sc.id);
 }
});
test('bantuan dapat melanjutkan setiap langkah di seluruh 12 skenario tanpa catatan',async()=>{
 const {engine,app,get,storage}=harness();engine.reset('scenario01');app.state=engine.state;
 for(const sc of engine.scenarios){
  await app.startScenario(sc.number);
  for(let i=0;i<sc.steps.length;i++){
   assert.equal(app.selectedStep,i);app.assistLearningStep();
   assert.equal(app.state.learning[sc.id].assisted[sc.steps[i].number],true,sc.id+'/'+i);
   assert.equal(app.selectedStep,Math.min(i+1,sc.steps.length-1));
  }
  app.finishScenario();assert.equal(app.state.learning[sc.id].complete,true,sc.id);
  assert.match(get('page').innerHTML,/Selesai dengan bantuan/);
  const saved=JSON.parse(storage.get(engine.key));assert.equal(saved.learning[sc.id].cursor,sc.steps.length-1);
 }
});
test('bantuan memulihkan eksekusi parsial, menyimpan catatan, dan membuka langkah manual berikutnya',async()=>{
 const {engine,app}=harness();engine.reset('scenario01');app.state=engine.state;await app.startScenario(3);
 app.runLearningTask(0); // user creation succeeded; replaying it naively would fail
 app.saveLearningNote('Catatan pribadi jangan dihapus');
 app.state.learning.scenario01={complete:true};app.assistLearningStep();
 assert.equal(app.selectedStep,1);assert.equal(app.state.learning.scenario03.notes[1],'Catatan pribadi jangan dihapus');
 assert.ok(app.state.learning.scenario01.complete);
 for(let i=0;i<engine.scenarios[2].steps[1].tasks.length;i++)app.runLearningTask(i);
 app.finishLearningStep();assert.equal(app.selectedStep,2);
 assert.equal(app.state.db.tables['AVDF_D2_APP.CUSTOMER_SECURE'].rows,5);
 assert.equal(app.state.learning.scenario03.assisted[2],undefined);
});
test('bantuan pada langkah lama membatalkan progres lanjut tanpa membuang catatan',async()=>{
 const {engine,app}=harness();engine.reset('scenario01');app.state=engine.state;await app.startScenario(1);
 app.assistLearningStep();app.assistLearningStep();app.saveLearningNote('Catatan langkah 3');app.assistLearningStep();
 app.selectedStep=0;app.assistLearningStep();
 assert.equal(app.state.learning.scenario01.steps[3],undefined);assert.equal(app.state.learning.scenario01.notes[3],'Catatan langkah 3');
 assert.equal(app.state.learning.scenario01.complete,false);
});
test('kegagalan bantuan tidak mengubah state atau progres pengguna',async()=>{
 const {engine,app}=harness();engine.reset('scenario01');app.state=engine.state;await app.startScenario(1);
 engine.scenarios[0].steps[0].tasks.push({channel:'sql',command:'UNSUPPORTED COMMAND'});
 const before=JSON.stringify(app.state);app.assistLearningStep();
 assert.equal(JSON.stringify(app.state),before);assert.equal(app.selectedStep,0);
});
