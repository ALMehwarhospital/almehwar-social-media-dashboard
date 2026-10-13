import { creativeMediaCache } from "../data/creativeMediaCache";
export function mediaKey(url:any):string {try {const u=new URL(String(url));return u.hostname.toLowerCase().replace(/^www\./,"")+u.pathname.replace(/\/$/,"");}catch{return String(url||"");}}
export function creativeMedia(item:any) {
 const saved=creativeMediaCache[mediaKey(item.url)];
 let gallery:any[]=Array.isArray(item.mediaGallery)?item.mediaGallery:[];
 if(!gallery.length&&item.reviewMediaUrl)gallery=[{type:/video|reel/i.test(String(item.format))?"video":"image",url:item.reviewMediaUrl,previewUrl:item.previewUrl}];
 if(!gallery.length&&item.previewUrl)gallery=[{type:"image",url:item.previewUrl}];
 const local=(url:string)=>/^(images|media)\//.test(url)?`${import.meta.env.BASE_URL}${url}`:url;
 return {preview:local(saved?.preview||item.previewUrl||""),gallery:(saved?.gallery.length?saved.gallery:gallery).map(a=>({...a,url:local(a.url),previewUrl:a.previewUrl?local(a.previewUrl):undefined})),cached:Boolean(saved)};
}
