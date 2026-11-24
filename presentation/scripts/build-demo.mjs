import{build}from'esbuild';import{createHash}from'node:crypto';import{readFile,writeFile,mkdir,cp}from'node:fs/promises';
const result=await build({entryPoints:['portal/main.tsx'],bundle:true,minify:true,write:false,outfile:'portal.js',format:'iife',platform:'browser',target:'es2022',jsx:'automatic',loader:{'.woff2':'dataurl','.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;

await mkdir('pages',{recursive:true});
// GitHub Pages: cacheable, fingerprinted ESM chunks instead of an inlined mega-HTML.
// Keep the private Worker artifact unchanged (it still receives the IIFE above).
const publicBuild=await build({
 plugins:[{name:'document-relative-images',setup(builder){
  builder.onLoad({filter:/\.png$/},async({path})=>{
   const bytes=await readFile(path),name=path.split('/').pop().replace(/\.png$/,'')+'-'+createHash('sha256').update(bytes).digest('hex').slice(0,12)+'.png';
   await mkdir('pages/assets/media',{recursive:true});
   await writeFile('pages/assets/media/'+name,bytes);
   // Image src resolves against the document, unlike an ESM import.
   return{loader:'js',contents:'export default new URL('+JSON.stringify('./assets/media/'+name)+',document.baseURI).href;'};
  });
 }}],
 entryPoints:['portal/main.tsx'],bundle:true,minify:true,write:true,
 outdir:'pages',entryNames:'assets/[name]-[hash]',chunkNames:'assets/chunks/[name]-[hash]',assetNames:'assets/media/[name]-[hash]',
 format:'esm',splitting:true,platform:'browser',target:'es2022',jsx:'automatic',metafile:true,
 // Logo URLs are used by DOM images on nested Pages routes.
 loader:{'.woff2':'file','.png':'file'},
 define:{'process.env.NODE_ENV':'"production"'}
});
const publicEntry=Object.entries(publicBuild.metafile.outputs).find(([,meta])=>meta.entryPoint==='portal/main.tsx');
if(!publicEntry)throw Error('Public entry chunk not generated');
const publicHref=(path)=>'./'+path.replace('pages/','');
const publicJsHref=publicHref(publicEntry[0]);
const publicCssHref=publicEntry[1].cssBundle?publicHref(publicEntry[1].cssBundle):null;
if(!publicCssHref)throw Error('Public CSS bundle not generated');
console.log('Cacheable public assets:',publicJsHref,publicCssHref);
// Flatten the initial ESM dependency waterfall. Dynamic routes stay deferred.
const initialModules=new Set();
function collectModules(path){
 for(const item of publicBuild.metafile.outputs[path]?.imports??[]){
  if(item.kind!=='import-statement'||initialModules.has(item.path))continue;
  initialModules.add(item.path);collectModules(item.path);
 }
}
collectModules(publicEntry[0]);
const moduleHints=[...initialModules].filter(path=>publicBuild.metafile.outputs[path]?.bytes>0).map(path=>'<link rel="modulepreload" href="'+publicHref(path)+'">').join('');


const snapshot=true;
const demoConfig=JSON.parse(await readFile('pages-config.json','utf8'));
function html(mode){
 const cfg=mode==='public'?{...demoConfig,mode,adminUrl:'',snapshotPath:'./nama-demo.json',feedbackEnabled:true,demoManagement:true}:{mode,adminUrl:'/login'};
 const styles=mode==='public'?moduleHints+(snapshot?'<link rel="preload" href="./nama-demo.json" as="fetch" type="application/json" crossorigin>':'')+'<link rel="stylesheet" href="'+publicCssHref+'">':'<style>'+css+'</style>';
 const scripts=mode==='public'?'<script type="module" src="'+publicJsHref+'"></script>':'<script>'+js+'</script>';
 return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#bd2739"><title>نما | مدیریت سازمان و عملکرد</title>'+styles+'</head><body><div id="app"></div><script>window.__ORGDEMO_HASH_ROUTING__='+(mode==='public')+';window.__PORTAL_CONFIG__='+JSON.stringify(cfg)+';</script>'+scripts+'</body></html>';
}
const ico=await readFile('portal/assets/favicon.ico'),svg=await readFile('portal/assets/favicon.svg','utf8'),apple=await readFile('portal/assets/apple-touch-icon.png');const version=createHash('sha256').update(ico).digest('hex').slice(0,8);
function icons(mode){const base=mode==='public'?'./':'/';return '<link rel=\"icon\" type=\"image/svg+xml\" href=\"'+base+'favicon.svg?v='+version+'\"><link rel=\"icon\" type=\"image/x-icon\" href=\"'+base+'favicon.ico?v='+version+'\"><link rel=\"apple-touch-icon\" href=\"'+base+'apple-touch-icon.png?v='+version+'\">';}
const privateHtml=html('private').replace('</head>',icons('private')+'</head>'),publicHtml=html('public').replace('</head>',icons('public')+'</head>');const source=(await readFile('worker/index.js','utf8')).replace("'__PORTAL_HTML__'",()=>JSON.stringify(privateHtml)).replace("'__FAVICON_ICO__'",()=>JSON.stringify(ico.toString('base64'))).replace("'__FAVICON_SVG__'",()=>JSON.stringify(svg)).replace("'__APPLE_ICON__'",()=>JSON.stringify(apple.toString('base64')));await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',source);
await mkdir('pages',{recursive:true});
await writeFile('pages/index.html',publicHtml);
await writeFile('pages/.nojekyll','');
for(const file of ['favicon.svg','favicon.ico','apple-touch-icon.png']) await cp('portal/assets/'+file,'pages/'+file);
await cp('portal/assets/OFL.txt','pages/FONT-LICENSE.txt');
await cp('data/nama-demo.json','pages/nama-demo.json');
await import('./build-licenses.mjs');
