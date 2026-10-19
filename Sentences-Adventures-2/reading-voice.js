(function(){
 'use strict';
 const KEY='reading-voice-speed-v1',rates=[.5,.65,.82,1,1.15,1.3],synth=window.speechSynthesis;
 let rate=.82,current=null,token=0,pendingFit=false,ready=false;
 try{const saved=Number(localStorage.getItem(KEY));if(rates.includes(saved))rate=saved;}catch(e){}
 function sync(){const select=document.getElementById('reading-voice-speed');if(select)select.value=String(rate);}
 function cancel(){token++;current=null;if(synth)synth.cancel();}
 function speak(utterance){
  cancel();if(!synth||!utterance||window.TeacherVoice?.isEnabled()===false)return;const id=token;
  utterance.rate=rate;const end=utterance.onend,error=utterance.onerror;
  current={text:utterance.text,lang:utterance.lang,voice:utterance.voice,pitch:utterance.pitch,volume:utterance.volume,onend:end,onerror:error};
  utterance.onend=e=>{if(id!==token)return;current=null;end?.call(utterance,e);};
  utterance.onerror=e=>{if(id!==token)return;current=null;error?.call(utterance,e);};
  if(synth.paused)synth.resume();synth.speak(utterance);
 }
 function setRate(value,persist=true){
  const next=Number(value);if(!rates.includes(next)){sync();return;}if(next===rate){sync();return;}
  rate=next;if(persist)try{localStorage.setItem(KEY,String(rate));}catch(e){}sync();
  // Web Speech applies rate at utterance start, so replace the current read with a fresh utterance.
  if(current){const previous=current,u=new SpeechSynthesisUtterance(previous.text);for(const key of ['lang','voice','pitch','volume','onend','onerror'])if(previous[key]!=null)u[key]=previous[key];speak(u);}
 }
 function placeControls(){
  const bar=document.getElementById('reading-voice-bar'),screen=document.getElementById('reading-screen'),listen=document.getElementById('listen');if(!bar||!screen)return;
  const visible=listen&&listen.parentElement&&!listen.closest('[hidden]');
  if(visible){let stack=listen.parentElement;if(!stack.classList.contains('reading-listen-stack')){const parent=stack;stack=document.createElement('div');stack.className='reading-listen-stack';parent.insertBefore(stack,listen);stack.append(listen);}if(bar.parentElement!==stack)stack.append(bar);bar.dataset.placement='listen';bar.dataset.localStop=String(Boolean(document.getElementById('stop')||document.getElementById('stopSpeaking')));screen.style.top='0px';}
  else{if(document.body&&bar.parentElement!==document.body)document.body.insertBefore(bar,screen);bar.dataset.placement='page';screen.style.top='52px';}
 }
 function fit(){
  pendingFit=false;const screen=document.getElementById('reading-screen'),page=document.getElementById('reading-page');if(!screen||!page)return;
  page.style.transform='none';page.style.left='0';
  const offset=document.getElementById('reading-voice-bar')?.dataset.placement==='listen'?0:52;
  const available=screen.clientHeight||Math.max(1,window.innerHeight-offset),width=screen.clientWidth||window.innerWidth;
  page.style.setProperty('--reading-height',available+'px');
  const height=Math.max(page.scrollHeight||0,page.getBoundingClientRect().height||0,1),rawWidth=Math.max(page.scrollWidth||0,width,1),scale=Math.min(1,available/height,width/rawWidth);
  page.style.transform=scale<.999?'scale('+scale+')':'none';page.style.left=(width-rawWidth*scale)/2+'px';page.dataset.voiceFit=String(scale);
 }
 function requestFit(){if(pendingFit||!ready)return;pendingFit=true;requestAnimationFrame(fit);}
 function init(){
  ready=true;sync();placeControls();const select=document.getElementById('reading-voice-speed'),stop=document.getElementById('reading-voice-stop');
  if(select)select.onchange=()=>setRate(select.value);
  if(stop)stop.onclick=()=>{cancel();const status=document.getElementById('reading-voice-status');if(status)status.textContent='Voice stopped.';};
  const page=document.getElementById('reading-page');if(page&&'MutationObserver'in window)new window.MutationObserver(()=>{placeControls();requestFit();}).observe(page,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open']});
  if(page&&'ResizeObserver'in window)new window.ResizeObserver(requestFit).observe(page);
  if(document.fonts?.ready)document.fonts.ready.then(requestFit);
  requestFit();
 }
 window.ReadingVoice={speak,cancel,setRate,getRate:()=>rate,fit:requestFit,placeControls};
 window.addEventListener('pagehide',cancel);window.addEventListener('beforeunload',cancel);window.addEventListener('resize',requestFit);window.addEventListener('load',requestFit);
 window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue)setRate(event.newValue,false);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 document.addEventListener('click',event=>{if(event.target.closest?.('[data-level],[data-mode],#next,#prev,#previous,#next-date,#next-choices,#mix,#shuffle-activities,#home,#object-badge,#retry,#reset-question,#reset-all,#reset'))cancel();},true);
 document.addEventListener('change',event=>{if(['theme','unit-select'].includes(event.target.id))cancel();},true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
