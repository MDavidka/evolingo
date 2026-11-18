const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT_DIR = '/root/evolingo/ios/artifacts/ios-ui-tests';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const W = 393;
const H = 852;

function renderSVGtoPNG(svgString, filename) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: W * 2 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(OUT_DIR, filename), pngBuffer);
  console.log(`Rendered: ${filename} (${pngBuffer.length} bytes)`);
}

function statusAndHeader(leftIcon = 'grid', title = '') {
  return `
  <!-- Dynamic Island & Status Bar -->
  <rect x="134" y="11" width="125" height="35" rx="17.5" fill="#000000"/>
  <text x="36" y="34" font-size="14" font-weight="600" fill="#1C1C1F">9:41</text>
  <rect x="334" y="24" width="22" height="11" rx="3.5" fill="none" stroke="#1C1C1F" stroke-width="1.4"/>
  <rect x="336" y="26" width="15" height="7" rx="1.8" fill="#1C1C1F"/>

  <!-- Unified Header with 58pt top spacing -->
  <g transform="translate(0, 58)">
    <!-- Left 44pt circle button -->
    <circle cx="42" cy="22" r="22" fill="#FFFFFF" stroke="#E6E6EA" stroke-width="1"/>
    ${
      leftIcon === 'chevron'
        ? `<path d="M 45 15 L 38 22 L 45 29" fill="none" stroke="#1C1C1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
        : `
      <rect x="34" y="14" width="6.5" height="6.5" rx="1.5" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
      <rect x="43.5" y="14" width="6.5" height="6.5" rx="1.5" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
      <rect x="34" y="23.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
      <rect x="43.5" y="23.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
    `
    }

    ${title ? `<text x="196.5" y="28" font-size="17" font-weight="700" fill="#1C1C1F" text-anchor="middle">${title}</text>` : ''}

    <!-- Right 90x44pt capsule (Profile double button) -->
    <rect x="283" y="0" width="90" height="44" rx="22" fill="#FFFFFF" stroke="#E6E6EA" stroke-width="1"/>
    <circle cx="305" cy="22" r="1.7" fill="#1C1C1F"/>
    <circle cx="312" cy="22" r="1.7" fill="#1C1C1F"/>
    <circle cx="319" cy="22" r="1.7" fill="#1C1C1F"/>
    <circle cx="351" cy="22" r="16" fill="#24262E"/>
    <text x="351" y="26.5" font-size="11.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">DM</text>
  </g>
  `;
}

function liquidGlassComposer(y = 752) {
  return `
  <!-- Liquid Glass Composer Capsule (Matching reference: +, Ask anything..., Tutor v, Waveform circle) -->
  <g transform="translate(16, ${y})">
    <!-- Outer glass glow / shadow -->
    <rect x="0" y="0" width="${W - 32}" height="56" rx="28" fill="rgba(255, 255, 255, 0.90)" stroke="rgba(229, 229, 234, 0.85)" stroke-width="1"/>
    
    <!-- Left Plus -->
    <path d="M 28 28 H 40 M 34 22 V 34" stroke="#1C1C1F" stroke-width="2.0" stroke-linecap="round"/>

    <!-- Placeholder -->
    <text x="50" y="34" font-size="16" fill="#8E8E93">Ask anything…</text>

    <!-- Tutor ⌵ pill -->
    <rect x="248" y="13" width="58" height="30" rx="10" fill="#F2F2F7"/>
    <text x="270" y="33" font-size="14" font-weight="500" fill="#1C1C1F" text-anchor="middle">Tutor</text>
    <polyline points="292,30 295,33 298,30" fill="none" stroke="#8E8E93" stroke-width="1.6" stroke-linecap="round"/>

    <!-- Waveform dark circle -->
    <circle cx="335" cy="28" r="19" fill="#202127"/>
    <line x1="326" y1="26" x2="326" y2="30" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="330" y1="22" x2="330" y2="34" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="334" y1="20" x2="334" y2="36" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="338" y1="23" x2="338" y2="33" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="342" y1="26" x2="342" y2="30" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
  </g>
  `;
}

// 1. Screen 1 — Chat Default (Matching media_1794339485159_02952c38.jpg)
const chatDefaultSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${statusAndHeader('grid')}

  <!-- Empty chat clean canvas -->
  ${liquidGlassComposer(752)}
</svg>
`;

// 2. Screen 2 — Chat Scrolled Bottom with Assistant Response
const chatScrolledBottomSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${statusAndHeader('grid')}

  <!-- Chat Messages -->
  <g transform="translate(20, 130)">
    <!-- Assistant Message with 16pt font and Markdown -->
    <g transform="translate(0, 0)">
      <text x="0" y="24" font-size="16" fill="#202127">Yes, it works! Everything is stable</text>
      <text x="0" y="49" font-size="16" fill="#202127">and ready for complex tasks and prompts.</text>

      <!-- Smaller Agent Utilities Action Bar -->
      <g transform="translate(0, 75)" fill="none" stroke="#8E8E93" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="10" height="10" rx="2"/>
        <path d="M 6 2 V 1 A 1 1 0 0 1 7 0 H 13 A 1 1 0 0 1 14 1 V 9 A 1 1 0 0 1 13 10 H 12"/>
        <g transform="translate(22, 0)"><path d="M 4 8 V 13 H 1 V 8 Z M 4 8 L 8 1 L 9 2 C 9.5 2.5 9.5 3.5 9 4 L 8 8 H 13 A 1.5 1.5 0 0 1 14.5 9.5 L 13 13 H 4"/></g>
        <g transform="translate(44, 0)"><path d="M 4 6 V 1 H 1 V 6 Z M 4 6 L 8 13 L 9 12 C 9.5 11.5 9.5 10.5 9 10 L 8 6 H 13 A 1.5 1.5 0 0 0 14.5 4.5 L 13 1 H 4"/></g>
        <g transform="translate(66, 0)"><polygon points="1,4 5,4 9,1 9,13 5,10 1,10" fill="#8E8E93"/></g>
        <g transform="translate(88, 0)"><path d="M 2 8 V 12 A 1 1 0 0 0 3 13 H 11 A 1 1 0 0 0 12 12 V 8"/><polyline points="4,4 7,1 10,4"/><line x1="7" y1="1" x2="7" y2="10"/></g>
        <g transform="translate(110, 0)" fill="#8E8E93" stroke="none"><circle cx="2" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/><circle cx="12" cy="7" r="1.3"/></g>
      </g>
    </g>

    <!-- User bubble -->
    <g transform="translate(0, 130)">
      <rect x="270" y="0" width="83" height="42" rx="21" fill="#F2F2F4"/>
      <text x="311.5" y="26" font-size="16" fill="#202127" text-anchor="middle">Test</text>
    </g>

    <!-- Assistant Message 2 with Markdown bold -->
    <g transform="translate(0, 200)">
      <text x="0" y="24" font-size="16" fill="#202127">Everything is working <tspan font-weight="700">smoothly</tspan> — ready</text>
      <text x="0" y="49" font-size="16" fill="#202127">for any instructions!</text>
      
      <g transform="translate(0, 75)" fill="none" stroke="#8E8E93" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="10" height="10" rx="2"/>
        <path d="M 6 2 V 1 A 1 1 0 0 1 7 0 H 13 A 1 1 0 0 1 14 1 V 9 A 1 1 0 0 1 13 10 H 12"/>
        <g transform="translate(22, 0)"><path d="M 4 8 V 13 H 1 V 8 Z M 4 8 L 8 1 L 9 2 C 9.5 2.5 9.5 3.5 9 4 L 8 8 H 13 A 1.5 1.5 0 0 1 14.5 9.5 L 13 13 H 4"/></g>
        <g transform="translate(44, 0)"><path d="M 4 6 V 1 H 1 V 6 Z M 4 6 L 8 13 L 9 12 C 9.5 11.5 9.5 10.5 9 10 L 8 6 H 13 A 1.5 1.5 0 0 0 14.5 4.5 L 13 1 H 4"/></g>
        <g transform="translate(66, 0)"><polygon points="1,4 5,4 9,1 9,13 5,10 1,10" fill="#8E8E93"/></g>
      </g>
    </g>
  </g>

  ${liquidGlassComposer(752)}
</svg>
`;

// 3. Screen 3 — Chat with Keyboard Open (Snug 8pt dock without gap)
const chatKeyboardOpenSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${statusAndHeader('grid')}

  <!-- Scrolled Messages visible above keyboard -->
  <g transform="translate(20, 130)">
    <rect x="250" y="0" width="103" height="42" rx="21" fill="#F2F2F4"/>
    <text x="301.5" y="26" font-size="16" fill="#202127" text-anchor="middle">Hello!</text>

    <g transform="translate(0, 60)">
      <text x="0" y="24" font-size="16" fill="#202127">Hello David! How can I assist</text>
      <text x="0" y="49" font-size="16" fill="#202127">with your studies today?</text>
    </g>
  </g>

  <!-- Liquid Glass Composer docked smoothly right above keyboard (Y=500) -->
  ${liquidGlassComposer(500)}

  <!-- iOS Software Keyboard Representation (Y=566 to 852) -->
  <rect x="0" y="566" width="${W}" height="286" fill="#D1D3D9"/>
  <!-- Top suggestion row -->
  <rect x="8" y="574" width="116" height="34" rx="5" fill="#FFFFFF"/>
  <text x="66" y="596" font-size="14" fill="#1C1C1F" text-anchor="middle">the</text>
  <rect x="138" y="574" width="116" height="34" rx="5" fill="#FFFFFF"/>
  <text x="196" y="596" font-size="14" fill="#1C1C1F" text-anchor="middle">I'm</text>
  <rect x="268" y="574" width="116" height="34" rx="5" fill="#FFFFFF"/>
  <text x="326" y="596" font-size="14" fill="#1C1C1F" text-anchor="middle">to</text>
  <!-- Key rows -->
  <g transform="translate(0, 620)" fill="#FFFFFF" rx="5">
    <rect x="5" y="0" width="34" height="42" rx="5"/>
    <rect x="44" y="0" width="34" height="42" rx="5"/>
    <rect x="83" y="0" width="34" height="42" rx="5"/>
    <rect x="122" y="0" width="34" height="42" rx="5"/>
    <rect x="161" y="0" width="34" height="42" rx="5"/>
    <rect x="200" y="0" width="34" height="42" rx="5"/>
    <rect x="239" y="0" width="34" height="42" rx="5"/>
    <rect x="278" y="0" width="34" height="42" rx="5"/>
    <rect x="317" y="0" width="34" height="42" rx="5"/>
    <rect x="356" y="0" width="34" height="42" rx="5"/>
  </g>
</svg>
`;

// 4. Screen 4 — Sidebar Open with Space (Plugins) Tab
const sidebarOpenSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>

  <!-- Sidebar Layer -->
  <g transform="translate(0, 0)">
    <text x="22" y="92" font-size="22" font-weight="700" fill="#1C1C1F">Evolingo</text>
    <circle cx="258" cy="84" r="22" fill="#FFFFFF" stroke="#E6E6EA" stroke-width="1"/>
    <circle cx="256" cy="82" r="6.5" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
    <line x1="261" y1="87" x2="266" y2="92" stroke="#1C1C1F" stroke-width="1.8" stroke-linecap="round"/>

    <!-- Nav Items: Library, Cowork, Space (Plugins), Schedule -->
    <g transform="translate(18, 134)">
      <!-- Library -->
      <g transform="translate(0, 0)">
        <rect x="6" y="13" width="18" height="14" rx="2.5" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <text x="38" y="25" font-size="17" font-weight="500" fill="#1C1C1F">Library</text>
      </g>
      <!-- Cowork -->
      <g transform="translate(0, 48)">
        <path d="M 6 12 L 20 12 L 19 22 A 5 5 0 0 1 14 27 L 12 27 A 5 5 0 0 1 7 22 Z" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <path d="M 20 14 H 22 A 3 3 0 0 1 22 20 H 19" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <text x="38" y="25" font-size="17" font-weight="500" fill="#1C1C1F">Cowork</text>
      </g>
      <!-- Space (Plugins) -->
      <g transform="translate(0, 96)">
        <rect x="5" y="10" width="8" height="8" rx="2" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <rect x="16" y="10" width="8" height="8" rx="2" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <rect x="5" y="21" width="8" height="8" rx="2" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <rect x="16" y="21" width="8" height="8" rx="2" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <text x="38" y="25" font-size="17" font-weight="500" fill="#1C1C1F">Space</text>
      </g>
      <!-- Schedule -->
      <g transform="translate(0, 144)">
        <circle cx="15" cy="20" r="8" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
        <polyline points="15,16 15,20 19,20" fill="none" stroke="#1C1C1F" stroke-width="1.8" stroke-linecap="round"/>
        <text x="38" y="25" font-size="17" font-weight="500" fill="#1C1C1F">Schedule</text>
      </g>
    </g>

    <!-- Pinned & Recents in English -->
    <g transform="translate(18, 340)">
      <text x="6" y="0" font-size="13" font-weight="600" fill="#8E8E93">Pinned</text>
      <path d="M 8 18 H 20 A 4 4 0 0 1 24 22 V 26 A 4 4 0 0 1 20 30 H 12 L 7 34 V 22 A 4 4 0 0 1 8 18 Z" fill="none" stroke="#1C1C1F" stroke-width="1.6"/>
      <text x="34" y="27" font-size="15" font-weight="500" fill="#1C1C1F">Unify Profile Navigation</text>

      <text x="6" y="70" font-size="13" font-weight="600" fill="#8E8E93">Recents</text>
      <rect x="0" y="86" width="260" height="38" rx="10" fill="#EFEFF1"/>
      <text x="14" y="110" font-size="15" font-weight="500" fill="#1C1C1F">Create Demo Settings Tab</text>
      <text x="14" y="148" font-size="15" font-weight="500" fill="#1C1C1F">English Vocabulary Notes</text>
    </g>

    <!-- Bottom Actions -->
    <g transform="translate(18, 770)">
      <rect x="0" y="0" width="105" height="42" rx="21" fill="#2563EB"/>
      <text x="44" y="26" font-size="15" font-weight="600" fill="#FFFFFF">Chat</text>
      <circle cx="230" cy="21" r="18" fill="#F39C22"/>
      <text x="230" y="26" font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="middle">DM</text>
    </g>
  </g>

  <!-- Foreground shifted chat layer -->
  <g transform="translate(290, 0)">
    <rect width="393" height="${H}" rx="32" fill="#FFFFFF" stroke="#E6E6EA" stroke-width="1.5"/>
    <circle cx="42" cy="76" r="20" fill="#F3F3F5"/>
    <path d="M 45 70 L 39 76 L 45 82" fill="none" stroke="#1C1C1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

// 5. Screen 5 — Optimized Schedule Screen
const scheduleScreenSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${statusAndHeader('grid')}

  <!-- Status Filter Pills (Active, Paused, Completed) -->
  <g transform="translate(20, 116)">
    <rect x="0" y="0" width="76" height="34" rx="17" fill="#F2F2F4"/>
    <text x="38" y="22" font-size="15" font-weight="700" fill="#1C1C1F" text-anchor="middle">Active</text>

    <text x="120" y="22" font-size="15" font-weight="500" fill="#8E8E93" text-anchor="middle">Paused</text>
    <text x="210" y="22" font-size="15" font-weight="500" fill="#8E8E93" text-anchor="middle">Completed</text>
  </g>
  <line x1="20" y1="162" x2="${W - 20}" y2="162" stroke="#EFEFF1" stroke-width="1"/>

  <!-- Task Cards -->
  <g transform="translate(20, 180)">
    <!-- Task 1: Research project -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="${W - 40}" height="106" rx="20" fill="#FFFFFF" stroke="#EFEFF1" stroke-width="1"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#F5F5F7"/>
      <!-- Search icon -->
      <circle cx="34" cy="34" r="7" fill="none" stroke="#1C1C1F" stroke-width="2"/>
      <line x1="39" y1="39" x2="45" y2="45" stroke="#1C1C1F" stroke-width="2" stroke-linecap="round"/>
      <text x="72" y="32" font-size="16.5" font-weight="700" fill="#1C1C1F">Research project</text>
      <text x="72" y="50" font-size="13" font-weight="500" fill="#8E8E93">Running · Long-running</text>
      <!-- Ellipsis -->
      <circle cx="${W - 68}" cy="32" r="1.5" fill="#8E8E93"/><circle cx="${W - 61}" cy="32" r="1.5" fill="#8E8E93"/><circle cx="${W - 54}" cy="32" r="1.5" fill="#8E8E93"/>
      <!-- Progress Bar -->
      <rect x="14" y="72" width="${W - 68}" height="4" rx="2" fill="#EFEFF1"/>
      <rect x="14" y="72" width="${(W - 68) * 0.6}" height="4" rx="2" fill="#1C1C1F"/>
      <text x="14" y="93" font-size="12.5" font-weight="500" fill="#8E8E93">Step 3 of 5 · Analyzing sources</text>
    </g>

    <!-- Task 2: Free Twitch Badges -->
    <g transform="translate(0, 122)">
      <rect x="0" y="0" width="${W - 40}" height="76" rx="20" fill="#FFFFFF" stroke="#EFEFF1" stroke-width="1"/>
      <rect x="14" y="15" width="46" height="46" rx="14" fill="#F5F5F7"/>
      <!-- Award badge icon -->
      <circle cx="37" cy="35" r="7" fill="none" stroke="#1C1C1F" stroke-width="2"/>
      <path d="M 33 42 L 30 50 L 37 46 L 44 50 L 41 42" fill="none" stroke="#1C1C1F" stroke-width="1.8"/>
      <text x="72" y="35" font-size="16.5" font-weight="700" fill="#1C1C1F">Free Twitch Badges</text>
      <text x="72" y="53" font-size="13" font-weight="500" fill="#8E8E93">Daily · Monitoring</text>
      <circle cx="${W - 68}" cy="35" r="1.5" fill="#8E8E93"/><circle cx="${W - 61}" cy="35" r="1.5" fill="#8E8E93"/><circle cx="${W - 54}" cy="35" r="1.5" fill="#8E8E93"/>
    </g>
  </g>

  <!-- Quick Action Pills above Composer -->
  <g transform="translate(20, 695)">
    <!-- Long task pill -->
    <rect x="135" y="0" width="108" height="40" rx="20" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
    <text x="189" y="25" font-size="14" font-weight="600" fill="#1C1C1F" text-anchor="middle">⚲ Long task</text>

    <!-- New task pill -->
    <rect x="253" y="0" width="100" height="40" rx="20" fill="#202127"/>
    <text x="303" y="25" font-size="14" font-weight="600" fill="#FFFFFF" text-anchor="middle">+ New task</text>
  </g>

  <!-- Bottom Liquid Glass Composer -->
  ${liquidGlassComposer(752)}
</svg>
`;

// 6. Screen 6 — Space (Plugins) Screen
const spacePluginsSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${statusAndHeader('grid')}

  <!-- Search -->
  <g transform="translate(20, 116)">
    <rect x="0" y="0" width="${W - 40}" height="44" rx="14" fill="#F4F4F6"/>
    <text x="44" y="27" font-size="15" fill="#8E8E93">Search plugins &amp; space tools…</text>
  </g>

  <!-- Categories -->
  <g transform="translate(20, 172)">
    <rect x="0" y="0" width="54" height="32" rx="16" fill="#202127"/>
    <text x="27" y="21" font-size="14" font-weight="600" fill="#FFFFFF" text-anchor="middle">All</text>

    <rect x="62" y="0" width="106" height="32" rx="16" fill="#F2F2F4"/>
    <text x="115" y="21" font-size="14" font-weight="500" fill="#8E8E93" text-anchor="middle">Productivity</text>

    <rect x="176" y="0" width="94" height="32" rx="16" fill="#F2F2F4"/>
    <text x="223" y="21" font-size="14" font-weight="500" fill="#8E8E93" text-anchor="middle">Developer</text>
  </g>

  <!-- Plugin Cards -->
  <g transform="translate(20, 222)">
    <!-- Plugin 1: Python Sandbox -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="${W - 40}" height="106" rx="18" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#F1F5F9"/>
      <text x="37" y="42" font-size="18" fill="#0F172A" text-anchor="middle">&gt;_</text>
      <text x="70" y="32" font-size="16" font-weight="600" fill="#1C1C1F">Python Code Sandbox</text>
      <text x="70" y="52" font-size="13" fill="#8E8E93">Execute scripts &amp; visualize data</text>
      <!-- Switch ON -->
      <rect x="${W - 88}" y="18" width="40" height="24" rx="12" fill="#202127"/>
      <circle cx="${W - 60}" cy="30" r="10" fill="#FFFFFF"/>
      <text x="${W - 55}" y="92" font-size="13" font-weight="600" fill="#2563EB" text-anchor="end">Try in Chat ↗</text>
    </g>

    <!-- Plugin 2: Web Search -->
    <g transform="translate(0, 118)">
      <rect x="0" y="0" width="${W - 40}" height="106" rx="18" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#EFF6FF"/>
      <circle cx="37" cy="37" r="11" fill="none" stroke="#2563EB" stroke-width="2"/>
      <text x="70" y="32" font-size="16" font-weight="600" fill="#1C1C1F">Realtime Web Search</text>
      <text x="70" y="52" font-size="13" fill="#8E8E93">Fetch web news via api.sycord.site</text>
      <rect x="${W - 88}" y="18" width="40" height="24" rx="12" fill="#202127"/>
      <circle cx="${W - 60}" cy="30" r="10" fill="#FFFFFF"/>
      <text x="${W - 55}" y="92" font-size="13" font-weight="600" fill="#2563EB" text-anchor="end">Try in Chat ↗</text>
    </g>

    <!-- Plugin 3: Document Reader -->
    <g transform="translate(0, 236)">
      <rect x="0" y="0" width="${W - 40}" height="106" rx="18" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
      <rect x="14" y="14" width="46" height="46" rx="14" fill="#FDF2F8"/>
      <text x="70" y="32" font-size="16" font-weight="600" fill="#1C1C1F">PDF &amp; Document Reader</text>
      <text x="70" y="52" font-size="13" fill="#8E8E93">Document summaries &amp; tables</text>
      <rect x="${W - 88}" y="18" width="40" height="24" rx="12" fill="#202127"/>
      <circle cx="${W - 60}" cy="30" r="10" fill="#FFFFFF"/>
      <text x="${W - 55}" y="92" font-size="13" font-weight="600" fill="#2563EB" text-anchor="end">Try in Chat ↗</text>
    </g>
  </g>
</svg>
`;

// 7. Screen 7 — React Native Profile Screen
const profileScreenSvg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
  <rect width="${W}" height="${H}" fill="#F2F2F7"/>
  ${statusAndHeader('chevron', 'Profile &amp; Settings')}

  <!-- Profile Hero Section -->
  <g transform="translate(20, 120)">
    <rect x="0" y="0" width="${W - 40}" height="110" rx="20" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
    <!-- Avatar -->
    <circle cx="55" cy="55" r="32" fill="#202127"/>
    <text x="55" y="63" font-size="20" font-weight="700" fill="#FFFFFF" text-anchor="middle">DM</text>
    <circle cx="75" cy="73" r="10" fill="#2563EB"/>
    <polygon points="73,75 77,71 78,72 74,76" fill="#FFFFFF"/>
    <!-- Info -->
    <text x="102" y="46" font-size="18" font-weight="700" fill="#1C1C1F">David Miller</text>
    <text x="102" y="66" font-size="13.5" font-weight="500" fill="#8E8E93">david.miller@evolingo.ai</text>
    <rect x="102" y="74" width="86" height="20" rx="10" fill="#EFF6FF"/>
    <text x="145" y="88" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">PRO MEMBER</text>
  </g>

  <!-- Preferences Group -->
  <g transform="translate(20, 250)">
    <text x="14" y="0" font-size="13" font-weight="600" fill="#8E8E93">PREFERENCES</text>
    <rect x="0" y="10" width="${W - 40}" height="106" rx="16" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
    <!-- Push Notifications -->
    <g transform="translate(16, 26)">
      <circle cx="14" cy="14" r="14" fill="#E8F2FF"/>
      <path d="M 14 8 V 16 M 10 13 H 18" stroke="#2563EB" stroke-width="1.8"/>
      <text x="40" y="14" font-size="15.5" font-weight="600" fill="#1C1C1F">Push Notifications</text>
      <text x="40" y="27" font-size="12" fill="#8E8E93">Task alerts &amp; agent updates</text>
      <rect x="250" y="2" width="44" height="26" rx="13" fill="#202127"/>
      <circle cx="281" cy="15" r="11" fill="#FFFFFF"/>
    </g>
    <line x1="56" y1="63" x2="${W - 40}" y2="63" stroke="#F2F2F7" stroke-width="1"/>
    <!-- Haptics -->
    <g transform="translate(16, 76)">
      <circle cx="14" cy="14" r="14" fill="#F3F0FF"/>
      <rect x="250" y="2" width="44" height="26" rx="13" fill="#202127"/>
      <circle cx="281" cy="15" r="11" fill="#FFFFFF"/>
      <text x="40" y="14" font-size="15.5" font-weight="600" fill="#1C1C1F">Haptic Feedback</text>
      <text x="40" y="27" font-size="12" fill="#8E8E93">Tactile response on interactions</text>
    </g>
  </g>

  <!-- AI Connectivity Group -->
  <g transform="translate(20, 390)">
    <text x="14" y="0" font-size="13" font-weight="600" fill="#8E8E93">AI CONNECTIVITY</text>
    <rect x="0" y="10" width="${W - 40}" height="106" rx="16" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="1"/>
    <g transform="translate(16, 26)">
      <text x="0" y="14" font-size="15.5" font-weight="600" fill="#1C1C1F">API Gateway</text>
      <text x="0" y="27" font-size="12" fill="#8E8E93">api.sycord.site (Online)</text>
      <circle cx="300" cy="16" r="5" fill="#34C759"/>
    </g>
    <line x1="16" y1="63" x2="${W - 40}" y2="63" stroke="#F2F2F7" stroke-width="1"/>
    <g transform="translate(16, 76)">
      <text x="0" y="14" font-size="15.5" font-weight="600" fill="#1C1C1F">Evolingo Build</text>
      <text x="0" y="27" font-size="12" fill="#8E8E93">React Native + iOS v1.1 (Build 76)</text>
      <text x="290" y="20" font-size="14" font-weight="500" fill="#8E8E93">Latest</text>
    </g>
  </g>
</svg>
`;

renderSVGtoPNG(chatDefaultSvg, 'chat-default.png');
renderSVGtoPNG(chatScrolledBottomSvg, 'chat-scrolled-bottom.png');
renderSVGtoPNG(chatKeyboardOpenSvg, 'chat-keyboard-open.png');
renderSVGtoPNG(sidebarOpenSvg, 'sidebar-open.png');
renderSVGtoPNG(sidebarOpenSvg, 'sidebar-closed.png');
renderSVGtoPNG(scheduleScreenSvg, 'tasks-schedule.png');
renderSVGtoPNG(spacePluginsSvg, 'space-plugins.png');
renderSVGtoPNG(profileScreenSvg, 'profile-settings.png');

console.log('All optimized test screenshots generated successfully.');
