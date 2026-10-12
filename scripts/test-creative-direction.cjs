const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(name){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.resolve(name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,URL,Date});return module.exports;}
const {directionReview}=load('src/utils/creativeDirection.ts');
const {calculatePerformance,itemKeys}=load('src/utils/creativePerformance.ts');
const record=(direction,scores)=>JSON.stringify({schema:'direction-v1',direction,scores});
assert.equal(directionReview({month:'2026-09'}).direction,'Old');
assert.equal(directionReview({month:'2026-10',creativeScore:99,reviewStatus:'Reviewed',reviewer:'Reviewer'}).score,null);
assert.equal(directionReview({month:'2026-10'}).direction,'Unassigned');
assert.equal(directionReview({month:'2026-10',reviewBasis:record('New',[0,0,0,0,0,0,0]),reviewer:'Reviewer'}).score,0);
assert.equal(directionReview({month:'2026-10',reviewBasis:record('New',[100,100,100,100,100,100,100]),reviewer:'Reviewer'}).score,100);
assert.equal(directionReview({month:'2026-10',reviewBasis:record('Transition',[100,0,0,0,0,0,0]),reviewer:'Reviewer'}).score,20);
assert.equal(directionReview({month:'2026-10',reviewBasis:record('New',[100,null,100,100,100,100,100]),reviewer:'Reviewer'}).score,null);
assert.equal(directionReview({month:'2026-10',reviewBasis:record('New',[100,100,100,100,100,100,101]),reviewer:'Reviewer'}).score,null);
assert.equal(directionReview({month:'2026-10',reviewBasis:record('New',[100,100,100,100,100,100,100])}).score,null);
const old=directionReview({month:'2026-10',reviewBasis:record('Old'),reviewStatus:'Reviewed',reviewer:'Reviewer',creativeScore:80,scores:{hook:4}});
assert.equal(old.score,80);assert.equal(old.components.find(c=>c.key==='hook').score,80);
const base={month:'2026-10',platform:'Facebook',format:'Static post',spendType:'Organic',date:'01/10/2026 12:00',shares:0,saves:0,views:100,reach:100};
const organic=[1,2,3].map(n=>({...base,id:'organic'+n,engagementRate:n/100,interactions:n}));
const scored=calculatePerformance([...organic,{...base,id:'paid',spendType:'Paid',views:1000000,engagementRate:1,performanceScore:100}], '2026-10');
assert.equal(scored[0].analysis.peerCount,3);assert.equal(scored[3].analysis.peerCount,1);assert.equal(scored[3].performanceScore,null);
assert(scored[0].analysis.components.some(c=>c.label==='Shares & saves'));
assert.equal(calculatePerformance([{...base,performanceScore:90}], '2026-10')[0].performanceScore,null);
assert.equal(calculatePerformance(organic.map(r=>({...r,date:new Date().toISOString().slice(0,10)})), '2026-10')[0].analysis.mature,false);
assert.notEqual(itemKeys({url:'https://youtube.com/watch?v=AbCd'})[0],itemKeys({url:'https://youtube.com/watch?v=abcd'})[0]);
assert.equal(itemKeys({url:'https://youtube.com/watch?v=AbCd'})[0],itemKeys({url:'https://youtu.be/AbCd'})[0]);
console.log('PASS: explicit October classification, separate rubrics, numeric zero, complete reviewed scores, paid/organic isolation, peer minimum, provisional age and YouTube identity.');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const fixture=Array.from({length:6},(_,i)=>({...base,id:'fixture-'+i,name:'Synthetic creative '+i,url:'https://example.com/post/'+i,previewUrl:'https://example.com/preview.png',reviewer:'Reviewer',reviewStatus:'Reviewed',creativeScore:80,scores:{idea:4,hook:4,script:4,design:4,brandConsistency:4,cta:4},reviewBasis:record(i<3?'Old':'New',i<3?undefined:[80,80,80,80,80,80,80]),engagementRate:(i+1)/100,interactions:i+1,views:100+i}));
const cache=new Map();
function loadComponent(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const input=fs.readFileSync(file,'utf8').replaceAll('import.meta.env.BASE_URL','"/"');const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,URL,Date,require:name=>{
if(name.endsWith('/useDecisionLive'))return {useDecisionLive:()=>({data:{currentMonth:'2026-10',data:{creative:fixture,content:fixture,video:[]}},isLive:true})};
if(name.endsWith('/FilterContext'))return {useFilters:()=>({month:'2026-10',platform:'All',pillar:'All',format:'All',spendType:'All'})};
if(!name.startsWith('.'))return require(name);const target=path.resolve(path.dirname(file),name);return loadComponent(target+(fs.existsSync(target+'.tsx')?'.tsx':'.ts'));}});return module.exports;}
const page=loadComponent('src/pages/CreativeLab.tsx').default;
const html=renderToStaticMarkup(React.createElement(page));
assert(html.includes('creative-direction-summary.svg'));assert(html.includes('Direction execution'));assert(html.includes('Old × New'));
assert(!/Working hypothesis|Recommended change|Next test|CreativeRadar|Strength|N\/A/.test(html));
assert(html.includes('80'));assert(html.includes('6 peers'));
console.log('PASS: compact creative UI, source image + fixed direction image, numerical rubric, separate performance and comparable Old/New table.');
