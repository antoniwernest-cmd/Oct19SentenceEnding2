(function(){
 'use strict';
 const project=document.documentElement.dataset.voiceProject||'sentence-adventures';
 const KEY=project+'-teacher-voice-v1';
 let enabled=true,unlocked=false,dialog,opener;
 try{enabled=localStorage.getItem(KEY)!=='off';}catch(e){}
 function stop(){window.ReadingVoice?.cancel();window.speechSynthesis?.cancel();}
 function sync(){
  document.querySelectorAll('.teacher-voice-open').forEach(b=>{b.textContent='Teacher voice · '+(enabled?'On':'Off');b.setAttribute('aria-label','Teacher voice settings. Voice is '+(enabled?'on':'off'));});
  for(const id of ['listen','speed','reading-voice-speed']){const el=document.getElementById(id);if(el){el.disabled=!enabled;el.title=enabled?'':'Voice is disabled by the teacher';}}
  const note=document.getElementById('voice-note');if(note)note.textContent=enabled?'Tap Listen to hear the sentence.':'Voice is off. Your teacher can enable it.';
  if(!enabled)stop();
 }
 function lock(){unlocked=false;document.getElementById('teacher-voice-code').value='';document.getElementById('teacher-voice-unlock').hidden=false;document.getElementById('teacher-voice-options').hidden=true;document.getElementById('teacher-voice-error').textContent='';}
 function init(){
  const template=document.createElement('template');
  template.innerHTML='<dialog id="teacher-voice-dialog" aria-labelledby="teacher-voice-title"><div class="teacher-voice-heading"><h2 id="teacher-voice-title">Teacher voice settings</h2><button type="button" id="teacher-voice-close" aria-label="Close voice settings">×</button></div><p id="teacher-voice-state"></p><form id="teacher-voice-unlock"><label for="teacher-voice-code">Teacher code</label><div class="teacher-code-row"><input id="teacher-voice-code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="3" required aria-describedby="teacher-voice-error"><button type="submit">Unlock</button></div><p id="teacher-voice-error" role="alert"></p></form><div id="teacher-voice-options" hidden><p>Choose whether students can hear the sentences. This also controls automatic reading.</p><div class="teacher-code-row"><button type="button" id="teacher-voice-on">Enable voice</button><button type="button" id="teacher-voice-off">Disable voice</button></div></div><p class="teacher-voice-local" id="teacher-voice-save">Saved for this activity in this browser.</p></dialog>';
  document.body.append(template.content);dialog=document.getElementById('teacher-voice-dialog');
  document.querySelectorAll('.teacher-voice-open').forEach(button=>button.addEventListener('click',()=>{opener=button;stop();lock();document.getElementById('teacher-voice-state').textContent='Voice is currently '+(enabled?'on.':'off.');dialog.showModal();document.getElementById('teacher-voice-code').focus();}));
  document.getElementById('teacher-voice-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{lock();opener?.focus();});
  document.getElementById('teacher-voice-unlock').onsubmit=event=>{event.preventDefault();const code=document.getElementById('teacher-voice-code');if(code.value!=='259'){document.getElementById('teacher-voice-error').textContent='That code did not match. Try again.';code.value='';code.focus();return;}unlocked=true;code.value='';document.getElementById('teacher-voice-unlock').hidden=true;document.getElementById('teacher-voice-options').hidden=false;document.getElementById(enabled?'teacher-voice-off':'teacher-voice-on').focus();};
  function change(value){if(!unlocked)return;enabled=value;try{localStorage.setItem(KEY,enabled?'on':'off');document.getElementById('teacher-voice-save').textContent='Saved for this activity in this browser.';}catch(e){document.getElementById('teacher-voice-save').textContent='Voice changed for this page. Browser storage is unavailable.';}sync();document.getElementById('teacher-voice-state').textContent='Voice is now '+(enabled?'on.':'off.');lock();document.getElementById('teacher-voice-code').focus();}
  document.getElementById('teacher-voice-on').onclick=()=>change(true);document.getElementById('teacher-voice-off').onclick=()=>change(false);
  sync();window.addEventListener('pageshow',sync);
 }
 window.TeacherVoice=Object.freeze({isEnabled:()=>enabled});
 window.addEventListener('storage',event=>{if(event.key===KEY){enabled=event.newValue!=='off';sync();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
