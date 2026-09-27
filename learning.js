/* Loaded after App; the original day catalog remains available as a reference. */
Object.assign(App, {
  selectedScenario:1, selectedStep:0,
  openSavedReport(i){const report=this.state.saved_reports[i];if(!report)return;this.reportFilter={target:'',user:'',objectOwner:'',object:'',source:'',policy:'',...report.filter};this.reportSort=report.sort;this.reportKind=report.kind;this.go('reports','activity');},
  learningPage() {
    const catalog=StaticEngine.scenarios,scenario=catalog[this.selectedScenario-1];if(!scenario)return this.pageHeader('Belajar AVDF','Memuat skenario…');
    const active=this.state.trainer.checkpoint===scenario.id,progress=this.state.learning[scenario.id]||{},step=scenario.steps[this.selectedStep]||scenario.steps[0];
    const done=Object.values(progress.steps||{}).filter(Boolean).length,checks=scenarioChecks(scenario.number,this.state);
    return this.pageHeader('Belajar AVDF — 12 skenario','Mulai dari 01. Setiap skenario menyiapkan prasyarat sendiri; tidak perlu menyelesaikan 394 potongan lab.',`<button class="btn" onclick="App.go('labs')">Referensi Day 1–5</button>`)+
      `<div class="callout"><b>Cara belajar:</b> pilih skenario → Mulai → baca langkah → jalankan aktivitas satu per satu → periksa output dan laporan → verifikasi akhir. Semua perintah berjalan di simulator browser.</div>
      <div class="learning-layout"><nav class="learning-scenarios" aria-label="Skenario">${catalog.map(x=>`<button class="scenario-checkpoint ${x.number===scenario.number?'active':''}" onclick="App.selectScenario(${x.number})"><span class="scenario-no">${String(x.number).padStart(2,'0')}</span><span><b>${esc(x.title)}</b><small>${this.state.learning[x.id]?.complete?'✓ Selesai':'Belum selesai'}</small></span></button>`).join('')}</nav>
      <div><div class="card"><div class="card-body"><h2>${esc(scenario.title)}</h2><p>${esc(scenario.goal)}</p><p><b>Target akhir:</b> ${esc(scenario.expected)}</p><p><b>Perhatikan:</b> ${esc(scenario.tip)}</p><a href="${esc(scenario.source)}" target="_blank" rel="noopener">Baca lembar sumber avdf_handson</a><div class="actions learning-actions"><button class="btn primary" onclick="App.startScenario(${scenario.number})">${active?'Ulangi dari awal':'Mulai skenario '+scenario.number}</button><span>Mulai/ulangi mengganti konfigurasi dan evidence latihan; riwayat penyelesaian skenario lain tetap tersimpan.</span></div></div></div>
      ${active?`<div class="callout"><b>${esc(this.state.trainer.checkpoint_label)}</b> · ${done}/${scenario.steps.length} langkah ditinjau · SQL: ${esc(this.state.db.session_user)} @ ${esc(this.state.db.container)} (${this.state.db.connected?'terhubung':'terputus'})</div>
      <div class="learning-stepbar"><label for="learningStep">Langkah</label><select id="learningStep" onchange="App.selectedStep=+this.value;App.render()">${scenario.steps.map((x,i)=>`<option value="${i}" ${x.number===step.number?'selected':''}>${progress.steps?.[x.number]?'✓ ':''}${x.number}. ${esc(x.title)}</option>`).join('')}</select></div>
      <article class="card"><div class="card-body"><h2>${step.number}. ${esc(step.title)}</h2>${step.note?`<div class="callout warn">${esc(step.note)}</div>`:''}
      ${this.stepHint(scenario.number,step.number)}
      ${step.tasks.length?step.tasks.map((task,i)=>this.learningTask(scenario,step,task,i,progress)).join(''):`<p>Langkah observasi: buka halaman bukti, cocokkan isinya dengan panduan sumber di bawah, lalu catat temuan Anda.</p>`}
      <button class="btn" onclick="App.openStepEvidence()">Buka halaman bukti</button>
      <details class="source-notes"><summary>Instruksi lengkap dari lembar sumber</summary>${miniMarkdown(step.body)}</details>
      <label for="learningNotes">Catatan bukti (contoh: event ID, SQL, return code, policy, kesimpulan)</label><textarea id="learningNotes" class="learning-notes" oninput="App.saveLearningNote(this.value)">${esc(progress.notes?.[step.number]||'')}</textarea>
      <div class="actions learning-actions"><button class="btn" ${this.selectedStep===0?'disabled':''} onclick="App.selectedStep--;App.render()">Sebelumnya</button><button class="btn primary" onclick="App.finishLearningStep()">Sudah diperiksa → Berikutnya</button></div></div></article>
      <div class="card"><div class="card-body"><h2>Verifikasi hasil skenario</h2><p>Pemeriksaan membaca state aktual. Jalankan semua aktivitas dan tinjau langkah observasi sebelum menyelesaikan skenario.</p><ul>${checks.map(c=>`<li>${c.ok?'✓':'○'} ${esc(c.label)}</li>`).join('')}</ul><button class="btn primary" onclick="App.finishScenario()">Verifikasi &amp; selesaikan skenario</button></div></div>`:`<div class="empty">Klik Mulai skenario untuk memuat prasyarat dan membuka panduan langkah demi langkah.</div>`}</div></div>`;
  },
  selectScenario(n){this.selectedScenario=n;this.selectedStep=0;this.render();},
  async startScenario(n){this.selectedScenario=n;this.selectedStep=0;await this.reset('scenario'+String(n).padStart(2,'0'));this.state.learning[this.state.trainer.checkpoint]={steps:{},tasks:{},notes:{}};StaticEngine.save();this.go('learn');},
  learningProgress(){const id=StaticEngine.scenarios[this.selectedScenario-1].id;return this.state.learning[id]||=( {steps:{},tasks:{},notes:{}} );},
  learningTask(scenario,step,task,i,progress){
    const result=progress.tasks?.[step.number+'-'+i],channel={os:'OS Terminal',sql:'SQL*Plus',avcli:'AVCLI'}[task.channel]||'Web Console';
    const label=task.command||task.action.replaceAll('_',' ')+(Object.keys(task.payload||{}).length?' '+JSON.stringify(task.payload):'');
    return `<section class="learning-task"><div><b>${i+1}. ${channel}</b> · ${task.channel==='sql'?'akun SQL mengikuti koneksi terakhir':task.channel==='os'?'host simulasi db26ai':task.channel==='avcli'?'kontrol AVDF':'aksi console dengan konfigurasi lab tetap'}</div><pre><code>${esc(label)}</code></pre>${task.expectedError?`<p>Hasil yang diharapkan: <b>${task.expectedError}</b>. Kegagalan ini disengaja untuk menghasilkan evidence.</p>`:''}<button class="btn" onclick="App.runLearningTask(${i})">Jalankan aktivitas ${i+1}</button>${task.channel?` <button class="btn" onclick="App.editLearningCommand(${i})">Buka di CLI</button>`:''}${result?`<div class="callout ${result.ok?'':'warn'}">${result.ok?'✓ Eksekusi sesuai harapan':'Perlu diperbaiki — jangan lanjut dahulu'}</div><pre class="learning-output">${esc(result.output)}</pre>`:''}</section>`;
  },
  runLearningTask(i){const sc=StaticEngine.scenarios[this.selectedScenario-1],step=sc.steps[this.selectedStep],p=this.learningProgress();
    // Preserve activity order: later actions often depend on connection or earlier mutations.
    if(i>0&&!p.tasks?.[step.number+'-'+(i-1)]?.ok){this.toast('Jalankan aktivitas sebelumnya dahulu.');return;}
    const output=runScenarioTask(StaticEngine,step.tasks[i]);this.state=StaticEngine.state;const progress=this.learningProgress();progress.tasks||={};progress.tasks[step.number+'-'+i]={output,ok:scenarioTaskPassed(step.tasks[i],output)};progress.steps||={};progress.steps[step.number]=false;progress.cursor=this.selectedStep;progress.complete=false;StaticEngine.save();this.render();
  },
  editLearningCommand(i){const step=StaticEngine.scenarios[this.selectedScenario-1].steps[this.selectedStep],task=step.tasks[i];this.console=task.channel;sessionStorage.setItem('avdf_prefill',task.command);this.go('console');},
  saveLearningNote(text){const p=this.learningProgress();p.notes||={};p.notes[StaticEngine.scenarios[this.selectedScenario-1].steps[this.selectedStep].number]=text;StaticEngine.save();},
  finishLearningStep(){const sc=StaticEngine.scenarios[this.selectedScenario-1],step=sc.steps[this.selectedStep],p=this.learningProgress();if(step.tasks.some((_,i)=>!p.tasks?.[step.number+'-'+i]?.ok)){this.toast('Jalankan aktivitas pada panduan sampai hasilnya sesuai.');return;}if(!step.tasks.length&&!p.notes?.[step.number]?.trim()){this.toast('Catat temuan observasi sebelum lanjut.');return;}p.steps||={};p.steps[step.number]=true;StaticEngine.save();if(this.selectedStep<sc.steps.length-1)this.selectedStep++;this.render();},
  finishScenario(){const sc=StaticEngine.scenarios[this.selectedScenario-1],p=this.learningProgress();if(!sc.steps.every(x=>p.steps?.[x.number])||!scenarioChecks(sc.number,this.state).every(x=>x.ok)){this.toast('Masih ada langkah atau bukti yang belum terpenuhi.');return;}p.complete=true;StaticEngine.save();this.toast('Skenario terverifikasi. Pilih skenario berikutnya.');this.render();},
  openStepEvidence(){const sc=StaticEngine.scenarios[this.selectedScenario-1],step=sc.steps[this.selectedStep];this.go(step.route,step.tab);},
  stepHint(n,step){
    const special={
      '1-12':'Koneksi OS Terminal mengubah sesi SQL yang digunakan aktivitas berikutnya. COUNT(*) bernilai 107 dan FETCH FIRST menampilkan 5 pegawai.',
      '1-13':'Cari DBUSERNAME=AVDF_DEMO, ACTION_NAME=SELECT, RETURN_CODE=0. Bukti ini masih lokal di database.',
      '2-13':'Pilih role auditor → Reports → All Activity. Filter User=AVDF_DEMO dan Object=EMPLOYEES. SQL yang baru dijalankan harus terlihat di repository.',
      '2-14':'Jalankan Break, buka Targets → Audit Trails untuk melihat ERROR, lalu kembali ke Belajar dan jalankan Clear serta Start Collection.',
      '3-12':'Buka Alerts → Investigate. Tiga login gagal untuk AVDF_D2_READER memicu LAB_FAILED_LOGIN. Return code 1017 adalah hasil yang benar pada latihan ini.',
      '5-7':'Catat jumlah event firewall sebelum dan sesudah SELECT. Saat Stopped, jumlahnya tetap; query database tetap berhasil.',
      '5-9':'Setelah injeksi, LIST harus menunjukkan alamat 192.168.56.99. Perintah ALTER berikutnya mengembalikannya ke .26.',
      '5-10':'ping dan nc harus melaporkan unreachable sebelum Clear Failures. Sesudah Clear, ulangi dari CLI untuk membuktikan koneksi pulih.',
      '6-3':'Buka Policies → Database Firewall Policies → SQL Cluster Sets. ID 1 dan 5 masuk CUSTOMER_BY_ID; COUNT dan ACTIVE memiliki cluster sendiri.',
      '7-5':'Dengan Session Context rule dari skenario 06, SELECT SYSDATE cocok MONITOR_READER_SESSION. DEFAULT_RULE hanya berlaku bila tidak ada rule sebelumnya yang cocok.',
      '7-8':'Cari LAB_D4_LARGE_RESULT dengan row count 5. Klik Investigate untuk SQL, user, object dan event ID pemicunya.',
      '8-2':'Reports → All Activity: isi User=AVDF_D2_READER, Sort=Event Time ASC. Bandingkan urutan autentikasi dan akses data.',
      '8-4':'Reports → All Activity: filter user lalu baca event LOGON/LOGOFF. Bandingkan status FAILURE dan SUCCESS.',
      '8-8':'Schedule hanya menyimpan metadata latihan. Edisi browser tidak mengeksekusi jadwal atau menghasilkan berkas PDF.',
      '9-16':'Reports → Entitlement Reports: bandingkan D5_BASELINE dengan D5_AFTER_ESCALATION. Cari AVDF_D5_POWER_ROLE dan HR.EMPLOYEES SELECT.',
      '10-9':'Reports → Stored Procedure Changes harus memperlihatkan Created versi 1 dan Modified versi 2.',
      '12-12':'Susun timeline dari sumber pada bagian lengkap di bawah. Bedakan bukti akses, volume hasil, perubahan privilege, dan dugaan eksfiltrasi.'
    };return `<p class="learning-hint">${esc(special[n+'-'+step]||'Jalankan aktivitas sesuai urutan. Periksa nama objek, status, dan evidence pada output; gunakan instruksi sumber untuk langkah observasi.')}</p>`;
  }
});
window.App=App;
App.init().catch(error=>{document.getElementById('page').textContent='Pemuatan gagal: '+error.message+'. Jalankan melalui HTTP (lihat README).';});
