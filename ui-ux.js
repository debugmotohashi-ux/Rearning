/* UI-only extension. Existing quiz, authentication and trophy stores stay intact. */
(function () {
  'use strict';
  var KEY='rg67_ui_navigation_v1';
  var state={opened:{},last:null};
  try { var saved=JSON.parse(localStorage.getItem(KEY)); if(saved&&typeof saved==='object') { state.opened=saved.opened&&typeof saved.opened==='object'?saved.opened:{}; state.last=saved.last||null; } } catch(e) {}
  var lessons=[
    {ch:'ch6',tab:'plans',title:'au・UQの料金プラン',desc:'データ容量と基本料金を確認する。',group:'プラン',tags:'スマホ UQ au コミコミ トクトク マネ活',guide:true},
    {ch:'ch6',tab:'groups',title:'セット割・家族の割引',desc:'どの条件で割引が使えるかを確認する。',group:'プラン',tags:'家族 自宅 セット スマートバリュー',guide:true},
    {ch:'ch6',tab:'call',title:'通話オプション',desc:'通話時間に合うオプションを確認する。',group:'プラン',tags:'電話 かけ放題 10分 5分',guide:true},
    {ch:'ch7',tab:'ov',title:'商材提案の基本',desc:'何を売るかの前に、何を聞くかを知る。',group:'商材',tags:'経済圏 ヒアリング 聞き取り',guide:true},
    {ch:'ch7',tab:'netbase',title:'インターネットの基礎',desc:'光回線とプロバイダ、申込方法の違いを知る。',group:'商材',tags:'新規 転用 事業者変更 回線',guide:true},
    {ch:'ch7',tab:'net',title:'光回線・ホームルーター',desc:'auひかりプラス・BIGLOBE光・J:COM・WiMAX。',group:'商材',tags:'ネット wifi wi-fi auひかり プラス ワイヤレス',guide:true},
    {ch:'ch7',tab:'card',title:'au PAYカード',desc:'一般・ゴールドの違いと提案条件。',group:'商材',tags:'クレジット ポイント 還元 年会費'},
    {ch:'ch7',tab:'energy',title:'auでんき・ガス',desc:'対象条件とポイントを確認する。',group:'商材',tags:'電気 北海道 ほくでん'},
    {ch:'ch7',tab:'bank',title:'auじぶん銀行',desc:'紹介時の注意点を確認する。',group:'商材',tags:'銀行 コンプライアンス'},
    {ch:'ch6',tab:'svc',title:'スマホの付帯サービス',desc:'Pontaパスなど、プランと一緒に確認する。',group:'プラン',tags:'サービス オプション サポート'},
    {ch:'ch6',tab:'others',title:'他社の料金プラン',desc:'ドコモ・SoftBank・楽天などを比較する。',group:'他社比較',tags:'docomo ドコモ ahamo ソフトバンク 楽天 ワイモバイル'},
    {ch:'ch7',tab:'ocard',title:'他社のクレジットカード',desc:'楽天・PayPay・dカードの違い。',group:'他社比較',tags:'他社 クレカ ポイント'},
    {ch:'ch7',tab:'oenergy',title:'他社のでんき',desc:'経済圏と条件を整理して比較する。',group:'他社比較',tags:'電気 楽天 ドコモ ソフトバンク'},
    {ch:'ch6',tab:'terms',title:'プランの用語集',desc:'分からない言葉を調べる。',group:'用語・過去',tags:'単語 辞書 ギガ GB MNP SIM'},
    {ch:'ch7',tab:'terms',title:'商材の用語集',desc:'商材やネットの言葉を調べる。',group:'用語・過去',tags:'単語 辞書 光 クレジット'},
    {ch:'ch6',tab:'past',title:'受付終了した料金プラン',desc:'お客様が利用中の過去プランを確認する。',group:'用語・過去',tags:'旧 過去 くりこし ミニミニ ピタット'},
    {ch:'ch6',tab:'hist',title:'料金プランの変遷',desc:'旧プランから今のプランへの流れ。',group:'用語・過去',tags:'歴史 過去 変更'},
    {ch:'ch6',tab:'quiz',title:'プランの確認テスト',desc:'自社・他社は各20問。クローザー編は30問。',group:'テスト',tags:'初級 中級 上級 復習 弱点'},
    {ch:'ch7',tab:'quiz',title:'商材の確認テスト',desc:'自社・他社は各20問。クローザー編は30問。',group:'テスト',tags:'初級 中級 上級 復習 弱点'}
  ];
  var guide=lessons.filter(function(x){return x.guide;});
  var origin='learn',filter='すべて',query='';
  var oldGo=App.go,oldOpen=App.openLesson,oldTrophy=App.renderTrophy;
  var bodyObserver=null;
  var modalOpener=null;
  function escape(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function id(x){return x.ch+':'+x.tab;}
  function find(ch,tab){return lessons.find(function(x){return x.ch===ch&&x.tab===tab;});}
  function last(){return state.last&&find(state.last.ch,state.last.tab);}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  function record(x){if(!x||x.tab==='quiz')return; state.opened[id(x)]=true;state.last={ch:x.ch,tab:x.tab};save();}
  function attrs(x){return 'data-ux-lesson="'+x.ch+'" data-ux-tab="'+x.tab+'"';}
  function button(label,attributes,primary){return '<button type="button" class="ux-btn'+(primary?' primary':'')+'" '+attributes+'>'+label+'</button>';}
  function row(x,num){return '<button type="button" class="ux-row" '+attrs(x)+'>'+(num?'<span class="ux-number">'+num+'</span>':'')+'<span class="ux-row-main"><strong>'+x.title+(state.opened[id(x)]?'<span class="ux-mark">開いた</span>':'')+'</strong><small>'+x.desc+'</small></span><span class="ux-arrow" aria-hidden="true">›</span></button>';}
  function tile(title,desc,attributes){return '<button type="button" class="ux-tile" '+attributes+'><strong>'+title+'</strong><span>'+desc+'</span></button>';}
  function page(title,desc,body){return '<div class="ux-page"><h1 tabindex="-1">'+title+'</h1><p class="ux-intro">'+desc+'</p>'+body+'</div>';}
  function active(view){document.querySelectorAll('#appbar button').forEach(function(b){var on=b.dataset.view===view;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
  function inQuiz(){return !!document.querySelector('#quizarea .qwrap:not(.result) .opts');}
  function canLeave(){return !inQuiz()||window.confirm('テストを離れると、今回の途中の回答は保存されません。獲得済みの実績と、これまでの学習記録は残ります。移動しますか？');}
  function focusPage(){var h=document.querySelector('#view h1');if(h)h.focus({preventScroll:true});window.scrollTo(0,0);}
  function home(v){
    var next=guide.find(function(x){return !state.opened[id(x)];}),resume=last();
    var lead=next||find('ch6','quiz');
    var body='<section class="ux-section" style="margin-top:0"><div class="ux-hero"><div class="ux-kicker">'+(next?'新人さんの学習ガイド':'教材を開いたら、理解を確認')+'</div><h2>'+lead.title+'</h2><p>'+lead.desc+'<br>'+(next?'まず教材を読み、分からないことを確認してからテストへ進みましょう。':'ガイドの6教材を開きました。テストで理解度を確認しましょう。')+'</p>'+button(next?'この教材から始める':'プランのテストを選ぶ',attrs(lead),true)+'<div class="ux-note">'+(next?'学ぶ順番は下の「新人の学習順」で確認できます。':'「開いた」は閲覧の目印です。理解・合格を意味しません。')+'</div></div></section>';
    if(resume)body+='<section class="ux-section"><h2>前回の教材から再開</h2>'+row(resume)+'</section>';
    body+='<section class="ux-section"><div class="ux-section-head"><h2>新人の学習順</h2>'+button('全教材を見る','data-ux-view="learn"')+'</div><p class="ux-note">1つずつ読む → 不明点を確認する → テストで振り返る。</p>'+guide.map(function(x,i){return row(x,i+1);}).join('')+'<p class="ux-note">「開いた」は閲覧の目印です。テスト合格とは別です。</p></section>';
    body+='<section class="ux-section"><h2>目的から選ぶ</h2><div class="ux-grid">'+tile('教材を探す','プラン名・商材名・用語で検索。','data-ux-view="learn"')+tile('テスト・復習','教材を読んだ後の理解度確認。','data-ux-view="test"')+tile('合格実績を見る','獲得条件と次の目標を確認。','data-ux-view="trophy"')+'</div></section>';
    v.innerHTML=page('今日は、ここから。','学ぶ順番と、必要な教材への入口をまとめました。',body);
  }
  function normalized(s){return String(s).normalize('NFKC').toLowerCase().replace(/[\s・ー−-]/g,'');}
  function results(){
    var dest=document.getElementById('ux-results');if(!dest)return;
    var words=query.trim().split(/\s+/).filter(Boolean).map(normalized);
    var matches=lessons.filter(function(x){return (filter==='すべて'||x.group===filter)&&words.every(function(w){return normalized(x.title+x.desc+x.tags).indexOf(w)!==-1;});});
    document.getElementById('ux-count').textContent=matches.length+'件の教材'+(query?'（タイトル・説明から検索）':'');
    if(!matches.length){dest.innerHTML='<div class="ux-empty">見つかりませんでした。短い言葉にするか、分類を「すべて」に変えてください。<div class="ux-actions">'+button('検索と分類をリセット','data-ux-reset="1"')+'</div></div>';return;}
    dest.innerHTML=['プラン','商材','他社比較','用語・過去','テスト'].map(function(g){var xs=matches.filter(function(x){return x.group===g;});return xs.length?'<section class="ux-group"><h2>'+g+'</h2>'+xs.map(function(x){return row(x);}).join('')+'</section>':'';}).join('');
  }
  function learn(v){
    v.innerHTML=page('教材を探す','新人さんはホームの学習順から。必要な情報を調べる時は、ここから。','<label class="ux-search"><span>教材名・知りたいこと</span><input id="ux-search" type="search" placeholder="例：auひかり、通話、家族割" value="'+escape(query)+'"></label><div class="ux-filters" aria-label="教材の分類">'+['すべて','プラン','商材','他社比較','用語・過去','テスト'].map(function(g){return '<button type="button" data-ux-filter="'+g+'" aria-pressed="'+(g===filter)+'">'+g+'</button>';}).join('')+'</div><p id="ux-count" class="ux-results-note" role="status" aria-live="polite"></p><div id="ux-results"></div><p class="ux-note">検索対象は教材のタイトル・説明・関連語です。本文内の全文検索ではありません。</p>');
    v.querySelector('#ux-search').addEventListener('input',function(e){query=e.target.value;results();});results();
  }
  function tests(v){
    var body='<section class="ux-section"><div class="ux-tip">教材を読む → テストを選ぶ → 間違えた内容を復習する。<br>自社・他社テストは20問、クローザー編は30問です。</div></section><section class="ux-section"><h2>プランの理解を確認</h2>'+row(find('ch6','quiz'))+'<div class="ux-actions">'+button('料金プランを読む',attrs(find('ch6','plans')))+'</div></section><section class="ux-section"><h2>商材の理解を確認</h2>'+row(find('ch7','quiz'))+'<div class="ux-actions">'+button('商材提案の基本を読む',attrs(find('ch7','ov')))+'</div></section><section class="ux-section"><h2>復習・弱点の確認</h2><p class="ux-intro">各テストの選択画面に、対象がある時だけ「復習」「弱点」が表示されます。前に間違えた内容を振り返りましょう。</p></section>';
    v.innerHTML=page('テスト・復習','最初は「自社テスト → 初級」を選びましょう。',body);
  }
  function profile(v){
    var count=TROPHIES.filter(function(t){return !t.hidden&&Trophy.has(t.id);}).length,total=TROPHIES.filter(function(t){return !t.hidden;}).length;
    var resume=last(),opened=Object.keys(state.opened).filter(function(k){return lessons.some(function(x){return id(x)===k&&x.tab!=='quiz';});}).length;
    v.innerHTML=page('学習記録','この端末・ブラウザに保存されている記録です。','<section class="ux-section"><div class="ux-stats"><div class="ux-stat"><b>'+count+' / '+total+'</b><span>通常テストの合格実績</span></div><div class="ux-stat"><b>'+opened+' / 17</b><span>開いた教材（今回の更新以降）</span></div></div><p class="ux-note">実績はテストの達成記録です。現場での経験や能力を自動判定するものではありません。</p></section><section class="ux-section"><h2>前回の教材</h2>'+(resume?row(resume):'<div class="ux-empty">まだ教材を開いていません。ホームの学習ガイドから始めましょう。</div>')+'</section><section class="ux-section"><h2>次の行動</h2><div class="ux-grid">'+tile('学習ガイドへ','基本を順に確認する。','data-ux-view="home"')+tile('合格実績へ','未獲得の条件を確認する。','data-ux-view="trophy"')+'</div></section><section class="ux-section"><div class="ux-tip">別の端末やブラウザでは、同じ記録は表示されません。ブラウザの保存データを消すと学習記録も消えるため、更新のためにデータを削除する必要はありません。</div></section>');
  }
  function condition(t){
    var m=t.id.match(/^ch([67])-(own|others)-(beginner|intermediate|advanced)$/);
    if(m)return (m[1]==='6'?'プラン':'商材')+'の'+(m[2]==='own'?'自社':'他社')+'・'+({beginner:'初級',intermediate:'中級',advanced:'上級'}[m[3]])+'で20問全問正解';
    if(/^ch[67]-closer$/.test(t.id))return (t.id.indexOf('ch6')===0?'プラン':'商材')+'のクローザー編で30問全問正解';
    return t.hint||t.sub||'';
  }
  function trophyView(v){
    oldTrophy(v);var sub=v.querySelector('.ig-page-sub');if(sub)sub.textContent=Trophy.count()+' / '+TROPHIES.length+' 獲得（テスト実績と隠し実績の合計）';
    var groups=v.querySelectorAll('.ig-trophy-grid');
    ['プラン','サービス','認定','隠し'].forEach(function(g,i){
      if(!groups[i])return;var ts=TROPHIES.filter(function(t){return t.grp===g;});
      Array.from(groups[i].children).forEach(function(cell,j){var t=ts[j];if(!t||t.hidden&&!Trophy.has(t.id))return;
        cell.querySelector('.ig-trophy-name').textContent=t.t;
        var hint=document.createElement('span');hint.className='ux-trophy-hint';hint.textContent=condition(t);cell.appendChild(hint);
        if(!Trophy.has(t.id)){var link=document.createElement('button');link.type='button';link.className='ux-btn small';link.textContent='テストを選ぶ';link.dataset.uxLesson=t.id.indexOf('ch6')===0?'ch6':'ch7';link.dataset.uxTab='quiz';cell.appendChild(link);}
      });
    });
    v.querySelectorAll('.ig-section-title').forEach(function(h){if(h.textContent==='サービス')h.textContent='商材';});
    var intro=v.querySelector('.ig-card-sub');if(intro)intro.textContent='通常実績は、未獲得でも名前と獲得条件を確認できます。';
  }
  function enhanceCards(root){
    root.querySelectorAll('.card .head').forEach(function(head){
      head.setAttribute('role','button');head.tabIndex=0;head.setAttribute('aria-expanded',head.closest('.card').classList.contains('open')?'true':'false');
      if(!head.dataset.uxKeyboard){head.dataset.uxKeyboard='1';head.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();head.click();}});head.addEventListener('click',function(){head.setAttribute('aria-expanded',head.closest('.card').classList.contains('open')?'true':'false');});}
    });
  }
  function lessonChrome(ch,tab){
    var x=find(ch,tab);if(!x)return;var wrap=document.getElementById('lessonWrap');if(!wrap)return;
    var title=document.getElementById('ux-lesson-title'),desc=document.getElementById('ux-lesson-desc');if(title)title.textContent=x.title;if(desc)desc.textContent=x.desc;
    wrap.querySelectorAll('#nav button').forEach(function(b){if(b.dataset.t===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    record(x);
    var next=document.getElementById('ux-next');if(next){
      if(tab==='quiz'){next.hidden=true;return;}next.hidden=false;
      var ix=guide.indexOf(x),after=ix>=0&&ix<guide.length-1?guide[ix+1]:find(ch,'quiz');
      next.innerHTML='<h2>確認できたら、次へ</h2><p>分からないことは教育担当に確認してから進みましょう。</p><div class="ux-actions">'+button(after.tab==='quiz'?'この章のテストを選ぶ':'次の教材：'+after.title,attrs(after),true)+button('教材一覧に戻る','data-ux-view="learn"')+'</div>';
    }
  }
  function open(ch,tab,from){
    tab=tab||'plans';if(!find(ch,tab)||!canLeave())return;
    origin=from||(['home','learn','test','profile','trophy'].indexOf(App.current)>=0?App.current:origin);
    if(bodyObserver){bodyObserver.disconnect();bodyObserver=null;}
    oldOpen(ch,tab);active(tab==='quiz'?'test':'learn');
    var top=document.querySelector('.ig-lesson-top');if(top)top.outerHTML='<div class="ux-lesson-head"><div class="ux-crumb">'+button('‹ '+({home:'ホーム',learn:'教材一覧',test:'テスト一覧',profile:'学習記録',trophy:'実績'}[origin]||'教材一覧')+'へ戻る','data-ux-view="'+origin+'"')+'<span class="ux-location">'+(ch==='ch6'?'プラン編':'商材編')+'</span></div><h1 id="ux-lesson-title" tabindex="-1"></h1><p id="ux-lesson-desc"></p></div>';
    var wrap=document.getElementById('lessonWrap'),nav=wrap.querySelector('#nav');
    var outline=document.createElement('details');outline.className='ux-outline';outline.open=true;outline.innerHTML='<summary>この章の目次（すべての項目）</summary>';nav.before(outline);outline.appendChild(nav);
    nav.setAttribute('aria-label','この章の教材');
    var labels={ch6:{plans:'料金プラン',past:'受付終了プラン',hist:'プランの変遷',svc:'付帯サービス',groups:'セット・家族割',call:'通話オプション',others:'他社プラン',terms:'用語集',quiz:'確認テスト'},ch7:{ov:'提案の基本',card:'au PAYカード',energy:'でんき・ガス',netbase:'ネット基礎',net:'光・ルーター',bank:'じぶん銀行',ocard:'他社カード',oenergy:'他社でんき',terms:'用語集',quiz:'確認テスト'}};
    nav.querySelectorAll('button').forEach(function(b){b.querySelector('i').textContent=labels[ch][b.dataset.t];b.addEventListener('click',function(){lessonChrome(ch,b.dataset.t);active(b.dataset.t==='quiz'?'test':'learn');});});
    var next=document.createElement('div');next.id='ux-next';next.className='ux-next';wrap.after(next);
    lessonChrome(ch,tab);enhanceCards(wrap);
    bodyObserver=new MutationObserver(function(){enhanceCards(wrap);});bodyObserver.observe(wrap,{childList:true,subtree:true});
    focusPage();
  }
  App.go=function(view){
    if(view==='ch6'||view==='ch7'){open(view,view==='ch6'?'plans':'ov');return;}
    if(!canLeave())return;if(bodyObserver){bodyObserver.disconnect();bodyObserver=null;}
    var v=document.getElementById('view');if(!v)return;App.current=view;active(view);
    if(view==='home')home(v);else if(view==='learn')learn(v);else if(view==='test')tests(v);else if(view==='profile')profile(v);else if(view==='trophy')trophyView(v);else oldGo(view);
    focusPage();
  };
  App.openLesson=open;App.renderTrophy=trophyView;
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-ux-view],[data-ux-lesson],[data-open-lesson],[data-ux-filter],[data-ux-reset]');
    if(t){e.preventDefault();e.stopImmediatePropagation();
      if(t.dataset.uxView)App.go(t.dataset.uxView);
      else if(t.dataset.uxLesson||t.dataset.openLesson)open(t.dataset.uxLesson||t.dataset.openLesson,t.dataset.uxTab||t.dataset.tab);
      else if(t.dataset.uxFilter){filter=t.dataset.uxFilter;document.querySelectorAll('[data-ux-filter]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.uxFilter===filter));});results();}
      else {query='';filter='すべて';learn(document.getElementById('view'));document.getElementById('ux-search').focus();}
      return;
    }
    var nb=e.target.closest&&e.target.closest('#lessonWrap #nav button');
    if(nb&&nb.dataset.t!=='quiz'&&!canLeave()){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('click',function(e){
    var trophy=e.target.closest&&e.target.closest('[data-trophy]'),close=e.target.closest&&e.target.closest('[data-close-modal]');
    var modal=document.getElementById('trophyModal');
    if(trophy&&modal&&modal.classList.contains('on')){modalOpener=trophy;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','獲得した実績');var b=modal.querySelector('[data-close-modal]');if(b)b.focus();}
    if(close&&modalOpener&&modalOpener.isConnected)modalOpener.focus();
  });
  document.addEventListener('keydown',function(e){
    var modal=document.getElementById('trophyModal');if(!modal||!modal.classList.contains('on'))return;
    if(e.key==='Escape'){modal.classList.remove('on');if(modalOpener&&modalOpener.isConnected)modalOpener.focus();}
    if(e.key==='Tab'){e.preventDefault();var b=modal.querySelector('[data-close-modal]');if(b)b.focus();}
  });
  document.querySelector('#appbar [data-view=learn]').setAttribute('aria-label','教材');
  document.querySelector('#appbar [data-view=learn] span').textContent='教材';
  document.querySelector('#appbar [data-view=trophy]').setAttribute('aria-label','実績');
  document.querySelector('#appbar [data-view=profile]').setAttribute('aria-label','学習記録');
  document.querySelector('#appbar [data-view=profile] span').textContent='記録';
  if(App.current&&['home','learn','test','profile','trophy'].indexOf(App.current)>=0)App.go(App.current);
})();
