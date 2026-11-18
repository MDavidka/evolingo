import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const icons=await import(root+'/node_modules/@tabler/icons-react/dist/esm/tabler-icons-react.mjs');
const React=await import(root+'/node_modules/react/index.js');
const {renderToStaticMarkup}=await import(root+'/node_modules/react-dom/server.node.js');
const old=JSON.parse(fs.readFileSync(root+'/ios/ThirdParty/Lucide/manifest.json'));
const map=Object.fromEntries(`rotate-cw:Refresh square-arrow-out-up-right:ExternalLink undo-2:ArrowBackUp bell-dot:BellRinging zap:Bolt messages-square:Messages calendar-clock:CalendarTime code-xml:Code rotate-ccw:History ellipsis:Dots circle-alert:AlertCircle triangle-alert:AlertTriangle hard-drive:DeviceFloppy hard-drive-download:Download footprints:Walk thumbs-down:ThumbDown thumbs-up:ThumbUp info:InfoCircle smartphone:DeviceMobile lightbulb:Bulb list-todo:ListCheck list-ordered:ListNumbers circle-minus:CircleMinus pause:PlayerPause circle-pause:PlayerPause users:Users circle-user:UserCircle image:Photo circle-play:PlayerPlay workflow:Sitemap columns-2:LayoutColumns sliders-horizontal:AdjustmentsHorizontal volume-2:Volume share-2:Share square-pen:Edit circle-stop:PlayerStop text-cursor-input:CursorText audio-lines:WaveSine circle-x:CircleX pointer:HandFinger`.split(' ').map(x=>x.split(':')));
const dir=root+'/ios/ThirdParty/Tabler';fs.mkdirSync(dir+'/svg',{recursive:true});
const symbols={};
const extra={"chevron.up":"IconChevronUp","shippingbox":"IconBox","slider.horizontal.2":"IconAdjustmentsHorizontal","terminal":"IconTerminal2","chart.bar":"IconChartBar","cup.and.saucer.fill":"IconCoffee","bubble.left":"IconMessageCircle","camera.fill":"IconCamera","link":"IconLink","lock.shield":"IconShieldLock","moon.fill":"IconMoon","sun.max.fill":"IconSun","circle.lefthalf.filled":"IconCircleHalf2","cloud":"IconCloud","mic":"IconMicrophone","workflow":"IconSitemap","arrow.triangle.branch":"IconGitBranch","stop.circle.fill":"IconPlayerStop","speaker.slash.fill":"IconVolumeOff"};
for(const [symbol,name] of Object.entries({...old.symbols,...extra})) {
 const exportName=name.startsWith('Icon') ? name : 'Icon'+(map[name]??name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(''));
 if(!icons[exportName]) throw Error(exportName);
 symbols[symbol]=exportName;
 fs.writeFileSync(dir+'/svg/'+exportName+'.svg',renderToStaticMarkup(React.createElement(icons[exportName])));
}
fs.writeFileSync(dir+'/manifest.json',JSON.stringify({version:JSON.parse(fs.readFileSync(root+'/node_modules/@tabler/icons-react/package.json')).version,symbols},null,2));
fs.copyFileSync(root+'/node_modules/@tabler/icons-react/LICENSE',dir+'/LICENSE');
