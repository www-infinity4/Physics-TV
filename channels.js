(function(){
  "use strict";
  const channels=[
    ["Hermit TV","Hermit-TV"],["Star Launcher","Star-Launcher"],["HBO","HBO"],["Cinemax","Cinemax"],["Showtime","Showtime"],["Starz","Starz"],["Encore","Encore"],["Cartoon Network","Cartoon-Network"],["WGN","WGN"],["NBC","NBC"],["FOX","FOX"],["PBS","PBS"],["TNT","TNT"],["History Channel","History-Channel"],["Discovery","Discovery"],["Physics TV","Physics-TV"],["Disney Vintage","Disney"],["Trump TV","Trump-TV"],["ShopLC","ShopLC"],["StarQuest","TV-Database"],["Astraflix","Astraflix"],["Syncord","Syncord"],["Vintech","Vintech"],["Abstractia","Abstractia-"],["Flix Blender","Flix-Blender"],["Animasync","Animasync"]
  ].map(([name,slug])=>({name,slug,url:`https://www-infinity4.github.io/${slug}/`}));
  const current=(location.pathname.split("/").filter(Boolean)[0]||"").toLowerCase();
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const html=channels.map(c=>`<a${c.slug.toLowerCase()===current?' aria-current="page"':''} href="${c.url}">${esc(c.name)}</a>`).join("");
  document.querySelectorAll(".channel-menu nav,.channel-directory nav").forEach(nav=>nav.innerHTML=html);
})();
