(function(){
 'use strict';
 const D=window.ADVENTURES2_DATA,O=window.SCHOOL_OBJECTS,C=window.Adventures2Core,$=id=>document.getElementById(id),KEY='sentences-adventures-2-v1';
 const palette=['#e3edfc','#ffe4d8','#e1f1eb','#fff0d6','#e9e7fa','#e4f1f9'];
 const endingWords=new Set(Object.values(D).flatMap(rows=>rows.flatMap(row=>[row.word,...row.blanks.map(b=>b.word)])));
 let state={version:1,levelEdition:2,startLevel:'A',selected:'',profiles:{},speed:'0.82'},active=false,profile=null,item=null,entry=null,answers=[],activeBlank=0,choiceOrder=[];
 let drag=null,hoverBlank=null,suppressClickUntil=0,lastTick=0,dateTimer=null,fitPending=false,touchStartY=null;
 let rideProfile='',rideCount=-1,rideToken=0,rideTimers=[];
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1&&saved.profiles&&typeof saved.profiles==='object'){state=saved;if(!C.objectName(O,state.selected))state.selected='';}}catch(e){notice('Saved work could not be opened. You can still play and download Excel.');}
 if(!C.levels.includes(state.startLevel))state.startLevel='A';
 const requestedVersion=new URLSearchParams(window.location.search).get('version');if(C.levels.includes(requestedVersion))state.startLevel=requestedVersion;
 function levelCorrectCount(){return list().filter(r=>profile.progress[r.id]?.complete).length;}
 function renderStartLevels(){const grid=$('start-levels');grid.replaceChildren();for(const level of C.levels){const b=document.createElement('button');b.type='button';b.textContent=level==='A'?'A · Shorter':'AA · Challenge';b.dataset.startLevel=level;b.setAttribute('aria-pressed',String(state.startLevel===level));b.onclick=()=>{state.startLevel=level;save();renderStartLevels();};grid.append(b);}}
 function notice(text){$('storage-notice').textContent=text;$('storage-notice').hidden=false;requestFit();}
 function requestFit(){
  if(!active||fitPending)return;fitPending=true;
  requestAnimationFrame(()=>{fitPending=false;if(!active)return;const page=$('activity'),available=window.innerHeight-($('storage-notice').hidden?0:$('storage-notice').getBoundingClientRect().height);
   page.dataset.fit='adventure';window.ReadingVoice?.fit();
  });
 }
 function refreshDate(){clearTimeout(dateTimer);const now=new Date(),date=window.notebookDate(now);$('notebook-date').textContent=date.text;$('notebook-date').setAttribute('datetime',date.iso);dateTimer=setTimeout(refreshDate,Math.max(1000,new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-now+100));requestFit();}
 function save(){
  if(active&&entry&&lastTick){const now=performance.now();entry.seconds=(entry.seconds||0)+(now-lastTick)/1000;lastTick=now;}
  try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){notice('This browser cannot save progress. Download Excel before closing.');}
 }
 function getProfile(id){const p=state.profiles[id]??={level:'A',positions:{},orders:{},progress:{},attempts:[]};if(!C.levels.includes(p.level))p.level='A';p.positions??={};p.orders??={};p.progress??={};if(!Array.isArray(p.attempts))p.attempts=[];return p;}
 function list(){return D[profile.level];}
 function position(){return Math.max(0,Math.min(list().length-1,Number(profile.positions[profile.level])||0));}
 function order(){
  const key=profile.level,rows=list(),n=rows.length;let a=profile.orders[key];
  const valid=Array.isArray(a)&&a.length===n&&new Set(a).size===n&&!a.some(x=>!Number.isInteger(x)||x<0||x>=n);
  profile.orderVersions??={};if(valid&&profile.orderVersions[key]===2)return a;
  const keepCurrent=valid||Number.isInteger(profile.positions[key]),at=position();
  if(keepCurrent){
   const previous=valid?a:Array.from({length:n},(_,i)=>i),prefix=previous.slice(0,at+1),seen=new Set(prefix),remaining=rows.map((_,i)=>i).filter(i=>!seen.has(i));
   a=prefix.concat(C.balancedOrder(remaining.map(i=>rows[i]),null,rows[prefix.at(-1)]?.pattern).map(i=>remaining[i]));
  }else a=C.balancedOrder(rows);
  profile.orders[key]=a;profile.orderVersions[key]=2;profile.positions[key]=keepCurrent?at:0;
  return a;
 }
 function feedback(text,type=''){$('feedback').textContent=text;$('feedback').className='feedback '+type;requestFit();}
 function stop(){if('speechSynthesis'in window)(window.ReadingVoice||window.speechSynthesis).cancel();}
 function speak(){
  stop();if(!active)return;if(window.TeacherVoice?.isEnabled()===false){$('voice-note').textContent='Voice is off. Your teacher can enable it.';return;}if(!('speechSynthesis'in window)){$('voice-note').textContent='Voice is unavailable here. A teacher can read the sentence using the hint.';return;}
  entry.listens=(entry.listens||0)+1;save();const u=new SpeechSynthesisUtterance(item.beginning+'. '+choiceOrder.map((value,i)=>String.fromCharCode(65+i)+'. '+value).join(' '));u.lang='en-US';u.rate=Number(state.speed)||.82;
  const voices=window.speechSynthesis.getVoices();u.voice=voices.find(v=>/^en[-_]CA/i.test(v.lang))||voices.find(v=>/^en[-_](US|GB)/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
  $('voice-note').textContent='Listening…';u.onend=()=>{if(active)$('voice-note').textContent='Tap Listen to hear it again.';};u.onerror=()=>{if(active)$('voice-note').textContent='Tap Listen to start the voice. Check the volume.';};(window.ReadingVoice||window.speechSynthesis).speak(u);
 }
 function renderObjects(){renderStartLevels();const grid=$('object-grid');grid.replaceChildren();O.forEach((o,i)=>{const b=document.createElement('button');b.className='object-tile'+(state.selected===o.id?' current':'');b.style.setProperty('--tile-bg',palette[i%palette.length]);b.setAttribute('aria-label','Choose '+o.name);const img=document.createElement('img');img.src=o.image;img.alt='';const label=document.createElement('span');label.textContent=o.name;b.append(img,label);b.onclick=()=>chooseObject(o.id);grid.append(b);});}
 function chooseObject(id){save();state.selected=id;profile=getProfile(id);profile.level=state.startLevel;active=true;$('landing').hidden=true;$('activity').hidden=false;const object=O.find(o=>o.id===id),img=document.createElement('img'),label=document.createElement('span');img.src=object.image;img.alt='';label.textContent=object.name;$('object-badge').replaceChildren(img,label);load();window.scrollTo(0,0);}
 function landing(){save();stop();cancelDrag();stopBalloonFlight();rideProfile='';rideCount=-1;active=false;entry=null;lastTick=0;$('activity').hidden=true;$('landing').hidden=false;renderObjects();window.scrollTo(0,0);}
 function load(read=true){
  $('activity').dataset.finished='false';$('journey-finish').hidden=true;showAdventureView('question');save();stop();cancelDrag();refreshDate();item=list()[order()[position()]];
  entry=profile.progress[item.id]??={started:new Date().toISOString(),choiceAttempts:0,checks:0,hints:0,listens:0,seconds:0,complete:false,teacher:'',blankStats:[],contentRevision:item.contentRevision||1};
  if((item.contentRevision||1)>1&&entry.contentRevision!==item.contentRevision){entry.answers=[];entry.blankStats=[];entry.checkedCurrent=false;entry.lastResponse='';delete entry.choiceOrder;entry.contentRevision=item.contentRevision;}
  entry.blankStats??=[];answers=C.restore(item,entry.answers);entry.answers=answers;activeBlank=C.nextBlank(item,answers);if(activeBlank<0)activeBlank=0;
  choiceOrder=Array.isArray(entry.choiceOrder)&&entry.choiceOrder.length===item.options.length&&new Set(entry.choiceOrder).size===item.options.length&&entry.choiceOrder.every(v=>item.options.includes(v))?entry.choiceOrder:C.shuffle(item.options);entry.choiceOrder=choiceOrder;lastTick=performance.now();
  for(const level of C.levels)document.querySelector('[data-level="'+level+'"]').setAttribute('aria-pressed',String(profile.level===level));
  $('task-eyebrow').textContent='LEVEL '+profile.level;$('piece-count').textContent=item.blanks.length+' '+(item.blanks.length===1?'blank':'blanks')+' · '+item.options.length+' choices';$('item-count').textContent=(position()+1)+' / '+list().length;
  $('activity-picture').src=item.image;$('activity-picture').alt=item.alt;$('activity-picture').style.maxWidth=item.nativeWidth+'px';$('activity-picture').classList.remove('failed');
  $('picture-frame').style.setProperty('--native-width',item.nativeWidth+'px');$('picture-frame').style.setProperty('--mobile-width',Math.min(74,item.nativeWidth,78*item.nativeWidth/item.nativeHeight)+'px');$('picture-covers').replaceChildren();
  for(const cover of item.covers||[]){const mask=document.createElement('span');mask.className='picture-cover';mask.style.left=cover.left+'%';mask.style.top=cover.top+'%';mask.style.width=cover.width+'%';mask.style.height=cover.height+'%';mask.style.background=cover.fill;$('picture-covers').append(mask);}
  $('previous').disabled=position()===0;['next','next-date','next-choices'].forEach(id=>$(id).disabled=position()===list().length-1);$('hint-display').hidden=true;$('hint').textContent='Show me a hint';$('voice-note').textContent='';
  $('theme').textContent=item.themeTitle;$('task-eyebrow').textContent='VERSION '+profile.level+' · QUESTION '+(position()+1)+' OF '+list().length;$('piece-count').textContent='3 endings';$('next').disabled=false;$('next').textContent=position()===list().length-1?'Finish adventure':'Next →';feedback(C.complete(item,answers)?'That makes sense! '+item.why:'');render();renderRating();renderProgress();renderBalloonFlight();save();if(read)speak();
 }
 function selectBlank(i){if(!Number.isInteger(i)||!item.blanks[i])return;activeBlank=i;entry.activeBlank=i;render();save();}
 function allowsEnding(text){const word=text.toLowerCase().replace(/[^a-z]/g,'');return endingWords.has(word)||C.endingPatterns.includes(word);}
 function appendHighlighted(parent,text,includeEnding=allowsEnding(text)){
  for(const part of C.highlights(text,includeEnding)){if(!part.feature){parent.append(document.createTextNode(part.text));continue;}const mark=document.createElement('mark');mark.className='ending-highlight '+part.feature;mark.textContent=part.text;parent.append(mark);}
 }
 function transitionIndex(text,word){const lower=text.toLowerCase(),key=word.toLowerCase();for(let i=0;i<=text.length-key.length;i++)if(lower.slice(i,i+key.length)===key&&!/[a-z]/i.test(text[i-1]||'')&&!/[a-z]/i.test(text[i+key.length]||''))return i;return -1;}
 function render(){
  const context=$('context');context.replaceChildren();const at=transitionIndex(item.beginning,item.transition);if(at>=0){context.append(document.createTextNode(item.beginning.slice(0,at)));const mark=document.createElement('mark');mark.className='transition-word';mark.textContent=item.beginning.slice(at,at+item.transition.length);context.append(mark,document.createTextNode(item.beginning.slice(at+item.transition.length)));}else context.append(document.createTextNode(item.beginning));
  if(answers[0]){const ending=document.createElement('span');ending.className='adventure-joined-ending '+(C.isRight(item,answers,0)?'correct':'trying');ending.textContent=answers[0];context.append(document.createTextNode(' '),ending);}
  context.setAttribute('aria-live','polite');
  $('placed-count').textContent=C.complete(item,answers)?'✓ Makes sense':answers[0]?'Read your joined sentence':'Choose one ending';
  const joined=$('joined-words');joined.replaceChildren();if(joined.parentElement)joined.parentElement.hidden=true;
  if(answers[0]){const sentence=document.createElement('span');sentence.className='adventure-finished-sentence'+(C.isRight(item,answers,0)?' correct':' trying');sentence.textContent=item.beginning+' '+answers[0];joined.append(sentence);}else{const prompt=document.createElement('span');prompt.className='joined-word-prompt';prompt.textContent='Your finished sentence will appear here.';joined.append(prompt);}
  const correct=C.complete(item,answers);$('choices').replaceChildren();choiceOrder.forEach((value,i)=>{const button=document.createElement('button'),letter=document.createElement('span'),text=document.createElement('span');button.type='button';button.className='adventure-ending'+(answers[0]===value?(correct?' correct':' incorrect'):'');button.dataset.choice=value;button.setAttribute('aria-label',String.fromCharCode(65+i)+'. '+value);button.setAttribute('aria-pressed',String(answers[0]===value));button.disabled=correct;letter.className='choice-letter';letter.textContent=String.fromCharCode(65+i);text.textContent=value;button.append(letter,text);button.onclick=()=>place(value,0,'Tap');$('choices').append(button);});
  $('choice-label').textContent='WHICH ENDING CONNECTS THE IDEAS?';$('clear-blank').disabled=!answers[0];$('check').disabled=!answers[0]||Boolean(entry.checkedCurrent);requestFit();window.ReadingVoice?.fit();
 }

 function record(event,index,value,correct,method){
  save();const b=item.blanks[index];profile.attempts.push({timestamp:new Date().toISOString(),level:profile.level,item:item.id,event,blank:b?index+1:'',kind:b?b.feature:'Sentence',word:b?b.word:item.word,target:b?b.answer:item.sentence,choice:value,correct,sentence:C.response(item,answers),options:choiceOrder.join(' | '),method,hints:entry.hints,listens:entry.listens,teacher:entry.teacher||'',seconds:Math.round(entry.seconds)});save();
 }
 function markComplete(){if(C.complete(item,answers)&&!entry.complete){entry.complete=true;entry.completedAt??=new Date().toISOString();renderBalloonFlight(true);}}
 function place(value,index,method='Tap'){
  if(!item.options.includes(value)||!Number.isInteger(index)||!item.blanks[index])return;
  activeBlank=index;answers[index]=value;entry.answers=answers;entry.checkedCurrent=false;entry.choiceAttempts=(entry.choiceAttempts||0)+1;
  const right=C.isRight(item,answers,index),stats=entry.blankStats[index]??={attempts:0,correct:0};stats.attempts++;if(right)stats.correct++;
  entry.lastResponse=C.response(item,answers);markComplete();record('Choice',index,value,right,method);
  if(right){const next=C.nextBlank(item,answers);if(next>=0)activeBlank=next;feedback('That makes sense! '+item.why,'success');}
  else feedback('Try another ending. Check the connecting word and the picture.','error');render();renderProgress();save();
 }
 function check(){if(answers.some(v=>v===null)||entry.checkedCurrent)return;entry.checks=(entry.checks||0)+1;entry.checkedCurrent=true;entry.lastChecked=new Date().toISOString();entry.lastResponse=C.response(item,answers);const correct=C.complete(item,answers);markComplete();record('Sentence check',-1,entry.lastResponse,correct,'Check button');feedback(correct?'You completed the sentence!':'Listen again and change the blanks that need another choice.',correct?'success':'error');render();renderProgress();save();}
 function clearBlank(){if(!answers[activeBlank])return;cancelDrag();answers[activeBlank]=null;entry.answers=answers;entry.checkedCurrent=false;feedback('This blank is ready for another choice.');render();save();}
 function resetQuestion(){stop();cancelDrag();touchStartY=null;suppressClickUntil=0;answers=item.blanks.map(()=>null);entry.answers=answers;entry.checkedCurrent=false;activeBlank=0;choiceOrder=C.shuffle(item.options);entry.choiceOrder=choiceOrder;$('hint-display').hidden=true;$('hint-display').textContent='';$('hint').textContent='Show me a hint';$('voice-note').textContent='Tap Listen to hear it again.';feedback('Question reset. Listen and try again.');render();save();}
 function pointerDown(e){if(e.button!==undefined&&e.button!==0||drag)return;drag={value:e.currentTarget.dataset.choice,target:e.currentTarget,pointer:e.pointerId,x:e.clientX,y:e.clientY,moving:false};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.addEventListener('pointermove',pointerMove);e.currentTarget.addEventListener('pointerup',pointerUp);e.currentTarget.addEventListener('pointercancel',cancelDrag);}
 function findDrop(x,y){return document.elementFromPoint(x,y)?.closest('[data-blank]')||null;}
 function pointerMove(e){if(!drag||drag.pointer!==e.pointerId)return;if(!drag.moving&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;e.preventDefault();drag.moving=true;drag.target.classList.add('dragging');const ghost=$('drag-ghost');ghost.textContent=drag.value;ghost.hidden=false;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';if(hoverBlank)hoverBlank.classList.remove('drop-target');hoverBlank=findDrop(e.clientX,e.clientY);if(hoverBlank)hoverBlank.classList.add('drop-target');if(e.clientY>window.innerHeight-35)window.scrollBy(0,12);else if(e.clientY<45)window.scrollBy(0,-12);}
 function pointerUp(e){if(!drag||drag.pointer!==e.pointerId)return;const moving=drag.moving,value=drag.value,target=moving?findDrop(e.clientX,e.clientY):null;cancelDrag();if(moving){suppressClickUntil=performance.now()+400;if(target)place(value,Number(target.dataset.blank),'Drag');else feedback('Drop on a sentence blank. Your choice is still in the bank.');}}
 function cancelDrag(){if(drag){const t=drag.target;t.classList.remove('dragging');t.removeEventListener('pointermove',pointerMove);t.removeEventListener('pointerup',pointerUp);t.removeEventListener('pointercancel',cancelDrag);try{if(t.hasPointerCapture(drag.pointer))t.releasePointerCapture(drag.pointer);}catch(e){}drag=null;}if(hoverBlank)hoverBlank.classList.remove('drop-target');hoverBlank=null;$('drag-ghost').hidden=true;}
 function renderRating(){document.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed',String(entry.teacher===b.dataset.rating)));}
 function renderProgress(){renderBaseProgress();$('adventure-score').textContent='Score '+levelCorrectCount()+' / 100';}
 function renderBaseProgress(){const rows=list(),completed=rows.filter(r=>profile.progress[r.id]?.complete).length;$('progress').textContent=C.objectName(O,state.selected)+' · '+completed+' / '+rows.length+' completed in '+profile.level+' · Saved here';}
 function stopBalloonFlight(){rideToken++;rideTimers.forEach(clearTimeout);rideTimers=[];$('balloon-rig').classList.remove('is-moving');}
 function renderBalloonFlight(animate=false){
  if(!active)return;const count=C.correctCount(profile),sameProfile=rideProfile===state.selected,previous=rideCount;
  if(sameProfile&&previous===count)return;
  stopBalloonFlight();rideProfile=state.selected;rideCount=count;const token=rideToken,rig=$('balloon-rig'),step=C.rideStep(count);
  $('balloon-count').textContent=String(count);$('balloon-flight').setAttribute('aria-label',C.objectName(O,state.selected)+': '+count+' correct questions. A new balloon starts every 20.');
  $('flight-status').textContent=count+' correct questions. '+step+' of 20 on this balloon flight.';
  const setStep=n=>rig.style.setProperty('--rise-progress',n*5+'%');
  const colour=n=>rig.dataset.flight=String(Math.floor(n/20)+1);
  const later=(fn,ms)=>rideTimers.push(setTimeout(()=>{if(token===rideToken)fn();},ms));
  const reveal=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(token===rideToken)rig.classList.remove('resetting');}));
  if(!animate||!sameProfile||count<=previous){rig.classList.add('resetting');colour(count);setStep(step);reveal();return;}
  const move=()=>{rig.classList.remove('resetting');colour(count-1);setStep(step||20);rig.classList.add('is-moving');later(()=>rig.classList.remove('is-moving'),1050);
   if(step===0)later(()=>{rig.classList.add('resetting');colour(count);setStep(0);$('flight-status').textContent=count+' correct questions. A new balloon is ready at the bottom.';reveal();},1500);
  };
  if(previous>0&&C.rideStep(previous)===0){rig.classList.add('resetting');colour(count);setStep(0);later(move,60);}else move();
 }
 function changeLevel(level){if(!C.levels.includes(level)||profile.level===level)return;save();profile.level=level;state.startLevel=level;load();}
 function finishJourney(){save();stop();$('activity').dataset.finished='true';$('journey-finish').hidden=false;const score=levelCorrectCount();$('finish-summary').textContent='Version '+profile.level+': your score is '+score+' out of 100. '+(score===100?'Every sentence makes sense. Well done!':'Review the questions to finish more sentences.');requestFit();window.ReadingVoice?.fit();}
 function nav(delta){if(delta>0&&position()===list().length-1){finishJourney();return;}navBase(delta);}
 function navBase(delta){save();profile.positions[profile.level]=Math.max(0,Math.min(list().length-1,position()+delta));load();}
 function exportAssessment(all){
  save();const ids=all?O.map(o=>o.id):[state.selected];if(!ids[0])return;
  const summary=[['School supply','Level','Available','Started','Completed','Choice attempts','Sentence checks','Hints','Listens','Independent','With help','Practising']];
  const progress=[['School supply','Level','Activity','Correct ending','Sentence','Current student sentence','Correct choices','Choices offered','Blanks','Filled','Correct now','Status','Choice attempts','Sentence checks','Hints','Listens','Teacher support','First started (UTC)','Completed (UTC)','Active seconds','Picture file']];
  const blanks=[['School supply','Level','Activity','Blank','Kind','Word','Correct choice','Student choice','Correct now','Choice attempts','Correct selections','Choices offered']];
  const attempts=[['School supply','Time (UTC)','Level','Activity','Event','Blank','Answer type','Word','Correct choice or sentence','Student choice or sentence','Correct','Student sentence','Choices offered','Method','Hints so far','Listens so far','Teacher support','Active seconds']];
  for(const id of ids){const name=C.objectName(O,id),p=state.profiles[id]||{progress:{},attempts:[]};
   for(const level of C.levels){const rows=D[level],es=rows.map(r=>p.progress[r.id]).filter(Boolean);summary.push([name,level,rows.length,es.length,es.filter(e=>e.complete).length,es.reduce((n,e)=>n+(e.choiceAttempts||0),0),es.reduce((n,e)=>n+(e.checks||0),0),es.reduce((n,e)=>n+(e.hints||0),0),es.reduce((n,e)=>n+(e.listens||0),0),...['Independent','With help','Practising'].map(v=>es.filter(e=>e.teacher===v).length)]);
    for(const r of rows){const e=p.progress[r.id];if(all&&!e)continue;const current=C.restore(r,e?.answers),offered=e?.choiceOrder||r.options;progress.push([name,level,r.id,r.word,r.sentence,C.response(r,current),r.blanks.map(b=>b.answer).join(' | '),offered.join(' | '),r.blanks.length,current.filter(Boolean).length,r.blanks.filter((_,i)=>C.isRight(r,current,i)).length,e?.complete?'Completed':e?'Practising':'Not started',e?.choiceAttempts||0,e?.checks||0,e?.hints||0,e?.listens||0,e?.teacher||'',e?.started||'',e?.completedAt||'',Math.round(e?.seconds||0),r.image]);r.blanks.forEach((b,i)=>blanks.push([name,level,r.id,i+1,b.feature,b.word,b.answer,current[i]||'',C.isRight(r,current,i)?'Yes':'No',e?.blankStats?.[i]?.attempts||0,e?.blankStats?.[i]?.correct||0,offered.join(' | ')]));}
   }
   for(const a of p.attempts||[])attempts.push([name,a.timestamp,a.level,a.item,a.event,a.blank,a.kind,a.word,a.target,a.choice,a.correct?'Yes':'No',a.sentence,a.options,a.method,a.hints,a.listens,a.teacher,a.seconds]);
  }
  const guide=[["Sentences Adventures 2 assessment","Details"],["Exported (UTC)",new Date().toISOString()],["Reading task","100 connected-sentence adventures for Grades 2–3. Students choose one of three complete endings. Only one fits all the clues. A uses shorter sentences; AA has more detail and closer choices. Each version has 100 questions."],["Pictures","100 new 3D animated illustrations shared by corresponding A and AA questions. Themes include robots, gliders, science contests, basketball, horses, rock skipping, rock climbing, museums, water workshops and space club."],["Choices","Answer buttons are shuffled per question and retained when saved. The correct option is not always in the same position."],["Score","One point per question first answered correctly, maximum 100 per version for each school-supply profile. A wrong choice earns no point. Question reset preserves previous points."],["Balloon","The existing kids-in-a-balloon artwork and rise logic are reused. Every correct first completion raises the balloon one step. Every 20 points starts a new balloon at the bottom with the cumulative A + AA reward count."],["Attempts","Every answer tap is recorded, including wrong choices. Summary, Progress, Blanks and Attempts retain targets, chosen endings, options, correctness, hints, listens and support."],["Identity","Twenty school-supply profiles. No student names, IDs or passwords."],["Voice","Listen reads the beginning and all three choices. It does not read a completed correct sentence first. Speed stays below Listen; Stop and navigation cancel speech. Changing speed restarts the current read."],["Storage","Saved locally under sentences-adventures-2-v1. A and AA have separate positions and answers. This project has its own storage and does not read or alter the first Sentences Adventures project."],["Layout","One viewport, no page or panel scrolling. The activity reflows for laptop and tablet screens."],["Reuse","The Word Endings core, profile system, assessment export and balloon flight are reused with a new sentence-ending renderer."],["Revised reading challenge","Three closely related, realistic endings for each question. Read the whole beginning and compare the clues, cause, sequence, position or purpose. Connecting words express sequence, cause, contrast, addition, time and conditions. A and AA share each scene at different reading levels."],["Larger pictures","The scene uses about half the desktop work area. On narrow portrait phones, Picture and Read & answer switch views in the same screen while Listen, speed and Stop remain available."]];
  const blob=window.SpellingExcel.workbook([{name:'Summary',rows:summary},{name:'Progress',rows:progress},{name:'Blanks',rows:blanks},{name:'Attempts',rows:attempts},{name:'Guide',rows:guide}]);
  const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='Sentences-Adventures-2-'+(all?'all-objects':state.selected)+'-'+window.notebookDate(new Date()).iso+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 C.levels.forEach((level,i)=>{const b=document.createElement('button');b.textContent=level;b.title=level==='A'?'A · Shorter sentences':'AA · Challenge';b.dataset.level=level;b.setAttribute('aria-label','Version '+level);b.onclick=()=>changeLevel(level);$(i<3?'levels-one':'levels-two').append(b);});
 document.querySelectorAll('[data-rating]').forEach(b=>b.onclick=()=>{entry.teacher=entry.teacher===b.dataset.rating?'':b.dataset.rating;save();renderRating();});
 $('home').onclick=landing;$('object-badge').onclick=landing;$('listen').onclick=speak;$('stop').onclick=()=>{stop();$('voice-note').textContent='Voice stopped. Tap Listen to hear it again.';};$('speed').value=state.speed||'0.82';$('speed').onchange=()=>{state.speed=$('speed').value;save();};
 $('check').onclick=check;$('reset-question').onclick=resetQuestion;$('clear-blank').onclick=clearBlank;$('previous').onclick=()=>nav(-1);['next','next-date','next-choices'].forEach(id=>$(id).onclick=()=>nav(1));
 $('hint').onclick=()=>{if(!$('hint-display').hidden){$('hint-display').hidden=true;$('hint').textContent='Show me a hint';requestFit();return;}entry.hints=(entry.hints||0)+1;$('hint-display').textContent=item.sentence;$('hint-display').hidden=false;$('hint').textContent='Hide the hint';save();requestFit();};
 $('shuffle-activities').onclick=()=>{save();profile.orders[profile.level]=C.balancedOrder(list(),Math.random);profile.orderVersions??={};profile.orderVersions[profile.level]=2;profile.positions[profile.level]=0;load();};$('export-current').onclick=()=>exportAssessment(false);$('export-all').onclick=()=>exportAssessment(true);
 $('reset-all').onclick=()=>{if(window.confirm('Reset all saved Sentences Adventures 2 progress for '+C.objectName(O,state.selected)+'? Other school supplies keep their progress.')){stop();cancelDrag();active=false;entry=null;lastTick=0;delete state.profiles[state.selected];profile=getProfile(state.selected);active=true;load();}};
 $('activity-picture').onerror=()=>notice('A picture could not load. Keep the complete Sentences-Adventures-2 folder together.');
 document.addEventListener('touchstart',e=>{touchStartY=active&&e.touches.length===1?e.touches[0].clientY:null;},{passive:true});
 document.addEventListener('touchmove',e=>{if(!active||touchStartY===null||e.touches.length!==1)return;const inWork=Boolean(e.target.closest('[data-area]')),inMenu=Boolean(e.target.closest('[data-scrollable]')),pulling=window.scrollY<=0&&e.touches[0].clientY>touchStartY;if(e.cancelable&&(drag||inWork||(!inMenu&&pulling)))e.preventDefault();},{passive:false});
 document.addEventListener('touchend',()=>{touchStartY=null;},{passive:true});document.addEventListener('touchcancel',()=>{touchStartY=null;},{passive:true});
 window.addEventListener('resize',requestFit);if('ResizeObserver'in window)new window.ResizeObserver(requestFit).observe($('activity'));
 window.addEventListener('pagehide',()=>{save();stop();cancelDrag();stopBalloonFlight();rideProfile='';rideCount=-1;clearTimeout(dateTimer);});window.addEventListener('pageshow',()=>{refreshDate();renderBalloonFlight();});window.addEventListener('focus',refreshDate);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){save();stop();cancelDrag();stopBalloonFlight();rideProfile='';rideCount=-1;lastTick=0;}else{refreshDate();if(active){lastTick=performance.now();renderBalloonFlight();}}});
 $('review-adventure').onclick=()=>{profile.positions[profile.level]=0;load();};$('finish-home').onclick=landing;
 function showAdventureView(view){$('activity').dataset.view=view;$('show-scene').setAttribute('aria-pressed',String(view==='picture'));$('show-question').setAttribute('aria-pressed',String(view==='question'));requestFit();window.ReadingVoice?.fit();}
 $('show-scene').onclick=()=>showAdventureView('picture');$('show-question').onclick=()=>showAdventureView('question');
 refreshDate();renderObjects();
})();
