/* IT図鑑 SQL Playground — SQLite runs only inside this worker. */
'use strict';
const CDN='https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/';
const MAX_ROWS=200;
let SQL=null, db=null;
function reset(){
  if(db)db.close();
  db=new SQL.Database();
  db.run("CREATE TABLE sales (id INTEGER PRIMARY KEY, product TEXT NOT NULL, quantity INTEGER NOT NULL, amount INTEGER NOT NULL); INSERT INTO sales (id,product,quantity,amount) VALUES (1,'りんご',2,300),(2,'みかん',3,450),(3,'りんご',1,150);");
  db.run('PRAGMA query_only = ON');
}
function execute(sql){
  const stmt=db.prepare(sql), columns=stmt.getColumnNames(), values=[];
  try{
    while(stmt.step()){
      if(values.length>=MAX_ROWS)throw new Error('結果が200行を超えました。WHEREで絞り込んでください。');
      values.push(stmt.get());
    }
  }finally{stmt.free();}
  return {columns,values};
}
self.onmessage=async function(event){
  const {id,type,sql}=event.data||{};
  try{
    if(type==='init'){
      importScripts(CDN+'sql-wasm.js');
      SQL=await initSqlJs({locateFile:file=>CDN+file});
      reset();self.postMessage({id,ok:true,type:'ready'});return;
    }
    if(!db)throw new Error('SQLiteが準備できていません。');
    if(type==='reset'){reset();self.postMessage({id,ok:true,type:'reset'});return;}
    if(type==='run'){
      if(typeof sql!=='string'||!sql.trim())throw new Error('SQLを入力してください。');
      if(sql.length>5000)throw new Error('SQLは5000文字以内で入力してください。');
      const result=execute(sql);
      self.postMessage({id,ok:true,type:'result',result});return;
    }
    throw new Error('不明な操作です。');
  }catch(e){self.postMessage({id,ok:false,error:String(e&&e.message||e)});}
};