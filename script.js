const FILES=[
{id:1,t:"Guide complet HTML5 et CSS3 Flexbox",d:"Livre PDF pour créer des sites responsives et modernes, pas à pas.",c:"livre",s:"12,5 Mo",h:"Google Drive",i:"fa-file-pdf",u:"https://drive.google.com/"},
{id:2,t:"JavaScript moderne ES6+ pour développeurs",d:"Leçons et exemples applicables tout de suite à vos applications web.",c:"livre",s:"18,0 Mo",h:"Google Drive",i:"fa-file-pdf",u:"https://drive.google.com/"},
{id:3,t:"Pack d’icônes et modèles UI/UX",d:"Images et maquettes de sites prêtes à intégrer dans vos projets.",c:"modele",s:"45,2 Mo",h:"Mega",i:"fa-file-zipper",u:"https://mega.nz/"},
{id:4,t:"Coder sur mobile : guide Acode Pro",d:"Outils et méthode pour programmer depuis un téléphone Android.",c:"logiciel",s:"28,4 Mo",h:"MediaFire",i:"fa-mobile-screen",u:"https://www.mediafire.com/"}];
FILES.forEach(f=>f.img="f"+f.id+".svg");
const $=s=>document.querySelector(s);
const store={get:k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const root=document.documentElement;
root.dataset.theme=store.get("theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");

// Navigation commune : liens vers de vraies pages indépendantes.
const nav=$("#nav");
if(nav){
 const page=nav.dataset.page;
 const links=[["accueil","index.html","Accueil","fa-house"],["telechargements","telechargements.html","Téléchargements","fa-download"],["compte","compte.html","Mon compte","fa-user"]];
 nav.outerHTML=`<header class="nav"><div class="nvf">
 <button class="menu-btn" id="menuToggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
 <a class="logo" href="index.html" aria-label="ChrisHub, accueil">Chris<span>Hub</span></a>
 <div class="drawer-backdrop" id="drawerBackdrop"></div>
 <aside class="sidebar-drawer" id="sidebarDrawer" aria-label="Menu latéral">
  <div class="drawer-head">
   <a class="logo" href="index.html">Chris<span>Hub</span></a>
   <button class="drawer-close" id="drawerClose" type="button" aria-label="Fermer le menu"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <div class="nav-label">MENU PRINCIPAL</div>
  <nav class="nl" aria-label="Navigation principale">${links.map(([id,url,label,ic])=>`<a href="${url}" ${page===id?'aria-current="page"':""}><i class="fa-solid ${ic}" aria-hidden="true"></i><span>${label}</span></a>`).join("")}</nav>
 </aside>
 <div class="nav-bottom"><button class="tb theme-toggle" id="theme" type="button" aria-label="Passer au thème clair" title="Passer au thème clair"><i class="fa-solid fa-sun" aria-hidden="true"></i></button><p>© 2026 ChrisHub</p></div>
 </div></header>`;

 const themeBtn=$("#theme");
 const metaTheme=document.querySelector('meta[name="theme-color"]');
 const paintTheme=()=>{
  const light=root.dataset.theme==="light";
  themeBtn.innerHTML=`<i class="fa-solid ${light?"fa-moon":"fa-sun"}" aria-hidden="true"></i>`;
  themeBtn.setAttribute("aria-label",light?"Passer au thème sombre":"Passer au thème clair");
  themeBtn.title=light?"Passer au thème sombre":"Passer au thème clair";
  if(metaTheme)metaTheme.setAttribute("content",light?"#ffffff":"#000000");
 };
 paintTheme();
 themeBtn.onclick=()=>{root.dataset.theme=root.dataset.theme==="dark"?"light":"dark";store.set("theme",root.dataset.theme);paintTheme()};

 const menuBtn=$("#menuToggle"),drawer=$("#sidebarDrawer"),backdrop=$("#drawerBackdrop"),closeBtn=$("#drawerClose");
 const setDrawer=open=>{
  drawer.classList.toggle("open",open);
  backdrop.classList.toggle("open",open);
  menuBtn.setAttribute("aria-expanded",String(open));
 };
 if(menuBtn)menuBtn.onclick=()=>setDrawer(true);
 if(closeBtn)closeBtn.onclick=()=>setDrawer(false);
 if(backdrop)backdrop.onclick=()=>setDrawer(false);
}
const ft=$("#foot");
if(ft)ft.outerHTML=`<footer><div class="wrap"><span><strong>ChrisHub</strong> — partage de ressources numériques</span><span>© 2026 ANDRIANISA Tolojanahary Christian. Tous droits réservés.</span></div></footer>`;

// Catalogue : recherche locale + 4 API gratuites (Open Library, Gutenberg, Internet Archive, Google Books).
const filesBox=$("#files");
if(filesBox){
 let cat="all",src="all",lang="all",favs=store.get("favs")||[],favItems=store.get("favItems")||{};
 let bySrc={},pending=0,failed=[],reqId=0,apiTimer=null,activeCount=0;
 const cache=new Map();
 const q=$("#q"),cnt=$("#count"),langSel=$("#lang"),srcBox=$("#srcs");
 const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const https=u=>String(u||"").replace(/^http:\/\//i,"https://");
 const safeUrl=u=>/^https:\/\//i.test(u||"")?u:"";
 const first=v=>Array.isArray(v)?v[0]:v;
 const LANG={ol:{fr:"fre",en:"eng"},gut:{fr:"fr",en:"en"},ia:{fr:"(French OR fre)",en:"(English OR eng)"},gb:{fr:"fr",en:"en"}};

 async function getJSON(url,ms=9000){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms);
  try{const r=await fetch(url,{signal:ctl.signal});if(!r.ok)throw new Error("HTTP "+r.status);return await r.json()}
  finally{clearTimeout(t)}
 }

 // Chaque source renvoie une liste d'éléments au même format que FILES.
 const SOURCES=[
  {id:"ol",name:"Open Library",async run(term){
   let url=`https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&has_fulltext=true&limit=12&fields=key,title,author_name,first_publish_year,cover_i,ia,ebook_access`;
   if(LANG.ol[lang])url+=`&language=${LANG.ol[lang]}`;
   const j=await getJSON(url);
   return (j.docs||[]).filter(d=>d.key&&d.title).map(d=>{
    const ia=first(d.ia),pub=d.ebook_access==="public";
    return {id:"ol_"+d.key,t:d.title,
     d:`Par ${first(d.author_name)||"auteur inconnu"}${d.first_publish_year?` (${d.first_publish_year})`:""}. ${pub?"Lecture et téléchargement gratuits.":"Emprunt gratuit (compte Archive.org requis)."}`,
     c:"livre",s:pub?"Libre accès":"Emprunt",h:"Open Library",
     img:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`:"f1.svg",
     u:ia?`https://archive.org/details/${encodeURIComponent(ia)}`:`https://openlibrary.org${d.key}`,api:true};
   });
  }},
  {id:"gut",name:"Gutenberg",async run(term){
   let url=`https://gutendex.com/books/?search=${encodeURIComponent(term)}`;
   if(LANG.gut[lang])url+=`&languages=${LANG.gut[lang]}`;
   const j=await getJSON(url,12000);
   return (j.results||[]).slice(0,12).map(b=>{
    const f=b.formats||{};
    const u=f["application/pdf"]||f["application/epub+zip"]||f["text/html"]||`https://www.gutenberg.org/ebooks/${b.id}`;
    return {id:"gut_"+b.id,t:b.title||"Livre Gutenberg",
     d:`Par ${(b.authors&&b.authors[0]&&b.authors[0].name)||"auteur inconnu"}. Domaine public, téléchargement gratuit.`,
     c:"livre",s:f["application/pdf"]?"PDF":f["application/epub+zip"]?"EPUB":"HTML",h:"Gutenberg",
     img:f["image/jpeg"]||"f2.svg",u,api:true};
   });
  }},
  {id:"ia",name:"Archive.org",async run(term){
   const words=term.replace(/[^\p{L}\p{N}\s'-]/gu," ").replace(/\s+/g," ").trim();
   if(!words)return [];
   let query=`(${words}) AND mediatype:texts AND access-restricted-item:false`;
   if(LANG.ia[lang])query+=` AND language:${LANG.ia[lang]}`;
   const url=`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&sort%5B%5D=downloads+desc&rows=12&output=json`;
   const j=await getJSON(url,12000);
   return ((j.response&&j.response.docs)||[]).filter(d=>d.identifier).map(d=>({
    id:"ia_"+d.identifier,t:first(d.title)||d.identifier,
    d:`Par ${first(d.creator)||"auteur inconnu"}${d.year?` (${first(d.year)})`:""}. Document en libre accès sur Internet Archive.`,
    c:"livre",s:"Archive.org",h:"Archive.org",
    img:`https://archive.org/services/img/${encodeURIComponent(d.identifier)}`,
    u:`https://archive.org/details/${encodeURIComponent(d.identifier)}`,api:true}));
  }},
  {id:"gb",name:"Google Books",async run(term){
   let url=`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&filter=free-ebooks&maxResults=12`;
   if(LANG.gb[lang])url+=`&langRestrict=${LANG.gb[lang]}`;
   const j=await getJSON(url);
   return (j.items||[]).filter(b=>b.volumeInfo).map(b=>{
    const v=b.volumeInfo,a=b.accessInfo||{};
    const pdf=a.pdf&&a.pdf.isAvailable&&a.pdf.downloadLink,epub=a.epub&&a.epub.isAvailable&&a.epub.downloadLink;
    const u=https(pdf||epub||a.webReaderLink||v.infoLink);
    return {id:"gb_"+b.id,t:v.title||"Livre Google Books",
     d:`Par ${(v.authors&&v.authors[0])||"auteur inconnu"}${v.publishedDate?` (${String(v.publishedDate).slice(0,4)})`:""}. Livre gratuit sur Google Books.`,
     c:"livre",s:pdf?"PDF":epub?"EPUB":"En ligne",h:"Google Books",
     img:https(v.imageLinks&&(v.imageLinks.thumbnail||v.imageLinks.smallThumbnail))||"f3.svg",u,api:true};
   });
  }}
 ];

 const apiList=()=>SOURCES.flatMap(s=>bySrc[s.id]||[]);

 function renderCard(f){
  const isFav=favs.includes(f.id);
  const typeLabel=f.api?"EN LIGNE • "+f.h.toUpperCase():(f.c==="livre"?"LIVRE PDF":f.c==="logiciel"?"LOGICIEL":"MODÈLE WEB");
  const link=safeUrl(f.u);
  return `<article class="file">
   <div class="pv ${esc(f.c)}"><img src="${esc(safeUrl(f.img)||f.img)}" alt="Aperçu : ${esc(f.t)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='f1.svg'"><span>${esc(f.s)}</span></div>
   <div class="in"><div class="file-type">${esc(typeLabel)}</div><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></div>
   <div class="ft"><span class="host">${esc(f.h)}</span><button class="btn fav ${isFav?"on":""}" data-f="${esc(f.id)}" aria-label="Ajouter aux favoris" aria-pressed="${isFav}"><i class="fa-solid fa-star"></i></button><button class="btn" data-l="${esc(f.id)}" aria-label="Copier le lien"><i class="fa-solid fa-link"></i></button><a class="btn p" href="${esc(link||"#")}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-download"></i> ${f.api?"Ouvrir":"Télécharger"}</a></div>
  </article>`;
 }

 function draw(){
  const term=q.value.toLowerCase().trim();
  const match=f=>(f.t+" "+f.d+" "+f.h).toLowerCase().includes(term);
  const onlineOn=(cat==="all"||cat==="livre")&&term.length>=2;
  const local=FILES.filter(f=>(cat==="all"||(cat==="fav"?favs.includes(f.id):f.c===cat))&&match(f));
  const online=onlineOn?apiList():[];
  const favRemote=cat==="fav"?Object.values(favItems).filter(match):[];
  const combined=[...local,...online,...favRemote];

  let s=combined.length+(combined.length>1?" ressources":" ressource");
  if(online.length)s+=` (dont ${online.length} en ligne)`;
  if(onlineOn&&pending>0)s+=` • Recherche en ligne : ${pending} source${pending>1?"s":""} en cours…`;
  if(onlineOn&&failed.length)s+=` • Indisponible : ${failed.join(", ")}`;
  cnt.textContent=s;

  if(combined.length){filesBox.innerHTML=combined.map(renderCard).join("");return}
  let msg;
  if(onlineOn&&pending>0)msg="Recherche de livres et de PDF en cours sur Internet…";
  else if(onlineOn&&activeCount>0&&failed.length>=activeCount)msg=`Impossible de joindre les API pour le moment. Vérifiez votre connexion. <button class="btn" data-retry type="button">Réessayer</button>`;
  else if(cat==="fav")msg="Aucun favori pour l’instant. Ajoutez une ressource avec l’étoile.";
  else msg="Aucune ressource ne correspond à votre recherche.";
  filesBox.innerHTML=`<p class="empty">${msg}</p>`;
 }

 function search(term){
  const id=++reqId;
  bySrc={};failed=[];
  const list=SOURCES.filter(s=>src==="all"||s.id===src);
  activeCount=pending=list.length;
  const finish=(s,items,err)=>{
   if(id!==reqId)return; // résultat d'une recherche déjà remplacée
   if(err)failed.push(s.name);else bySrc[s.id]=items;
   pending--;draw();
  };
  list.forEach(s=>{
   const key=`${s.id}|${lang}|${term.toLowerCase()}`;
   if(cache.has(key))return finish(s,cache.get(key));
   s.run(term).then(items=>{cache.set(key,items);finish(s,items)}).catch(()=>finish(s,[],true));
  });
  draw();
 }

 const rerun=()=>{clearTimeout(apiTimer);const v=q.value.trim();if(v.length>=2)search(v);else{reqId++;bySrc={};pending=0;failed=[];draw()}};

 if(q)q.oninput=()=>{
  clearTimeout(apiTimer);
  const v=q.value.trim();
  if(v.length>=2){draw();apiTimer=setTimeout(()=>search(v),400)}
  else{reqId++;bySrc={};pending=0;failed=[];draw()}
 };
 if(langSel)langSel.onchange=()=>{lang=langSel.value;rerun()};
 if(srcBox)srcBox.onclick=e=>{const b=e.target.closest(".chip");if(!b)return;srcBox.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===b));src=b.dataset.s;rerun()};

 const chips=$("#chips");
 if(chips)chips.onclick=e=>{const b=e.target.closest(".chip");if(!b)return;chips.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===b));cat=b.dataset.c;draw()};

 filesBox.onclick=e=>{
  const f=e.target.closest("[data-f]"),l=e.target.closest("[data-l]"),r=e.target.closest("[data-retry]");
  if(r){const v=q.value.trim();if(v.length>=2)search(v);return}
  if(f){
   const id=isNaN(+f.dataset.f)?f.dataset.f:+f.dataset.f;
   if(favs.includes(id)){favs=favs.filter(x=>x!==id);delete favItems[id]}
   else{favs=[...favs,id];const it=apiList().find(a=>a.id===id);if(it)favItems[id]=it}
   store.set("favs",favs);store.set("favItems",favItems);
   draw();
  }
  if(l){
   const lid=isNaN(+l.dataset.l)?l.dataset.l:+l.dataset.l;
   const item=[...FILES,...apiList(),...Object.values(favItems)].find(a=>a.id===lid);
   if(item&&navigator.clipboard){
    navigator.clipboard.writeText(item.u).then(()=>{cnt.textContent="Lien copié dans le presse-papiers."}).catch(()=>{cnt.textContent="Impossible de copier automatiquement ce lien."});
   }
  }
 };
 addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement!==q&&document.activeElement!==langSel){e.preventDefault();q.focus()}});
 draw();
}

// Démonstration locale du compte (les identifiants ne sont pas envoyés à un serveur).
const tabs=$("#tabs");
if(tabs){
 const sync=()=>{const user=store.get("user");$("#me").hidden=!user;$("#forms").hidden=!!user;const out=$("#out");if(out)out.hidden=!user;if(user)$("#meName").textContent=user};
 const logout=()=>{localStorage.removeItem("user");sync()};
 const out2=$("#out2");if(out2)out2.onclick=logout;
 tabs.onclick=e=>{const b=e.target.closest(".chip");if(!b)return;tabs.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===b));$("#login").hidden=b.dataset.t!=="login";$("#signup").hidden=b.dataset.t!=="signup"};
 const say=(id,ok,msg)=>{const el=$(id);el.className="msg "+(ok?"ok":"err");el.textContent=msg};
 $("#login").onsubmit=e=>{e.preventDefault();const user=$("#lu").value.trim(),pass=$("#lp").value;if(!user||!pass)return say("#lmsg",false,"Renseignez l’identifiant et le mot de passe.");store.set("user",user);say("#lmsg",true,"Connexion locale réussie.");sync()};
 $("#signup").onsubmit=e=>{e.preventDefault();const name=$("#nom").value.trim(),user=$("#su").value.trim(),pass=$("#sp").value;if(!name||!user||!pass)return say("#smsg",false,"Veuillez remplir tous les champs.");store.set("user",name);say("#smsg",true,"Compte de démonstration créé sur cet appareil.");sync()};
 sync();
}
