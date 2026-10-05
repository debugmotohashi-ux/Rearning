const fs=require('fs'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname;
(async()=>{
const server=http.createServer((req,res)=>{let url=req.url.split('?')[0];if(url==='/')url='/index.html';try{res.setHeader('Content-Type',url.endsWith('.js')?'application/javascript':url.endsWith('.css')?'text/css':url.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(root+url));}catch{res.statusCode=404;res.end();}}).listen(8766,'127.0.0.1');
const b=await chromium.launch({executablePath:'/tmp/rearning-chromium',headless:true,args:['--no-sandbox','--single-process','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const password=fs.readFileSync(root+'/index.html','utf8').match(/APP_PASSWORD\s*=\s*["']([^"']+)/)[1];
await p.goto('http://127.0.0.1:8766');await p.locator('#gate-input').fill(password);await p.locator('#gate-btn').click();
assert.match(await p.locator('#view').innerText(),/今日は、ここから。/);
assert.equal(await p.locator('[data-ux-lesson]').count(),7);
assert.equal(await p.locator('#appbar [aria-current=page]').count(),1);
await p.screenshot({path:root+'/docs/ux-home-mobile.png',fullPage:true});
await p.setViewportSize({width:1194,height:834});await p.screenshot({path:root+'/docs/ux-home-preview.png'});await p.setViewportSize({width:390,height:844});
await p.getByRole('button',{name:'この教材から始める',exact:true}).click();await p.waitForTimeout(100);
assert.equal(await p.locator('#ux-lesson-title').innerText(),'au・UQの料金プラン');
assert.equal(await p.locator('#nav button').count(),9);
await p.locator('.card .head').first().focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.card .head').first().getAttribute('aria-expanded'),'true');
await p.getByRole('button',{name:'ホームへ戻る',exact:false}).click();
assert.match(await p.locator('#view').innerText(),/前回の教材から再開/);
assert.match(await p.locator('.ux-hero').innerText(),/セット割/);
await p.getByRole('button',{name:'教材',exact:true}).click();
assert.equal(await p.locator('#ux-results [data-ux-lesson]').count(),19);
await p.getByRole('searchbox').fill('auひかり');assert.equal(await p.locator('#ux-results [data-ux-lesson]').count(),1);
await p.locator('#ux-results [data-ux-lesson]').click();await p.waitForTimeout(100);
assert.equal(await p.locator('#ux-lesson-title').innerText(),'光回線・ホームルーター');
assert.equal(await p.locator('.hp-card').count(),8);
await p.getByRole('button',{name:'料金を見る',exact:true}).click();assert(await p.locator('#hp-prices').evaluate(e=>e.open));
await p.getByRole('button',{name:'教材一覧へ戻る',exact:false}).click();assert.equal(await p.getByRole('searchbox').inputValue(),'auひかり');
await p.getByRole('searchbox').fill('見つからないxyz');assert.match(await p.locator('#ux-results').innerText(),/見つかりません/);
await p.getByRole('button',{name:'検索と分類をリセット'}).click();assert.equal(await p.locator('#ux-results [data-ux-lesson]').count(),19);
await p.getByRole('button',{name:'商材',exact:true}).click();assert.equal(await p.locator('#ux-results [data-ux-lesson]').count(),6);
await p.getByRole('button',{name:'すべて',exact:true}).click();
const all=await p.locator('#ux-results [data-ux-lesson]').evaluateAll(es=>es.map(e=>[e.dataset.uxLesson,e.dataset.uxTab]));
for(const [ch,tab]of all){
 await p.locator(`#ux-results [data-ux-lesson="${ch}"][data-ux-tab="${tab}"]`).click();await p.waitForTimeout(40);
 assert(await p.locator(`#lessonWrap main section#${tab}`).evaluate(e=>e.classList.contains('on')),ch+':'+tab);
 const widths=[390,768,1194];for(const width of widths){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+ch+':'+tab+' '+width);}
 await p.getByRole('button',{name:'教材一覧へ戻る',exact:false}).click();
}
await p.setViewportSize({width:1194,height:834});await p.screenshot({path:root+'/docs/ux-library-ipad.png',fullPage:true});
for(const name of ['ホーム','教材','テスト','実績','学習記録']){
 await p.locator('#appbar').getByRole('button',{name,exact:true}).click();
 for(const width of [390,768,1194]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'shell overflow '+name+' '+width);}
 assert.equal(await p.locator('#appbar [aria-current=page]').count(),1);
}
await p.getByRole('button',{name:'実績',exact:true}).click();assert(await p.getByText('プランの自社・初級で20問全問正解',{exact:true}).isVisible());
await p.getByRole('button',{name:'学習記録',exact:true}).click();assert(!/一人前/.test(await p.locator('#view').innerText()));
await p.locator('#appbar').getByRole('button',{name:'テスト',exact:true}).click();await p.locator('[data-ux-lesson="ch6"][data-ux-tab="quiz"]').click();await p.waitForTimeout(60);
await p.locator('#quizarea [data-go="own"]').click();await p.locator('#quizarea [data-k="beginner"]').click();assert.equal(await p.locator('#opts .opt').count(),4);
await p.locator('#opts .opt').first().click();await p.locator('#next').click();assert(await p.locator('#fb').isVisible());
p.once('dialog',d=>{assert.match(d.message(),/途中の回答は保存されません/);d.dismiss();});await p.getByRole('button',{name:'ホーム',exact:true}).click();assert.equal(await p.locator('#opts .opt').count(),4);
p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'ホーム',exact:true}).click();assert.match(await p.locator('#view').innerText(),/今日は、ここから。/);
// Finish the service quiz and exercise results/retry and trophy modal keyboard.
await p.locator('#appbar [data-view=test]').click();await p.locator('[data-ux-lesson=ch7][data-ux-tab=quiz]').click();await p.waitForTimeout(60);
await p.locator('#quizarea [data-go=own]').click();await p.locator('#quizarea [data-k=beginner]').click();
for(let i=0;i<20;i++){await p.locator('#opts .opt').first().click();await p.locator('#next').click();assert(await p.locator('#fb').isVisible());await p.locator('#next').click();}
assert(await p.locator('#quizarea .qwrap.result').isVisible());
await p.locator('#appbar [data-view=trophy]').click();await p.locator('[data-trophy=h-start]').click();assert(await p.getByRole('dialog',{name:'獲得した実績'}).isVisible());await p.keyboard.press('Escape');assert.equal(await p.locator('#trophyModal').isVisible(),false);
await p.locator('#appbar [data-view=home]').click();
// Preserve a known legacy record across reload. UI actions never rewrite it.
const snapshots=await p.evaluate(()=>{const v={rg67_stats_v1:JSON.stringify({ch6:{'fixture':{c:9,w:2}}}),rg67_review_v1:JSON.stringify({ch6:{sample:{s:1,due:'2099-01-01'}}})};for(const[k,x]of Object.entries(v))localStorage.setItem(k,x);return v;});
await p.reload();assert.equal(await p.locator('#gate').isVisible(),false);
for(const[k,v]of Object.entries(snapshots))assert.equal(await p.evaluate(k=>localStorage.getItem(k),k),v);
assert.match(await p.locator('#view').innerText(),/前回の教材から再開/);
await p.setViewportSize({width:1194,height:834});await p.screenshot({path:root+'/docs/ux-home-ipad.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS: first-use guide, next step, real resume, search/filter/reset, all 19 lesson tabs, all five app screens, 390/768/1194px, keyboard accordion, legacy hikari, test answer + leave cancel/accept, persistent records, zero page errors');
await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
