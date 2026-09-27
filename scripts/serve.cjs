const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain'})[path.extname(file)]+'; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log('AVDF simulator: http://127.0.0.1:'+port));
