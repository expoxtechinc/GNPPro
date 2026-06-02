export interface TVChannel {
  id: string;
  name: string;
  logo: string;
  country: string;
  group: string;
  url: string;
  type: 'hls' | 'youtube' | 'twitch' | 'other';
}

export const TV_CHANNELS: TVChannel[] = [
  // --- Albania ---
  {
    id: "Kanali7.al",
    name: "Kanali 7",
    logo: "https://i.imgur.com/rL2v9pM.png",
    country: "AL",
    group: "Albania",
    url: "https://fe.tring.al/delta/105/out/u/1200_1.m3u8",
    type: "hls"
  },
  {
    id: "A2CNN.al",
    name: "A2 CNN Albania",
    logo: "https://i.imgur.com/TgO3Lzi.png",
    country: "AL",
    group: "Albania",
    url: "https://tv.a2news.com/live/smil:a2cnnweb.stream.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "ABCNewsAlbania.al",
    name: "ABC News Albania",
    logo: "https://i.imgur.com/aObcudw.png",
    country: "AL",
    group: "Albania",
    url: "https://www.twitch.tv/abcnewsal",
    type: "twitch"
  },
  {
    id: "AlbKanaleMusicTV.al",
    name: "AlbKanale Music TV",
    logo: "https://i.imgur.com/JdKxscs.png",
    country: "AL",
    group: "Albania",
    url: "https://albportal.net/albkanalemusic.m3u8",
    type: "hls"
  },
  {
    id: "AlpoTV.al",
    name: "Alpo TV",
    logo: "https://i.imgur.com/Pr4ixiA.png",
    country: "AL",
    group: "Albania",
    url: "https://5d00db0e0fcd5.streamlock.net/7236/7236/playlist.m3u8",
    type: "hls"
  },
  {
    id: "CNA.al",
    name: "CNA",
    logo: "https://i.imgur.com/X3ukD5t.png",
    country: "AL",
    group: "Albania",
    url: "https://live1.mediadesk.al/cnatvlive.m3u8",
    type: "hls"
  },
  {
    id: "EuronewsAlbania.al",
    name: "Euronews Albania",
    logo: "https://i.imgur.com/Skf6vdi.png",
    country: "AL",
    group: "Albania",
    url: "https://www.youtube.com/@EuronewsAlbania/live",
    type: "youtube"
  },
  {
    id: "News24.al",
    name: "News 24",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/News_24_%28Albania%29.svg/1024px-News_24_%28Albania%29.svg.png",
    country: "AL",
    group: "Albania",
    url: "https://tv.balkanweb.com/news24/livestream/playlist.m3u8",
    type: "hls"
  },
  {
    id: "OraNews.al",
    name: "Ora News",
    logo: "https://i.imgur.com/ILZY5bJ.png",
    country: "AL",
    group: "Albania",
    url: "https://live1.mediadesk.al/oranews.m3u8",
    type: "hls"
  },
  {
    id: "PanoramaTV.al",
    name: "Panorama TV",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Panorama_logo.svg/512px-Panorama_logo.svg.png",
    country: "AL",
    group: "Albania",
    url: "http://198.244.188.94/panorama/livestream/playlist.m3u8",
    type: "hls"
  },
  {
    id: "ReportTV.al",
    name: "Report TV",
    logo: "https://i.imgur.com/yuRDJYY.png",
    country: "AL",
    group: "Albania",
    url: "https://deb10stream.duckdns.org/hls/stream.m3u8",
    type: "hls"
  },
  {
    id: "Syri.al",
    name: "Syri TV",
    logo: "https://i.imgur.com/4zVyj1M.png",
    country: "AL",
    group: "Albania",
    url: "https://stream.syritv.al/SyriTV/index.m3u8",
    type: "hls"
  },
  {
    id: "TopNews.al",
    name: "Top News",
    logo: "https://i.imgur.com/tBAXkOW.png",
    country: "AL",
    group: "Albania",
    url: "https://www.twitch.tv/topnewsal",
    type: "twitch"
  },
  {
    id: "TropojaTelevizion.al",
    name: "Tropoja TV",
    logo: "https://i.imgur.com/D3hNOVS.png",
    country: "AL",
    group: "Albania",
    url: "https://live.prostream.al/al/smil:tropojatv.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "TV7Albania.al",
    name: "TV 7 Albania",
    logo: "https://i.imgur.com/k9WqPLZ.png",
    country: "AL",
    group: "Albania",
    url: "https://5d00db0e0fcd5.streamlock.net/7064/7064/playlist.m3u8",
    type: "hls"
  },
  {
    id: "TVApollon.al",
    name: "TV Apollon",
    logo: "https://i.imgur.com/gUz2AjM.png",
    country: "AL",
    group: "Albania",
    url: "https://live.apollon.tv/Apollon-WEB/video.m3u8?token=tnt3u76re30d2",
    type: "hls"
  },
  {
    id: "VizionPlus.al",
    name: "Vizion Plus",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Vizion_Plus.svg/512px-Vizion_Plus.svg.png",
    country: "AL",
    group: "Albania",
    url: "https://fe.tring.al/delta/105/out/u/rdghfhsfhfshs.m3u8",
    type: "hls"
  },

  // --- Andorra ---
  {
    id: "AndorraTV.ad",
    name: "Andorra TV",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/32/Logo_Andorra_Televisi%C3%B3.png",
    country: "AD",
    group: "Andorra",
    url: "https://videos.rtva.ad/live/rtva/playlist.m3u8",
    type: "hls"
  },

  // --- Argentina ---
  {
    id: "TodoNoticias.ar",
    name: "TN Todo Noticias",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/TN_todo_noticias_logo.svg/200px-TN_todo_noticias_logo.svg.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/todonoticias/live",
    type: "youtube"
  },
  {
    id: "Encuentro.ar",
    name: "Encuentro",
    logo: "https://i.imgur.com/IyP2UIx.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/user/encuentro/live",
    type: "youtube"
  },
  {
    id: "Pakapaka.ar",
    name: "Pakapaka",
    logo: "https://i.imgur.com/Q4zaCuM.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/user/CanalPakapaka/live",
    type: "youtube"
  },
  {
    id: "Aunar.ar",
    name: "Aunar",
    logo: "http://tvabierta.weebly.com/uploads/5/1/3/4/51344345/aunar.png",
    country: "AR",
    group: "Argentina",
    url: "https://5fb24b460df87.streamlock.net/live-cont.ar/mirador/playlist.m3u8",
    type: "hls"
  },
  {
    id: "CineAr.ar",
    name: "Cine.AR",
    logo: "https://i.imgur.com/RPLyrIC.png",
    country: "AR",
    group: "Argentina",
    url: "https://5fb24b460df87.streamlock.net/live-cont.ar/cinear/playlist.m3u8",
    type: "hls"
  },
  {
    id: "TECTV.ar",
    name: "Tec TV",
    logo: "https://i.imgur.com/EGCq1wc.png",
    country: "AR",
    group: "Argentina",
    url: "https://tv.initium.net.ar:3939/live/tectvmainlive.m3u8",
    type: "hls"
  },
  {
    id: "TVPublica.ar",
    name: "Televisión Pública",
    logo: "https://i.imgur.com/4hYYpiu.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/user/TVPublicaArgentina/live",
    type: "youtube"
  },
  {
    id: "DeporTV.ar",
    name: "DeporTV",
    logo: "https://i.imgur.com/iyYLNRt.png",
    country: "AR",
    group: "Argentina",
    url: "https://5fb24b460df87.streamlock.net/live-cont.ar/deportv/playlist.m3u8",
    type: "hls"
  },
  {
    id: "Canal26.ar",
    name: "Canal 26",
    logo: "https://i.imgur.com/xDjOUuz.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/canal26/live",
    type: "youtube"
  },
  {
    id: "CronicaTV.ar",
    name: "Crónica TV",
    logo: "https://i.imgur.com/k2Ku8Ib.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/cronicatv/live",
    type: "youtube"
  },
  {
    id: "IPNoticias.ar",
    name: "IP Noticias",
    logo: "https://photos.live-tv-channels.org/tv-logo/ar-ip-noticias-6980-300x225.jpg",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/watch?v=IxQ2-6Y4y9w",
    type: "youtube"
  },
  {
    id: "ElDestape.ar",
    name: "El Destape",
    logo: "https://yt3.ggpht.com/a-/AAuE7mAuXDwiY8UPwtAHrGXTXkAxBjdRqws2MJIN2A=s900-mo-c-c0xffffffff-rj-k-no",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/watch?v=JuskTxbUqmY",
    type: "youtube"
  },
  {
    id: "C5N.ar",
    name: "C5N",
    logo: "https://i.imgur.com/E3pamA5.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/c5n/live",
    type: "youtube"
  },
  {
    id: "LaNacionPlus.ar",
    name: "LN+",
    logo: "https://i.imgur.com/vJYzGt1.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/LaNacionMas/live",
    type: "youtube"
  },
  {
    id: "CanalE.ar",
    name: "Canal E",
    logo: "https://i.ibb.co/y4pkxH3/Qtc8-M2-PG-400x400.jpg",
    country: "AR",
    group: "Argentina",
    url: "https://unlimited1-us.dps.live/perfiltv/perfiltv.smil/perfiltv/livestream2/chunks.m3u8",
    type: "hls"
  },
  {
    id: "Telemax.ar",
    name: "Telemax",
    logo: "https://i.imgur.com/gfX0hdB.png",
    country: "AR",
    group: "Argentina",
    url: "https://live-edge01.telecentro.net.ar/live/smil:tlx.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "NETTV.ar",
    name: "Net TV",
    logo: "https://i.imgur.com/EWmshtx.png",
    country: "AR",
    group: "Argentina",
    url: "https://unlimited1-us.dps.live/nettv/nettv.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "TVUniversidad.ar",
    name: "TV Universidad",
    logo: "https://i.imgur.com/tvLHiAT.png",
    country: "AR",
    group: "Argentina",
    url: "https://stratus.stream.cespi.unlp.edu.ar/hls/tvunlp.m3u8",
    type: "hls"
  },
  {
    id: "UrbanaTeve.ar",
    name: "Urbana Tevé",
    logo: "https://yt3.ggpht.com/ytc/AKedOLQLeFMWMeoumi-o24ohLPXSEdNL5-oJ9W5oP5KnnA=s900-c-k-c0x00ffffff-no-rj",
    country: "AR",
    group: "Argentina",
    url: "https://cdnhd.iblups.com/hls/DD3nXkAkWk.m3u8",
    type: "hls"
  },
  {
    id: "ElTrece.ar",
    name: "El Trece",
    logo: "https://i.imgur.com/ZK7AQFg.png",
    country: "AR",
    group: "Argentina",
    url: "https://live-01-02-eltrece.vodgc.net/eltrecetv/index.m3u8",
    type: "hls"
  },
  {
    id: "ElNueve.ar",
    name: "El Nueve",
    logo: "https://i.imgur.com/EtcVSm4.png",
    country: "AR",
    group: "Argentina",
    url: "https://octubre-live.cdn.vustreams.com/live/channel09/live.isml/live.m3u8",
    type: "hls"
  },
  {
    id: "Telefe.ar",
    name: "Telefe",
    logo: "https://i.imgur.com/wrZfMXn.png",
    country: "AR",
    group: "Argentina",
    url: "https://telefe.com/Api/Videos/GetSourceUrl/694564/0/HLS?.m3u8",
    type: "hls"
  },
  {
    id: "AmericaTV.ar",
    name: "América TV",
    logo: "https://i.imgur.com/Jt7dOQm.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/americaenvivo/live",
    type: "youtube"
  },
  {
    id: "A24.ar",
    name: "A24",
    logo: "https://i.imgur.com/OdhF7ym.png",
    country: "AR",
    group: "Argentina",
    url: "https://www.youtube.com/c/A24com/live",
    type: "youtube"
  },

  // --- Armenia ---
  {
    id: "Armenia1.am",
    name: "Armenia 1",
    logo: "https://i.imgur.com/HIwJ4lc.png",
    country: "AM",
    group: "Armenia",
    url: "https://amtv1.livestreamingcdn.com/am2abr/index.m3u8",
    type: "hls"
  },
  {
    id: "KentronTV.am",
    name: "Kentron TV",
    logo: "https://i.imgur.com/eCaxBFn.png",
    country: "AM",
    group: "Armenia",
    url: "https://gineu9.bozztv.com/gin-36bay2/gin-kentron/tracks-v1a1/mono.m3u8",
    type: "hls"
  },
  {
    id: "ArmeniaTV.am",
    name: "Armenia TV",
    logo: "https://i.imgur.com/UnoI5uM.png",
    country: "AM",
    group: "Armenia",
    url: "https://cdn.hayastantv.com:8088/armenia/tracks-v1a1/mono.m3u8",
    type: "hls"
  },
  {
    id: "5TV.am",
    name: "5TV Armenia",
    logo: "https://i.imgur.com/jOGZZDo.png",
    country: "AM",
    group: "Armenia",
    url: "https://cdn.hayastantv.com:8088/5tv/tracks-v1a1/mono.m3u8",
    type: "hls"
  },

  // --- Australia ---
  {
    id: "ABCTV.au",
    name: "ABC Australia",
    logo: "https://i.imgur.com/5CVl5EF.png",
    country: "AU",
    group: "Australia",
    url: "https://c.mjh.nz/101002210221/",
    type: "hls"
  },
  {
    id: "TVSN.au",
    name: "TVSN",
    logo: "https://i.imgur.com/p3QCBOo.png",
    country: "AU",
    group: "Australia",
    url: "https://tvsn-i.akamaihd.net/hls/live/261837/tvsn/tvsn_750.m3u8",
    type: "hls"
  },
  {
    id: "ABCMe.au",
    name: "ABC Me",
    logo: "https://i.imgur.com/gBh54wY.png",
    country: "AU",
    group: "Australia",
    url: "https://c.mjh.nz/101002210224/",
    type: "hls"
  },
  {
    id: "ABCNews.au",
    name: "ABC News",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/df/ABC_News_Channel.svg/640px-ABC_News_Channel.svg.png",
    country: "AU",
    group: "Australia",
    url: "https://abc-iview-mediapackagestreams-2.akamaized.net/out/v1/6e1cc6d25ec0480ea099a5399d73bc4b/index.m3u8",
    type: "hls"
  },

  // --- Canada ---
  {
    id: "ONNtv.ca",
    name: "ONNtv Ontario",
    logo: "https://www.image2url.com/r2/default/images/1780266180882-a407e5fa-d664-4a39-92e8-ed32345ae958.jpg",
    country: "CA",
    group: "Canada",
    url: "https://onntv.vantrix.tv:443/onntv_hls/1080p/onntv_hls-HLS-1080p.m3u8",
    type: "hls"
  },
  {
    id: "CanadaStarTV.ca",
    name: "Star TV",
    logo: "https://i.imgur.com/Ap54LCC.png",
    country: "CA",
    group: "Canada",
    url: "http://live.canadastartv.com:1935/canadastartv/canadastartv/playlist.m3u",
    type: "hls"
  },
  {
    id: "CBCNewsNetwork.ca",
    name: "CBC News Network",
    logo: "https://i.imgur.com/1EqQGKS.png",
    country: "CA",
    group: "Canada",
    url: "https://cbcnewshd-f.akamaihd.net/i/cbcnews_1@8981/index_2500_av-p.m3u8",
    type: "hls"
  },
  {
    id: "CTVNewsChannel.ca",
    name: "CTV News",
    logo: "https://i.imgur.com/T3oBeiX.png",
    country: "CA",
    group: "Canada",
    url: "https://pe-fa-lp02a.9c9media.com/live/News1Digi/p/hls/00000201/38ef78f479b07aa0/index/0c6a10a2/live/stream/h264/v1/3500000/manifest.m3u8",
    type: "hls"
  },
  {
    id: "CHANDT.ca",
    name: "Global News BC",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbf063257170000724590c-alt.m3u8",
    type: "hls"
  },
  {
    id: "CICTDT.ca",
    name: "Global News Calgary",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbf23dcfb48300077f8348-alt.m3u8",
    type: "hls"
  },
  {
    id: "GlobalNewsHalifax.ca",
    name: "Global News Halifax",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbf398b8e02600071deda5-alt.m3u8",
    type: "hls"
  },
  {
    id: "CKWSDT.ca",
    name: "Global News Kingston",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbf4964446e2000742073e-alt.m3u8",
    type: "hls"
  },
  {
    id: "GlobalNewsMontreal.ca",
    name: "Global News Montreal",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbfbd6ad95670007f567af-alt.m3u8",
    type: "hls"
  },
  {
    id: "CHEXDT.ca",
    name: "Global News Peterborough",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbfcd8c2db990007861e43-alt.m3u8",
    type: "hls"
  },
  {
    id: "CFREDT.ca",
    name: "Global News Regina",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cbff53ca8f2200080253b5-alt.m3u8",
    type: "hls"
  },
  {
    id: "CFSKDT.ca",
    name: "Global News Saskatoon",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cc00359cb58900088dc840-alt.m3u8",
    type: "hls"
  },
  {
    id: "CKNDDT.ca",
    name: "Global News Winnipeg",
    logo: "https://i.imgur.com/IpfmG93.png",
    country: "CA",
    group: "Canada",
    url: "https://i.mjh.nz/PlutoTV/62cc0120880c890007191016-alt.m3u8",
    type: "hls"
  },
  {
    id: "CPACEnglish.ca",
    name: "CPAC (EN)",
    logo: "https://i.imgur.com/AbdFD0S.png",
    country: "CA",
    group: "Canada",
    url: "https://d7z3qjdsxbwoq.cloudfront.net/groupa/live/f9809cea-1e07-47cd-a94d-2ddd3e1351db/live.isml/.m3u8",
    type: "hls"
  },
  {
    id: "IciRDI.ca",
    name: "ICI RDI",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/ICI_RDI_logo.svg/640px-ICI_RDI_logo.svg.png",
    country: "CA",
    group: "Canada",
    url: "https://rcavlive.akamaized.net/hls/live/704025/xcanrdi/master.m3u8",
    type: "hls"
  },
  {
    id: "IciTeleHD.ca",
    name: "ICI Télé HD",
    logo: "https://i.imgur.com/HsSi3NV.png",
    country: "CA",
    group: "Canada",
    url: "https://rcavlive.akamaized.net/hls/live/696615/xcancbft/master.m3u8",
    type: "hls"
  },
  {
    id: "TVA.ca",
    name: "TVA Ⓖ",
    logo: "https://i.imgur.com/1GR8Szn.png",
    country: "CA",
    group: "Canada",
    url: "https://tvalive.akamaized.net/hls/live/2012413/tva01/master.m3u8",
    type: "hls"
  },
  {
    id: "CIVMDT.ca",
    name: "Télé Québec",
    logo: "https://i.imgur.com/8grBWK9.png",
    country: "CA",
    group: "Canada",
    url: "https://bcovlive-a.akamaihd.net/575d86160eb143458d51f7ab187a4e68/us-east-1/6101674910001/playlist.m3u8",
    type: "hls"
  },
  {
    id: "CFTUDT.ca",
    name: "Savoir Média",
    logo: "https://i.imgur.com/pa4wOVY.png",
    country: "CA",
    group: "Canada",
    url: "https://hls.savoir.media/live/stream.m3u8",
    type: "hls"
  },
  {
    id: "CPACFrench.ca",
    name: "CPAC (FR)",
    logo: "https://i.imgur.com/AbdFD0S.png",
    country: "CA",
    group: "Canada",
    url: "https://bcsecurelivehls-i.akamaihd.net/hls/live/680604/1242843915001_3/master.m3u8",
    type: "hls"
  },
  {
    id: "CBFTDT.ca",
    name: "ICI Montreal",
    logo: "https://i.imgur.com/Z1b2TJD.png",
    country: "CA",
    group: "Canada",
    url: "https://amdici.akamaized.net/hls/live/873426/ICI-Live-Stream/master.m3u8",
    type: "hls"
  },
  {
    id: "Toronto360.tv",
    name: "Toronto 360 TV",
    logo: "https://i.imgur.com/PkWndsv.png",
    country: "CA",
    group: "Canada",
    url: "http://cdn3.toronto360.tv:8081/toronto360/hd/playlist.m3u8",
    type: "hls"
  },

  // --- Chad ---
  {
    id: "Tchad24.td",
    name: "Tchad 24",
    logo: "https://www.lyngsat.com/logo/tv/tt/tchad-24-td.png",
    country: "TD",
    group: "Chad",
    url: "http://102.131.58.110/out_1/index.m3u8",
    type: "hls"
  },
  {
    id: "TeleTchad.td",
    name: "Télé Tchad",
    logo: "https://upload.wikimedia.org/wikipedia/fr/b/b6/Logo_T%C3%A9l%C3%A9_Tchad.png",
    country: "TD",
    group: "Chad",
    url: "https://strhlslb01.streamakaci.tv/str_tchad_tchad/str_tchad_multi/playlist.m3u8",
    type: "hls"
  },

  // --- Chile ---
  {
    id: "UCVTV.cl",
    name: "UCV Televisión",
    logo: "https://i.imgur.com/2VL4Pts.png",
    country: "CL",
    group: "Chile",
    url: "https://unlimited1-cl-isp.dps.live/ucvtv2/ucvtv2.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "24Horas.cl",
    name: "24 horas Chile",
    logo: "https://i.imgur.com/0rF6Kub.png",
    country: "CL",
    group: "Chile",
    url: "https://mdstrm.com/live-stream-playlist/57d1a22064f5d85712b20dab.m3u8",
    type: "hls"
  },
  {
    id: "NTV.cl",
    name: "NTV",
    logo: "https://i.imgur.com/pt2Kj1A.png",
    country: "CL",
    group: "Chile",
    url: "https://mdstrm.com/live-stream-playlist/5aaabe9e2c56420918184c6d.m3u8",
    type: "hls"
  },
  {
    id: "TVChile.cl",
    name: "TV Chile",
    logo: "https://i.imgur.com/yCL888l.png",
    country: "CL",
    group: "Chile",
    url: "https://mdstrm.com/live-stream-playlist/533adcc949386ce765657d7c.m3u8",
    type: "hls"
  },
  {
    id: "TVPlus.cl",
    name: "TV+",
    logo: "https://i.imgur.com/NtuZIEJ.png",
    country: "CL",
    group: "Chile",
    url: "https://mdstrm.com/live-stream-playlist/5c0e8b19e4c87f3f2d3e6a59.m3u8",
    type: "hls"
  },
  {
    id: "UChileTV.cl",
    name: "UChile TV",
    logo: "https://i.imgur.com/mF2W8Uh.png",
    country: "CL",
    group: "Chile",
    url: "https://unlimited1-us.dps.live/uchiletv/uchiletv.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "T13.cl",
    name: "T13 en vivo",
    logo: "https://i.imgur.com/3CEijac.png",
    country: "CL",
    group: "Chile",
    url: "https://redirector.rudo.video/hls-video/10b92cafdf3646cbc1e727f3dc76863621a327fd/t13/t13.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "13E.cl",
    name: "13 Entretención",
    logo: "https://i.imgur.com/1vTno0m.png",
    country: "CL",
    group: "Chile",
    url: "https://origin.dpsgo.com/ssai/event/BBp0VeP6QtOOlH8nu3bWTg/master.m3u8",
    type: "hls"
  },
  {
    id: "13C.cl",
    name: "13 Cultura",
    logo: "https://i.imgur.com/49QkKWv.png",
    country: "CL",
    group: "Chile",
    url: "https://origin.dpsgo.com/ssai/event/GI-9cp_bT8KcerLpZwkuhw/master.m3u8",
    type: "hls"
  },
  {
    id: "13P.cl",
    name: "13 Prime",
    logo: "https://i.imgur.com/YwDFNxs.png",
    country: "CL",
    group: "Chile",
    url: "https://origin.dpsgo.com/ssai/event/p4mmBxEzSmKAxY1GusOHrw/master.m3u8",
    type: "hls"
  },
  {
    id: "13Kids.cl",
    name: "13 Kids",
    logo: "https://i.imgur.com/m6y9AMe.png",
    country: "CL",
    group: "Chile",
    url: "https://origin.dpsgo.com/ssai/event/LhHrVtyeQkKZ-Ye_xEU75g/master.m3u8",
    type: "hls"
  },
  {
    id: "13Realities.cl",
    name: "13 Realities",
    logo: "https://i.imgur.com/p1Qpljw.png",
    country: "CL",
    group: "Chile",
    url: "https://origin.dpsgo.com/ssai/event/g7_JOM0ORki9SR5RKHe-Kw/master.m3u8",
    type: "hls"
  },
  {
    id: "13T.cl",
    name: "13 Teleseries",
    logo: "https://i.imgur.com/aJMBnse.png",
    country: "CL",
    group: "Chile",
    url: "https://origin.dpsgo.com/ssai/event/f4TrySe8SoiGF8Lu3EIq1g/master.m3u8",
    type: "hls"
  },
  {
    id: "ElPinguinoTV.cl",
    name: "El Pingüino TV",
    logo: "https://i.imgur.com/ohXs2NV.png",
    country: "CL",
    group: "Chile",
    url: "https://redirector.rudo.video/hls-video/339f69c6122f6d8f4574732c235f09b7683e31a5/pinguinotv/pinguinotv.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "UCL.uy",
    name: "UCL",
    logo: "https://i.imgur.com/JxqVHPX.png",
    country: "CL",
    group: "Chile",
    url: "https://redirector.rudo.video/hls-video/c54ac2799874375c81c1672abb700870537c5223/ucl/ucl.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "D13.cl",
    name: "Deportes13",
    logo: "https://i.imgur.com/GRpxoPf.png",
    country: "CL",
    group: "Chile",
    url: "https://redirector.rudo.video/hls-video/ey6283je82983je9823je8jowowiekldk9838274/13d/13d.smil/playlist.m3u8",
    type: "hls"
  },
  {
    id: "TVN3.cl",
    name: "TVN 3",
    logo: "https://i.imgur.com/84lWqRi.png",
    country: "CL",
    group: "Chile",
    url: "https://mdstrm.com/live-stream-playlist/5653641561b4eba30a7e4929.m3u8",
    type: "hls"
  },
  {
    id: "CHVNoticias.cl",
    name: "Chilevisión Noticias",
    logo: "https://i.imgur.com/Qh6d0A9.png",
    country: "CL",
    group: "Chile",
    url: "https://redirector.rudo.video/hls-video/10b92cafdf3646cbc1e727f3dc76863621a327fd/chvn/chvn.smil/playlist.m3u8",
    type: "hls"
  },

  // --- France ---
  {
    id: "France24French.fr",
    name: "France 24",
    logo: "https://i.imgur.com/61MSiq9.png",
    country: "FR",
    group: "France",
    url: "https://www.youtube.com/c/FRANCE24/live",
    type: "youtube"
  },
  {
    id: "EuronewsFrench.fr",
    name: "Euronews Français",
    logo: "https://i.imgur.com/3Lr5iAj.png",
    country: "FR",
    group: "France",
    url: "https://www.youtube.com/euronewsfr/live",
    type: "youtube"
  },
  {
    id: "Africanews.cg",
    name: "Africanews",
    logo: "https://i.imgur.com/xocvePC.png",
    country: "FR",
    group: "France",
    url: "https://www.youtube.com/c/Africanewsfr/live",
    type: "youtube"
  },
  {
    id: "CGTNFrench.cn",
    name: "CGTN Français",
    logo: "https://i.imgur.com/fMsJYzl.png",
    country: "FR",
    group: "France",
    url: "https://news.cgtn.com/resource/live/french/cgtn-f.m3u8",
    type: "hls"
  },
  {
    id: "TV5MondeInfo.fr",
    name: "TV5 Monde Info",
    logo: "https://i.imgur.com/NcysrWH.png",
    country: "FR",
    group: "France",
    url: "https://ott.tv5monde.com/Content/HLS/Live/channel(info)/index.m3u8",
    type: "hls"
  },
  {
    id: "TV5MondeFranceBelgiumSwitzerland.fr",
    name: "TV5 Monde FBS",
    logo: "https://i.imgur.com/uPmwTo9.png",
    country: "FR",
    group: "France",
    url: "https://ott.tv5monde.com/Content/HLS/Live/channel(fbs)/index.m3u8",
    type: "hls"
  },
  {
    id: "TV5MondeEurope.fr",
    name: "TV5 Monde Europe",
    logo: "https://i.imgur.com/uPmwTo9.png",
    country: "FR",
    group: "France",
    url: "https://ott.tv5monde.com/Content/HLS/Live/channel(europe)/index.m3u8",
    type: "hls"
  },

  // --- Georgia ---
  {
    id: "1TV.ge",
    name: "First Channel (1TV)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Pirveli_Arkhi_Logo_2022.svg/512px-Pirveli_Arkhi_Logo_2022.svg.png",
    country: "GE",
    group: "Georgia",
    url: "https://tv.cdn.xsg.ge/gpb-1tv/index.m3u8",
    type: "hls"
  },
  {
    id: "2TV.ge",
    name: "First Channel /Education/ (2TV)",
    logo: "https://upload.wikimedia.org/wikipedia/ka/c/c9/2_Tv_Logo.jpg",
    country: "GE",
    group: "Georgia",
    url: "https://tv.cdn.xsg.ge/gpb-2tv/index.m3u8",
    type: "hls"
  },
  {
    id: "ImediTV.ge",
    name: "Imedi TV",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Imlogo_2020.png",
    country: "GE",
    group: "Georgia",
    url: "https://tv.cdn.xsg.ge/imedihd/index.m3u8",
    type: "hls"
  }
];
