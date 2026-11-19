(function(){'use strict';
var routes={
'/materials/network/':{id:'network-intro',next:'/materials/api/',title:'API入門',desc:'ネットワークの先で、Webサービスがデータをやり取りする仕組みへ'},
'/materials/api/':{id:'api-intro',next:'/materials/html-javascript/',title:'HTML・JavaScript入門',desc:'APIで取得するデータを、Web画面で扱う第一歩へ'},
'/materials/html-javascript/':{id:'html-javascript-intro',next:'/materials/security/',title:'Webセキュリティ入門',desc:'作ったWeb画面を安全に使うための基本を学ぼう'},
'/materials/security/':{id:'security-intro',next:'/materials/sql/',title:'SQL・データベース入門',desc:'データを安全に扱うため、検索と集計の基本へ'},
'/materials/sql/':{id:'sql-intro',next:'/materials/sql/training-demo/',title:'SQL無料体験3問',desc:'学んだSELECTや集計を、ブラウザで実際に試そう'},
'/materials/sql/training-demo/':{id:'sql-demo',next:'/materials/sql/',title:'SQL入門を復習',desc:'SQLの基本をもう一度確認したいときはこちら'}
};
var path=location.pathname.replace(/index\.html$/,'');if(!path.endsWith('/'))path+='/';
var item=routes[path];if(!item)return;
function link(href,title,desc,primary){var a=document.createElement('a');a.href=href;a.className='itz-next-link'+(primary?' itz-next-primary':'');var strong=document.createElement('strong');strong.textContent=title;var small=document.createElement('span');small.textContent=desc;a.append(strong,small);a.addEventListener('click',function(){if(window.itzukanAnalyticsOptOut||window['ga-disable-G-J0PDHL2KZL'])return;if(typeof window.gtag==='function')window.gtag('event','material_next_click',{material_id:item.id,destination_path:href});});return a;}
var section=document.createElement('section');section.className='itz-next';section.setAttribute('aria-label','次に学ぶ教材');
var heading=document.createElement('h2');heading.textContent='🚀 次に学ぶなら';section.append(heading);
var intro=document.createElement('p');intro.textContent='ここまでお疲れさま！興味のあるテーマから、次の一歩に進めます。';section.append(intro);
var grid=document.createElement('div');grid.className='itz-next-grid';
grid.append(link(item.next,item.title,item.desc,true));
if(path!=='/materials/sql/'&&path!=='/materials/sql/training-demo/')grid.append(link('/materials/sql/training-demo/','SQL無料体験3問','インストール不要。JOIN・集計などの実務問題に挑戦'));
grid.append(link('/materials/','無料教材一覧','ほかのテーマから自由に選ぶ'));
section.append(grid);
var style=document.createElement('style');style.textContent='.itz-next{max-width:960px;margin:36px auto 28px;padding:clamp(20px,4vw,30px);background:#142239;border:1px solid #334761;border-radius:16px;color:#f8fafc;font:inherit}.itz-next h2{margin:0 0 8px;color:#f8fafc;font-size:clamp(1.25rem,3vw,1.6rem)}.itz-next>p{color:#cbd5e1;margin:0 0 18px}.itz-next-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}.itz-next-link{display:flex;flex-direction:column;gap:6px;padding:16px;border:1px solid #446078;border-radius:12px;background:#0b192d;color:#e2e8f0!important;text-decoration:none!important;line-height:1.5;transition:border-color .15s,transform .15s}.itz-next-link strong{color:#67e8f9;font-size:1rem}.itz-next-link span{font-size:.88rem;color:#cbd5e1}.itz-next-link:hover{border-color:#67e8f9;transform:translateY(-2px)}.itz-next-link:focus-visible{outline:3px solid #ffa755;outline-offset:3px}.itz-next-primary{border-color:#0891b2;background:#123348}@media print{.itz-next{display:none!important}}';document.head.append(style);
var main=document.querySelector('main')||document.body;var footer=main.querySelector('footer');if(footer)main.insertBefore(section,footer);else main.append(section);
})();