var SUPABASE_URL='https://phrxljphxthtcdnjubxd.supabase.co';
var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocnhsanBoeHRodGNkbmp1YnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODc0MDQsImV4cCI6MjA5MTI2MzQwNH0.A8m_hyTyVh9Jd0cIDN0xQc2St0RC3xl5xBp6xSlTJeU';
var SP_SITE='https://tamucc.sharepoint.com/sites/CGS-GraduateStackedCourses-group';
var SP_BACKUP_FOLDER='/sites/CGS-GraduateStackedCourses-group/Shared%20Documents/GFR%20Backups';
var BACKUP_INTERVAL_DAYS=14;
var LAST_BACKUP_KEY='gfr_last_backup_v3';
var SB_H={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'};

function sbGet(t,q){return fetch(SUPABASE_URL+'/rest/v1/'+t+'?'+(q||''),{headers:SB_H}).then(function(r){if(!r.ok)return r.text().then(function(e){throw new Error('GET '+t+' '+r.status+': '+e);});return r.json();});}
function sbPost(t,b){return fetch(SUPABASE_URL+'/rest/v1/'+t,{method:'POST',headers:SB_H,body:JSON.stringify(b)}).then(function(r){if(!r.ok)return r.text().then(function(e){throw new Error('POST '+t+' '+r.status+': '+e);});return r.json();});}
function sbPatch(t,id,b){var h=Object.assign({},SB_H,{'Prefer':'return=representation'});return fetch(SUPABASE_URL+'/rest/v1/'+t+'?id=eq.'+id,{method:'PATCH',headers:h,body:JSON.stringify(b)}).then(function(r){if(!r.ok)return r.text().then(function(e){throw new Error('PATCH '+r.status+': '+e);});return r.json();});}
function sbDelete(t,id){return fetch(SUPABASE_URL+'/rest/v1/'+t+'?id=eq.'+id,{method:'DELETE',headers:SB_H}).then(function(r){if(!r.ok)throw new Error('DELETE '+r.status);});}

function shuffle(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=a[i];a[i]=a[j];a[j]=tmp;}return a;}

function computeGfrStatus(r){
  if(r.status==='Active'&&r.grad_dt&&new Date(r.grad_dt)<=new Date())return'Free';
  return r.status;
}
function withLive(r){
  var ls=computeGfrStatus(r);
  return Object.assign({},r,{liveStatus:ls,displayStudent:ls==='Active'?r.current_student:'',displayGrad:ls==='Active'?r.grad_expected:'',displayProgram:ls==='Active'?r.program:'',displayStudentCollege:ls==='Active'?r.current_student_college:''});
}

function parseGradDate(defenseDate,anticipatedGrad){
  if(defenseDate){
    var m=String(defenseDate).match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if(m){var yr=parseInt(m[3]);if(yr<100)yr+=2000;var d=new Date(yr,parseInt(m[1])-1,parseInt(m[2]));if(!isNaN(d.getTime()))return d.toISOString().slice(0,10);}
    if(String(defenseDate).match(/^\d{4}-\d{2}-\d{2}$/))return String(defenseDate);
  }
  if(anticipatedGrad){
    var t=String(anticipatedGrad).trim().toLowerCase();
    var yr2=t.match(/(\d{4})/);if(!yr2)return null;
    var year=parseInt(yr2[1]);
    if(t.includes('spring'))return year+'-06-01';
    if(t.includes('summer'))return year+'-09-01';
    if(t.includes('fall'))return(year+1)+'-01-15';
  }
  return null;
}

function buildBackupFilename(){
  var now=new Date();
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return'GFR_Tracking_'+months[now.getMonth()]+'-'+now.getFullYear()+'_'+(now.getDate()<=15?'1':'2')+'.csv';
}
function buildCSV(records, requests, students){
  // === Sheet 1: GFR Faculty Roster ===
  var rows=[['=== GFR FACULTY ROSTER ===']];
  rows.push(['Professor','College','Department','Academic Title','Status','Has Pending Request','Current Student','Student College','Grad Expected','Program','Decline Count','Notes','Last Updated']);
  var today=new Date().toLocaleDateString();
  (records||[]).forEach(function(r){
    rows.push([r.name||'',r.college||'',r.department||'',r.title||'',r.liveStatus||'',
      r.hasPendingRequest?'Yes':'No',r.displayStudent||'',r.displayStudentCollege||'',
      r.displayGrad||'',r.displayProgram||'',r.declineCount||0,r.notes||'',today]);
  });

  // === Sheet 2: Doctoral Students ===
  rows.push([]);
  rows.push(['=== DOCTORAL STUDENTS ===']);
  rows.push(['Last Name','First Name','Full Name','Student ID','College','Degree','Program','Department',
    'Coordinator','Dept Chair','Academic Advisor','Entry Date','Anticipated Grad',
    'Chair','Co-Chair','Committee Members','GFR','External Member',
    'Proposal Date','Defense Date','Dissertation Title',
    'Form A','Form B','Form C','Form D','Form E','Form F','Form G','Form H','Form K',
    'Candidacy Letter','GFR Letter Date','Comments','Email']);
  (students||[]).forEach(function(s){
    rows.push([s.last_name||'',s.first_name||'',s.full_name||'',s.student_id||'',
      s.college_code||'',s.degree||'',s.program_name||s.major||'',s.department||'',
      s.coordinator||'',s.dept_chair||'',s.academic_advisor||'',s.entry_date||'',
      s.anticipated_grad||'',s.chair||'',s.cochair||'',s.committee_members||'',
      s.gfr||'',s.external_member||'',s.proposal_date||'',s.defense_date||'',
      s.dissertation_title||'',s.form_a||'',s.form_b||'',s.form_c||'',s.form_d||'',
      s.form_e||'',s.form_f||'',s.form_g||'',s.form_h||'',s.form_k||'',
      s.candidacy_letter_date||'',s.gfr_letter_date||'',s.comments||'',s.email||'']);
  });

  // === Sheet 3: GFR Requests Log ===
  rows.push([]);
  rows.push(['=== GFR REQUESTS LOG ===']);
  rows.push(['Student','College','Program','GFR Name','GFR College','Status','Sent Date','Deadline','Chair','Dissertation']);
  (requests||[]).forEach(function(rq){
    rows.push([rq.student_name||'',rq.student_college||'',rq.student_program||'',
      rq.gfr_name||'',rq.gfr_college||'',rq.status||'',
      rq.sent_at?new Date(rq.sent_at).toLocaleDateString():'',
      rq.deadline?new Date(rq.deadline).toLocaleDateString():'',
      rq.chair||'',rq.dissertation||'']);
  });

  return rows.map(function(row){
    return row.map(function(c){return '"'+String(c||'').replace(/"/g,'""')+'"';}).join(',');
  }).join('\r\n');
}

function exportCSV(records, requests, students){
  var csv=buildCSV(records,requests,students);
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  a.download=buildBackupFilename();
  a.click();URL.revokeObjectURL(a.href);
}

// Students-only export (for the Students tab export button)
function exportStudentsCSV(students){
  var rows=[['Last Name','First Name','Full Name','Student ID','College','Degree','Program',
    'Department','Coordinator','Dept Chair','Academic Advisor','Entry Date','Anticipated Grad',
    'Chair','Co-Chair','Committee Members','GFR','Proposal Date','Defense Date','Dissertation Title',
    'Form A','Form B','Form C','Form D','Form E','Form F','Form G','Form H','Form K','Comments','Email']];
  (students||[]).forEach(function(s){
    rows.push([s.last_name||'',s.first_name||'',s.full_name||'',s.student_id||'',
      s.college_code||'',s.degree||'',s.program_name||s.major||'',s.department||'',
      s.coordinator||'',s.dept_chair||'',s.academic_advisor||'',s.entry_date||'',
      s.anticipated_grad||'',s.chair||'',s.cochair||'',s.committee_members||'',
      s.gfr||'',s.proposal_date||'',s.defense_date||'',s.dissertation_title||'',
      s.form_a||'',s.form_b||'',s.form_c||'',s.form_d||'',s.form_e||'',
      s.form_f||'',s.form_g||'',s.form_h||'',s.form_k||'',s.comments||'',s.email||'']);
  });
  var csv=rows.map(function(row){return row.map(function(c){return '"'+String(c||'').replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  a.download='Students_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();URL.revokeObjectURL(a.href);
}

async function backupToSharePoint(records, requests, students, notify){
  var csv=buildCSV(records,requests,students);
  var fileName=buildBackupFilename();
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var uploadUrl=SP_SITE+'/_api/web/GetFolderByServerRelativeUrl(\''+SP_BACKUP_FOLDER+'\')/Files/add(url=\''+fileName+'\',overwrite=true)';
  try{
    var dr=await fetch(SP_SITE+'/_api/contextinfo',{method:'POST',
      headers:{'Accept':'application/json;odata=verbose','Content-Type':'application/json;odata=verbose'},
      credentials:'include'});
    if(!dr.ok)throw new Error('Not logged in to SharePoint');
    var digest=(await dr.json()).d.GetContextWebInformation.FormDigestValue;
    var ab=await blob.arrayBuffer();
    var ur=await fetch(uploadUrl,{method:'POST',
      headers:{'Accept':'application/json;odata=verbose','X-RequestDigest':digest},
      credentials:'include',body:ab});
    if(ur.ok){
      localStorage.setItem(LAST_BACKUP_KEY,new Date().toISOString());
      notify('✅ Backup saved to SharePoint: '+fileName+' (GFR faculty + '+  (students||[]).length+' students + requests)');
      return true;
    }
    throw new Error('Upload failed: '+ur.status);
  }catch(e){
    exportCSV(records,requests,students);
    window.open(SP_SITE+'/Shared%20Documents/Forms/AllItems.aspx','_blank');
    localStorage.setItem(LAST_BACKUP_KEY,new Date().toISOString());
    notify('📁 Downloaded '+fileName+' (includes all students & GFR data) — upload to SharePoint GFR Backups folder','warning');
    return false;
  }
}

function shouldAutoBackup(){var last=localStorage.getItem(LAST_BACKUP_KEY);if(!last)return true;return(Date.now()-new Date(last).getTime())/86400000>=BACKUP_INTERVAL_DAYS;}

var COLLEGE_MAP={'COEHD':'College of Education & Human Development','COSN':'College of Science','CECS':'College of Engineering & Computer Science','CONHS':'College of Nursing & Health Sciences','COB':'College of Business','COLA':'College of Liberal Arts','SAMC':'School of Arts, Media & Communication'};
var COLLEGE_CODES=['COEHD','COSN','CECS','CONHS','COB','COLA','SAMC'];
var STATUS_CFG={Free:{color:'#059669',bg:'#d1fae5',label:'Free'},Active:{color:'#d97706',bg:'#fef3c7',label:'Active'},Declined:{color:'#6b7280',bg:'#f3f4f6',label:'Declined'}};
var PENDING_CFG={color:'#2563eb',bg:'#dbeafe'};
var DB_GFR_FIELDS=['name','college','title','department','notes','status','current_student','current_student_college','grad_expected','grad_dt','program'];
function toDbPatch(obj){return Object.fromEntries(DB_GFR_FIELDS.filter(function(k){return k in obj;}).map(function(k){return[k,obj[k]];}));}

var _programs=[];var _advisors=[];var _departments=[];
function lookupProgram(code){return _programs.find(function(p){return p.code===code;})||null;}
function lookupAdvisor(collegeCode,lastName){
  if(!lastName||!collegeCode)return'';
  var first=lastName.trim()[0].toUpperCase();
  var a=_advisors.find(function(a){return a.college_code===collegeCode&&first>=a.last_name_start&&first<=a.last_name_end;});
  return a?a.advisor_name:'';
}
function lookupDept(name){return _departments.find(function(d){return d.name===name;})||null;}

// ── GFR Name Normalization ────────────────────────────────────────────────────
// Maps variant/short names in students.gfr → canonical gfr_roster.name
var GFR_NAME_ALIASES={
  'robin pizzitola':'Robin Pizzitola (Johnson)',
  'terri xu':'Terri (Tian) Xu',
  'catherine schumann':'Catherine Schumann (Quick)',
  'ethan thompson':'Ethan (Robert) Thompson',
  'celel ekici':'Celil Ekici',
  'jose baca':'Jose Baca Garcia',
  'jennifer smith-engle':'Jennifer Margaret Smith-Engle',
  'scott king':'Scott A. King',
  'susan murphy':'Susan Wolff Murphy',
  'desireé thorpe':'Desiree Thorpe',
  'desiree thorpe':'Desiree Thorpe',
  'alexey sadovski':'Alexey L. Sadovski',
  'yndalecio hinojosa':'Yndalecio "Issac" Hinojosa',
  'ioana pavel':'Ioana Emilia Pavel',
  'micheal starek':'Michael Starek',
  'jose pena':'Joe Pena',
  'stephanie rollie rodriguez':'Stephanie Rodriguez (Rollie)',
  'david zhang':'Daqun "David" Zhang',
  'jeff dillard':'Robert "Jeff" Dillard',
  'iltai isaac kim':'(Isaac) Iltai Kim',
  'nikki changchit':'Chuleeporn Changchit',
  'brooke friley':'Lorin Brooke Friley',
  'chris andrews':'Christopher Andrews',
  'corinne zeman':'Corinne M. Zeman',
  'veysal avsar':'Veysel Avsar',
  'jim silliman':'James Silliman',
  'isaac hinojosa':'Yndalecio "Issac" Hinojosa',
  'ivanete blanco':'Ivanette Blanco',
  'lon seiger':'Lon H. Seiger',
  'patrick larkin':'Patrick David Larkin',
  'greg stunz':'Gregory W. Stunz',
  'steven seidel':'Steve Seidel',
  'scott sherman':'W. Scott Sherman',
  'deborah sebila':'Deborah Sibila',
  'faezeh babaiesl':'Fabezeh Babaieasl',
  'manuel piña':'Manuel Pina',
  'manny piña':'Manuel Pina',
};

// Normalize a GFR name: strip "(Reassignment)" etc, then check alias map
function normalizeGfrName(name){
  if(!name)return'';
  var clean=name.replace(/\s*\((?:reassignment|reassigned|pending)\)\s*/gi,'').trim();
  var key=clean.toLowerCase();
  return GFR_NAME_ALIASES[key]||clean;
}

// Build a lookup key from a GFR roster name (lowercase, stripped)
function gfrNameKey(name){
  if(!name)return'';
  return name.toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();
}

// Match a student's gfr field to a roster entry using fuzzy matching
function matchGfrToRoster(studentGfrName, rosterMap){
  if(!studentGfrName)return null;
  var canonical=normalizeGfrName(studentGfrName);
  // Exact match first
  if(rosterMap[canonical.toLowerCase()])return rosterMap[canonical.toLowerCase()];
  // Try key-based match
  var key=gfrNameKey(canonical);
  var keys=Object.keys(rosterMap);
  for(var i=0;i<keys.length;i++){
    if(gfrNameKey(keys[i])===key)return rosterMap[keys[i]];
  }
  // Try last-name match as fallback
  var last=canonical.split(' ').pop().toLowerCase();
  for(var j=0;j<keys.length;j++){
    if(keys[j].toLowerCase().split(' ').pop()===last){
      // Only if there's one match by last name
      var matches=keys.filter(function(k){return k.toLowerCase().split(' ').pop()===last;});
      if(matches.length===1)return rosterMap[matches[0]];
    }
  }
  return null;
}

// Explicitly attach helpers to window so Babel-compiled inline scripts can find them
if(typeof window!=='undefined'){
  window.GFR_NAME_ALIASES=GFR_NAME_ALIASES;
  window.normalizeGfrName=normalizeGfrName;
  window.gfrNameKey=gfrNameKey;
  window.matchGfrToRoster=matchGfrToRoster;
}

var PROGRAM_DEGREE_MAP={
  'CINS':'EDD',
  'EDLD':'EDD',
  'CNED':'PHD',
  'CMSS':'PHD',
  'MARB':'PHD',
  'COSC':'PHD',
  'NURP':'DNP',
  'GSCM':'PHD'
};
