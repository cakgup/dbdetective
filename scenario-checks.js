// Shared by the guide and regression suite: observable state, not button clicks.
function scenarioChecks(n,s) {
  const has=(list,key,value)=>list.some(x=>x[key]===value), checks=[];
  const check=(label,ok)=>checks.push({label,ok:!!ok});
  const native=s.db.native_events,fw=s.firewall_events,reader=s.db.users.AVDF_D2_READER;
  if(n===1){check('AVDF_DEMO memiliki SELECT HR.EMPLOYEES',s.db.users.AVDF_DEMO?.object_privileges.includes('HR.EMPLOYEES SELECT'));check('Audit SELECT AVDF_DEMO tersimpan',native.some(e=>e.dbusername==='AVDF_DEMO'&&e.action_name==='SELECT'));check('Login gagal 1017 terekam',native.some(e=>e.dbusername==='AVDF_DEMO'&&e.return_code===1017));}
  if(n===2){check('TABLE trail COLLECTING',s.trails.some(t=>t.type==='TABLE'&&t.status==='COLLECTING'));check('Bukti AVDF_DEMO terkumpul di repository',s.avdf_repository.some(e=>e.dbusername==='AVDF_DEMO'&&e.action_name==='SELECT'));check('Failure sudah dibersihkan',!s.trainer.injected_failures.length);}
  if(n===3){check('Dataset CUSTOMER_SECURE berisi 5 baris',s.db.tables['AVDF_D2_APP.CUSTOMER_SECURE']?.rows===5);check('Policy sensitif dan schema aktif',s.db.audit_policies.AVDF_D2_SENSITIVE_ACCESS?.enabled&&s.db.audit_policies.AVDF_D2_SCHEMA_CHANGES?.enabled);check('Retention LAB_3M_ONLINE terpasang',s.targets[0]?.retention_policy==='LAB_3M_ONLINE');check('Alert login gagal terpicu',has(s.alerts,'policy','LAB_FAILED_LOGIN'));}
  if(n===4||n===5||n===11){check('Agent dan Host Monitor RUNNING',s.system.agent_running&&s.system.hostmon_running);check('Monitor Running dengan alamat benar',s.monitoring_points[0]?.status==='Running'&&s.monitoring_points[0]?.address==='192.168.56.26:1521:PDB1');check('NETWORK trail tersedia',has(s.trails,'type','NETWORK'));check('Tidak ada failure aktif',!s.trainer.injected_failures.length);}
  if(n===5){check('Database Response dan Full Error Message aktif',s.monitoring_points[0]?.database_response&&s.monitoring_points[0]?.full_error_message);check('Firewall merekam error table 942 dan privilege 1031',has(fw,'error_code',942)&&has(fw,'error_code',1031));}
  if(n===6){check('Tiga cluster baseline tersedia',['COUNT_CUSTOMER','CUSTOMER_BY_ID','ACTIVE_CUSTOMERS'].every(name=>has(s.firewall_cluster_catalog,'name',name)));check('Policy Published',s.firewall_policies.some(p=>p.name==='LAB_D4_DETECTIVE'&&p.status==='Published'));check('Policy sudah di-deploy',s.monitoring_points[0]?.deployed_policy?.name==='LAB_D4_DETECTIVE');}
  if(n===7){check('SQL normal cocok KNOWN_APPLICATION_SQL',has(fw,'rule','KNOWN_APPLICATION_SQL'));check('Full read sensitif mencatat 5 baris',fw.some(e=>e.rule==='MONITOR_SENSITIVE_CUSTOMER_DATA'&&e.row_count===5));check('Alert LAB_D4_LARGE_RESULT terpicu',has(s.alerts,'policy','LAB_D4_LARGE_RESULT'));check('Rollback memulihkan data, evidence UPDATE tetap ada',s.db.tables['AVDF_D2_APP.CUSTOMER_SECURE'].data[0].ACCOUNT_STATUS==='ACTIVE'&&has(fw,'command','UPDATE'));}
  if(n===8){check('Laporan tersimpan',has(s.saved_reports,'name','D5_READER_INVESTIGATION'));check('Metadata jadwal tersedia',has(s.report_schedules,'name','D5_DAILY_INVESTIGATION'));check('Target group beranggotakan PDB1_26AI',s.target_groups.some(g=>g.targets.includes('PDB1_26AI')));check('Target masuk compliance group',s.compliance_groups.some(g=>g.targets.includes('PDB1_26AI')));}
  if(n===9||n===12){const base=s.entitlement_snapshots.find(x=>x.label==='D5_BASELINE'),after=s.entitlement_snapshots.find(x=>x.label==='D5_AFTER_ESCALATION');check('Baseline tidak memiliki akses HR',base&&!base.users.AVDF_D2_READER.object_privileges.includes('HR.EMPLOYEES SELECT'));check('Snapshot after mencatat role dan HR SELECT',after?.users.AVDF_D2_READER.roles.includes('AVDF_D5_POWER_ROLE')&&after?.users.AVDF_D2_READER.object_privileges.includes('HR.EMPLOYEES SELECT'));}
  if(n===10){check('SPA mencatat Created',has(s.spa_changes,'change','Created'));check('SPA mencatat Modified',has(s.spa_changes,'change','Modified'));check('Procedure VALID',s.db.procedures['AVDF_D2_APP.SHOW_CUSTOMER_COUNT']?.status==='VALID');}
  if(n===11){check('Alert telah Closed',has(s.alerts,'status','Closed'));check('Job entitlement dan stored procedure tersedia',has(s.jobs,'type','Entitlement Retrieval')&&has(s.jobs,'type','Stored Procedure Retrieval'));}
  if(n===12){check('Generator insiden selesai',s.trainer.incident_generated);check('GRANT dan REVOKE terlihat',has(native,'action_name','GRANT')&&has(native,'action_name','REVOKE'));check('HR SELECT dan UPDATE memiliki bukti jaringan',fw.some(e=>e.object==='EMPLOYEES'&&e.user==='AVDF_D2_READER')&&has(fw,'command','UPDATE'));check('Alert hasil besar tersedia',has(s.alerts,'policy','LAB_D4_LARGE_RESULT'));check('Remediasi mencabut HR SELECT dan role',reader&&!reader.object_privileges.includes('HR.EMPLOYEES SELECT')&&!reader.roles.includes('AVDF_D5_POWER_ROLE')&&!s.db.roles.AVDF_D5_POWER_ROLE);}
  return checks;
}
function runScenarioTask(engine,task) {
  if(task.channel)return engine.command(task.channel,task.command);
  if(task.action.endsWith('_latest_alert')){const id=engine.state.alerts[0]?.id;return engine.act(task.action.replace('_latest',''),{id});}
  return engine.act(task.action,task.payload||{});
}
function scenarioTaskPassed(task,output) {
  if(/^Gagal:/m.test(output))return false;
  if(task.expectedError)return output.includes(task.expectedError);
  return !/^ORA-\d+/m.test(output);
}
if(typeof module!=='undefined')module.exports={scenarioChecks,runScenarioTask,scenarioTaskPassed};
