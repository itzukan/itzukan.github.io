(function(){
'use strict';
var m=location.pathname.match(/^\/materials\/(network|api|sql|security|html-javascript)\//);
if(!m)return;
var demo=m[1]==='sql'&&location.pathname.includes('/training-demo/');
var material_id=demo?'sql-demo':m[1]+'-intro';
function emit(name,extra){if(typeof gtag==='function')gtag('event',name,Object.assign({material_id:material_id},extra||{}));}
var box=document.createElement('section');box.setAttribute('aria-label','教材のフィードバック');
box.style.cssText='max-width:760px;margin:32px auto;padding:24px;background:#142239;color:#f8fafc;border:1px solid #334761;border-radius:16px;font:16px/1.7 system-ui,sans-serif';
var h=document.createElement('h2');h.textContent='教材の感想を教えてください';box.append(h);
var p=document.createElement('p');p.textContent='匿名・2問だけ。教材の改善に使います。';box.append(p);
if(!demo){
var practice=document.createElement('button');practice.type='button';practice.textContent='実際に試せた（自己申告）';practice.style.cssText='padding:12px;background:#155e75;color:white;border:1px solid #67e8f9;border-radius:10px;cursor:pointer';
practice.onclick=function(){emit('material_practice_complete',{completion_type:'self_report'});practice.disabled=true;practice.textContent='実践完了を記録しました';};box.append(practice);
}
var form=document.createElement('form');
function question(title,name,choices){var field=document.createElement('fieldset');field.style.cssText='border:0;padding:8px 0';var legend=document.createElement('legend');legend.textContent=title;field.append(legend);choices.forEach(function(c){var label=document.createElement('label');label.style.cssText='display:block;margin:7px 0';var input=document.createElement('input');input.type='radio';input.name=name;input.value=c[0];input.required=true;label.append(input,document.createTextNode(' '+c[1]));field.append(label);});form.append(field);}
question('役に立ちましたか？','helpfulness',[['helpful','役に立った'],['neutral','普通'],['not_helpful','役に立たなかった']]);
question('難易度はどうでしたか？','difficulty',[['easy','簡単すぎた'],['just_right','ちょうどよかった'],['hard','難しかった']]);
var submit=document.createElement('button');submit.type='submit';submit.textContent='匿名で回答する';submit.style.cssText='padding:12px 20px;background:#0891b2;color:white;border:0;border-radius:10px;cursor:pointer';form.append(submit);
var privacy=document.createElement('p');privacy.textContent='名前・メールアドレス・SQL入力内容は送信しません。';privacy.style.fontSize='13px';form.append(privacy);box.append(form);
form.onsubmit=function(e){e.preventDefault();var f=new FormData(form),help=f.get('helpfulness'),diff=f.get('difficulty');if(!['helpful','neutral','not_helpful'].includes(help)||!['easy','just_right','hard'].includes(diff))return;emit('feedback_submit',{helpfulness:help,difficulty:diff});form.textContent='回答ありがとうございました！';};
(document.querySelector('main')||document.body).append(box);
if(demo){box.hidden=true;try{var done=JSON.parse(localStorage.getItem('itzukan-sql-course-preview-completed-v1')||'[]');box.hidden=![8,11,14].every(function(n){return done.includes(n);});}catch(e){}}
window.addEventListener('itzukan:learning',function(e){var d=e.detail||{};if(!demo||!['sql_run','sql_correct','sql_demo_complete'].includes(d.name)||![8,11,14].includes(Number(d.mission_id)))return;emit(d.name,{mission_id:Number(d.mission_id)});if(d.name==='sql_demo_complete')box.hidden=false;});
})();