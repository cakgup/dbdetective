// Rebuild the guided catalog from the checked-in, unmodified source worksheets.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),dir=path.join(root,'training','avdf_handson');
const actions={
  2:{1:['download_setup_script'],8:['add_table_trail'],14:['inject_failure:trail','clear_failures','start_collection']},
  3:{8:['enable_d2_policies'],9:['create_retention','apply_retention'],10:['create_failed_login_alert']},
  4:{1:['register_host'],2:['download_agent'],3:['install_agent','get_activation_key','activate_agent'],5:['download_hostmon'],6:['install_hostmon'],7:['register_firewall'],11:['add_network_trail']},
  5:{9:['inject_failure:monitor_address'],10:['inject_failure:firewall_network']},
  6:{1:['deploy_log_all'],4:['create_d4_policy_shell'],5:['create_d4_user_set'],6:['create_d4_object_set'],7:['create_d4_client_set'],8:['create_d4_profile'],9:['create_d4_cluster_set'],10:['add_d4_sql_rule'],11:['add_d4_object_rule'],12:['configure_d4_default'],13:['configure_d4_unknown'],14:['configure_d4_login'],15:['add_d4_session_rule'],16:['set_d4_evaluation_order'],17:['publish_d4_policy'],18:['deploy_d4_policy']},
  7:{6:['create_large_result_alert']},
  8:{7:['save_report'],8:['schedule_report'],11:['add_compliance_target']},
  9:{7:['label_latest_entitlement:D5_BASELINE'],15:['label_latest_entitlement:D5_AFTER_ESCALATION']},
  10:{5:['schedule_spa'],6:['retrieve_spa'],8:['retrieve_spa']},
  11:{4:['open_latest_alert','ack_latest_alert','close_latest_alert']},
  12:{1:['generate_incident']}
};
const goals=[
 ['Buktikan aktivitas database menghasilkan Unified Audit.','AVDF_DEMO dapat membaca 107 pegawai; audit SELECT dan login gagal 1017 terlihat.','Audit merekam aktivitas; SELECT tetap diizinkan oleh privilege.'],
 ['Hubungkan bukti lokal ke repository Audit Vault.','TABLE trail COLLECTING dan event AVDF_DEMO muncul di All Activity.','Jika bukti lokal kosong, periksa audit policy. Jika hanya pusat kosong, periksa collection.'],
 ['Kelola policy terpusat, retention, dan deteksi login gagal.','Dua policy aktif, retention 3/0 bulan, alert LAB_FAILED_LOGIN muncul setelah tiga kegagalan.','1017 adalah kegagalan yang disengaja. Hubungkan kembali sebagai SYS sebelum membaca dictionary.'],
 ['Bangun jalur agent → Host Monitor → DBFW.','Agent dan Host Monitor RUNNING, monitor Running, NETWORK trail tersedia.','Monitor baru berstatus Stopped; perlu START secara eksplisit.'],
 ['Bedakan bukti database dengan bukti jaringan saat jalur rusak.','Response monitoring aktif, error SQL terekam, jalur kembali sehat setelah perbaikan.','Saat monitor berhenti, SQL tetap berjalan tetapi event firewall tidak bertambah.'],
 ['Pelajari SQL normal lalu buat, publish, dan deploy policy.','Tiga cluster baseline tersedia dan LAB_D4_DETECTIVE terpasang pada monitor.','Jika cluster kosong, periksa monitor, NETWORK trail, agent, dan Host Monitor.'],
 ['Bandingkan SQL normal, pembacaan sensitif, dan row-count alert.','Query ID 1/5 cocok baseline; full read mengembalikan 5 baris dan memicu alert >3.','COUNT(*) mengembalikan satu baris hasil, walaupun nilainya 5. Frekuensi bukan row count.'],
 ['Susun laporan investigasi dan kelompokkan target.','Saved Report, metadata jadwal, Target Group, dan keanggotaan PCI-DSS tersedia.','Jadwal PDF di edisi browser hanya metadata; tidak ada PDF otomatis.'],
 ['Buktikan perubahan hak akses menggunakan dua snapshot.','Snapshot baseline dan after menunjukkan role baru serta SELECT HR.EMPLOYEES.','Ambil baseline sebelum GRANT; snapshot adalah salinan, bukan tampilan hak akses terkini.'],
 ['Lacak perubahan source stored procedure.','SPA menampilkan Created lalu Modified untuk SHOW_CUSTOMER_COUNT.','CREATE PROCEDURE diperlukan oleh pemilik aplikasi; retrieval harus diaktifkan.'],
 ['Latih triage alert dan periksa kesehatan operasional.','Satu alert melewati Open → Acknowledged → Closed; jalur audit/firewall sehat.','Closed berarti investigasi selesai; bukti tetap tersedia.'],
 ['Rekonstruksi insiden, jelaskan penyebab akses, lalu cabut privilege.','Timeline menghubungkan login, GRANT, SELECT, UPDATE, alert dan drift; akses HR dan role dicabut.','Lima baris adalah sinyal hasil besar untuk lab, bukan bukti tunggal pencurian data.']
];
const sys=()=>[{channel:'os',command:'sqlplus / as sysdba'},{channel:'sql',command:'ALTER SESSION SET CONTAINER=PDB1;'}];
const reconnect={1:[13,15,17],2:[12],3:[3],9:[14],12:[2,13]};
const routes={1:['console',''],2:['targets','trails'],3:['policies','audit'],4:['firewalls',''],5:['reports','activity'],6:['policies','firewall'],7:['alerts',''],8:['reports','saved'],9:['reports','entitlement'],10:['reports','stored'],11:['alerts',''],12:['reports','activity']};
const catalog=fs.readdirSync(dir).filter(f=>f.endsWith('.md')).sort().map((file,index)=>{
 const n=index+1,source=fs.readFileSync(path.join(dir,file),'utf8').replace(/\r/g,''),parts=[...source.matchAll(/^## Step (\d+) — (.+)\n([\s\S]*?)(?=^## Step |^# Phase |^## Scenario |$(?![\s\S]))/gm)];
 const steps=parts.map(match=>{
  const number=+match[1],body=match[3],tasks=[];
  if(reconnect[n]?.includes(number))tasks.push(...sys());
  for(const spec of actions[n]?.[number]||[]){const [action,value]=spec.split(':');tasks.push({action,payload:value?{[action==='inject_failure'?'kind':'label']:value}:{}});}
  for(const block of body.matchAll(/```(sql|bash|text)\n([\s\S]*?)```/g)){
    const prefix=body.slice(0,block.index),label=[...prefix.matchAll(/\*\*\[([^\]]+)\]\*\*/g)].at(-1)?.[1];
    const channel=block[1]==='sql'?'sql':block[1]==='bash'?'os':label==='AVCLI'&&block[2].trim().endsWith(';')?'avcli':null;
    if(channel)tasks.push({channel,command:block[2].trim()});
  }
  if(n===3&&number===1)tasks.push({channel:'sql',command:'GRANT CREATE PROCEDURE TO avdf_d2_app;\nALTER USER avdf_d2_app QUOTA UNLIMITED ON USERS;'});
  if(n===5&&number===8)tasks.push({channel:'sql',command:'SELECT COUNT(*) FROM hr.employees;'});
  if(n===5&&number===10)tasks.push({action:'clear_failures',payload:{}});
  if(n===3&&number===13)for(const action of ['open_latest_alert','ack_latest_alert','close_latest_alert'])tasks.push({action,payload:{}});
  if(n===10&&number===1)tasks.push({channel:'sql',command:'GRANT CREATE PROCEDURE TO avdf_d2_app;'});
  if(n===10&&number===7)tasks.unshift({channel:'os',command:"sqlplus -L 'avdf_d2_app/Oracle#D2App26@//192.168.56.26:1521/PDB1'"});
  for(const task of tasks){
    if(task.command?.includes('WrongPassword'))task.expectedError='ORA-01017';
    if(task.command?.includes('table_does_not_exist'))task.expectedError='ORA-00942';
    if(n===5&&task.command?.startsWith('DROP TABLE'))task.expectedError='ORA-01031';
    if(n===9&&number===8&&task.command?.startsWith('CREATE AUDIT POLICY'))task.command=task.command.replace('ACTIONS GRANT ON','ACTIONS GRANT, REVOKE ON');
  }
  return {number,title:match[2],body,tasks,route:routes[n][0],tab:routes[n][1],note:reconnect[n]?.includes(number)?'Kembali ke SYS sebelum membaca evidence atau mengubah konfigurasi.':n===3&&number===1?'Tambahan untuk menjalankan dataset: quota USERS dan CREATE PROCEDURE.':n===9&&number===8?'Policy mencatat GRANT dan REVOKE agar remediasi juga terbukti.':''};
 });
 return {id:'scenario'+String(n).padStart(2,'0'),number:n,title:source.split('\n')[1].replace(/^# /,''),source:'training/avdf_handson/'+file,goal:goals[index][0],expected:goals[index][1],tip:goals[index][2],steps};
});
fs.writeFileSync(path.join(root,'scenarios.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(catalog.map(x=>`${x.id}: ${x.steps.length} langkah, ${x.steps.reduce((n,s)=>n+s.tasks.length,0)} aktivitas`).join('\n'));
