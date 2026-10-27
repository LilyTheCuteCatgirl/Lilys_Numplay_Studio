/* NumPlay game save catalog: expanded game-specific editors.
 * Each section has its own registration scope; binary.js supplies format
 * validation and the shared Save Vault UI. No USB logic lives here.
 * Sources: Mason363/NumPlay game save formats.
 */

// Game progress and arcade saves.
'use strict';
(() => {
  const register = window.NumPlayBinarySave?.register;
  if (typeof register !== 'function') {
    console.error('Save stats readers are unavailable.');
    return;
  }

  // Five Nights at Freddy's: magic, version, night, achievement stars, options.
  register({
    id: 'fnaf', title: "Five Nights at Freddy's", record: 'fnaf.sav',
    magicText: 'FNAF', versionByte: 1, exactSize: 12,
    fields: [
      { label: 'Night reached', offset: 5, type: 'u8', min: 1, max: 5, summary: true },
      { label: 'Keys guide seen', offset: 7, type: 'u8', max: 1, readonly: true, group: 'Preferences' },
      ...['Freddy', 'Bonnie', 'Chica', 'Foxy'].map((name, i) => ({
        label: name + ' custom difficulty', offset: 8 + i, type: 'u8', max: 20,
        group: 'Custom Night'
      }))
    ],
    bits: [{ label: 'Stars earned', offset: 6, type: 'u8',
      names: ['Star 1', 'Star 2', 'Star 3'], summary: true }]
  });

  // Level Devil: bit flags for completed levels and totals. No checksum.
  register({
    id: 'leveldevil', title: 'Level Devil', record: 'leveldevil.sav',
    magicByte: 76, versionByte: 1, exactSize: 48,
    fields: [
      { label: 'Levels unlocked', offset: 3, type: 'u8', min: 1, max: 16, summary: true },
      { label: 'Total deaths', offset: 8, type: 'u32', summary: true },
      { label: 'Level currently played (zero-based)', offset: 4, type: 'u8', max: 15, readonly: true },
      { label: 'Deaths in current level', offset: 12, type: 'u16', readonly: true },
      ...Array.from({ length: 16 }, (_, i) => ({
        label: 'Level ' + (i + 1) + ' best (deaths)', offset: 16 + i * 2,
        type: 'u16', readonly: true, group: 'Best runs (0 can mean no deaths)'
      }))
    ],
    bits: [{ label: 'Completed levels', offset: 6, type: 'u16',
      names: Array.from({ length: 16 }, (_, i) => 'Level ' + (i + 1)), summary: true }],
    checkSave(view) {
      if (view.getUint8(4) >= view.getUint8(3))
        throw Error('The current level cannot be higher than the unlocked levels.');
    }
  });

  // Plants vs. Zombies: four magic bytes, followed directly by Progress.
  // pvzlevel.sav is left completely untouched (it holds an ongoing battle).
  register({
    id: 'pvz', title: 'Plants vs. Zombies', record: 'pvz.sav',
    magicText: 'PVZ1', exactSize: 36,
    fields: [
      { label: 'Next adventure level', offset: 4, type: 'u8', min: 1, max: 50, summary: true },
      { label: 'Coins / money', offset: 12, type: 'u32', summary: true },
      { label: 'Adventures completed', offset: 5, type: 'u8', summary: true },
      { label: 'Seed slots', offset: 6, type: 'u8', min: 6, max: 10 },
      { label: 'Rake uses left', offset: 7, type: 'u8' },
      { label: 'Crazy Dave conversations', offset: 16, type: 'u32', readonly: true, group: 'Other progress' }
    ],
    bits: [{ label: 'Items unlocked', offset: 8, type: 'u16',
      names: ['Shovel', 'Almanac', 'Shop', 'Pool cleaner', 'Roof cleaner', 'First aid', 'Trophy'] }]
  });

  // Turbo Rush: checked FNV-1a file; the saved race remains unchanged.
  register({
    id: 'turborush', title: 'Turbo Rush', record: 'turborush.sav',
    magic: 0x31555254, version: 1, sizeField: 'full16', exactSize: 492, checksum: 'fnv',
    fields: [
      { label: 'Credits', offset: 8, type: 'u32', max: 9999999, summary: true },
      { label: 'Races entered', offset: 12, type: 'u32', max: 999999, summary: true },
      { label: 'Races won', offset: 16, type: 'u32', max: 999999, summary: true },
      { label: 'Grand Prix titles', offset: 20, type: 'u32', max: 999999 },
      ...['Engine', 'Grip', 'Brakes', 'Boost'].map((name, i) => ({
        label: name + ' upgrade level', offset: 72 + i, type: 'u8', max: 4, group: 'Upgrades'
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        label: 'Track ' + (i + 1) + ' best (ms)', offset: 24 + i * 4,
        type: 'u32', max: 660000, readonly: true, group: 'Race records'
      }))
    ],
    checkSave(view) {
      const races = view.getUint32(12, true);
      if (view.getUint32(16, true) > races || view.getUint32(20, true) > races)
        throw Error('Race wins and titles cannot exceed races entered.');
    }
  });

  // PolyTrack: the saved ghosts are a separate file and are not edited here.
  register({
    id: 'polytrack', title: 'PolyTrack', record: 'polytrack.sav',
    magic: 0x314b5450, version: 1, sizeField: 'full16', exactSize: 768, checksum: 'fnv',
    fields: [
      { label: 'Finishes', offset: 756, type: 'u32', summary: true },
      { label: 'Selected track (zero-based)', offset: 760, type: 'u8', max: 16, readonly: true },
      { label: 'Car paint', offset: 761, type: 'u8', max: 7 },
      ...Array.from({ length: 17 }, (_, i) => ({
        label: 'Track ' + (i + 1) + ' best (ms, 0 = none)', offset: 8 + i * 4,
        type: 'u32', max: 5999998, readonly: true, summary: i === 0, group: 'Track records'
      }))
    ]
  });

  // Tomb of the Mask: checked file, upgrades and unlocked masks.
  register({
    id: 'tombofthemask', title: 'Tomb of the Mask', record: 'tombofthemask.sav',
    magic: 0x4d544f54, version: 1, sizeField: 'full16', exactSize: 296, checksum: 'fnv',
    fields: [
      { label: 'Coins', offset: 8, type: 'u32', summary: true },
      { label: 'Best score', offset: 12, type: 'u32', summary: true },
      { label: 'Lifetime XP', offset: 16, type: 'u32' },
      { label: 'Furthest stage unlocked (zero-based)', offset: 249, type: 'u8', max: 199, summary: true },
      { label: 'Selected mask (zero-based)', offset: 250, type: 'u8', max: 15, readonly: true },
      { label: 'Shields held', offset: 251, type: 'u8', max: 10 },
      ...['Coin addict', 'Freeze', 'Magnet', 'Score booster'].map((name, i) => ({
        label: name + ' upgrade', offset: 252 + i, type: 'u8', max: 9, group: 'Power-ups'
      }))
    ],
    bits: [{ label: 'Masks owned', offset: 256, type: 'u16', keepFirst: true,
      names: ['Travelboy', 'Cyclop', 'Crow', 'Dog', 'Kitty', 'Pirate', 'Rabbit', 'Shapito',
        'Skull', 'Voodoo', 'Koala', 'Piggy', 'Robot', 'Froggy', 'Knight', 'Agent'] }],
    checkSave(view) {
      const mask = view.getUint8(250);
      if (!(view.getUint16(256, true) & (1 << mask)))
        throw Error('The selected mask must remain unlocked.');
    }
  });

  // Angry Birds: the 429-level score board is large; edit a short selection.
  // Level-clear flags and Eagle progress are left untouched.
  register({
    id: 'angrybirds', title: 'Angry Birds', record: 'angrybirds.sav',
    magic: 0x31534241, version: 1, sizeField: 'full16', exactSize: 3032, checksum: 'fnv',
    fields: [
      { label: 'Last level played (zero-based)', offset: 3012, type: 'u16', max: 428, readonly: true },
      { label: 'Play time (seconds)', offset: 3024, type: 'u32', readonly: true, summary: true },
      ...Array.from({ length: 12 }, (_, i) => [
        { label: 'Level ' + (i + 1) + ' best score', offset: 8 + i * 4, type: 'u32',
          summary: i === 0, group: 'First 12 levels' },
        { label: 'Level ' + (i + 1) + ' stars', offset: 1724 + i, type: 'u8', max: 3,
          group: 'First 12 levels' }
      ]).flat()
    ]
  });

  // Solitaire: game statistics, kept separately from the current card layout.
  register({
    id: 'solitaire', title: 'Solitaire', record: 'solitaire.sav',
    magicByte: 83, versionByte: 1, exactSize: 116,
    fields: [
      { label: 'Games played', offset: 16, type: 'u16', summary: true },
      { label: 'Games won', offset: 18, type: 'u16', summary: true },
      { label: 'Current win streak', offset: 20, type: 'u16' },
      { label: 'Best win streak', offset: 22, type: 'u16', summary: true },
      { label: 'Best winning time (seconds, 0 = none)', offset: 24, type: 'u16' },
      { label: 'Moves in current game', offset: 26, type: 'u16', readonly: true, group: 'Saved game' },
      { label: 'Saved game running', offset: 6, type: 'u8', max: 1, readonly: true, group: 'Saved game' }
    ],
    checkSave(view) {
      const played = view.getUint16(16, true), won = view.getUint16(18, true);
      if (won > played || view.getUint16(20, true) > won ||
          view.getUint16(22, true) < view.getUint16(20, true))
        throw Error('Games won and streaks must remain consistent with games played.');
    }
  });

  // Minesweeper: records are in tenths of a second.
  register({
    id: 'minesweeper', title: 'Minesweeper', record: 'mines.sav',
    magicByte: 77, versionByte: 1, exactSize: 276,
    fields: [
      ...['Beginner', 'Intermediate', 'Expert'].flatMap((name, i) => [
        { label: name + ' best time (tenths, 0 = none)', offset: 8 + i * 2, type: 'u16',
          max: 9999, summary: i === 0, group: 'Best times' },
        { label: name + ' games played', offset: 14 + i * 2, type: 'u16',
          group: 'Games played' },
        { label: name + ' games won', offset: 20 + i * 2, type: 'u16',
          group: 'Games won' }
      ]),
      { label: 'Current difficulty (zero-based)', offset: 2, type: 'u8', max: 3,
        readonly: true, group: 'Saved game' },
      { label: 'Current game elapsed (ms)', offset: 4, type: 'u32',
        readonly: true, group: 'Saved game' }
    ],
    checkSave(view) {
      for (let i = 0; i < 3; i++) if (view.getUint16(20 + i * 2, true) > view.getUint16(14 + i * 2, true))
        throw Error('Games won cannot exceed games played.');
    }
  });
})();


// Expanded adventure and classic games.
'use strict';
(() => {
  const register = window.NumPlayBinarySave?.register;
  if (typeof register !== 'function') return;

  // NumDash: NDS1/v2, 192 bytes, CRC32 of bytes 8..191.
  // Custom level records are never edited here.
  register({id:'numdash',title:'NumDash',record:'numdash.nds',magicText:'NDS1',exactSize:192,checksum:'ndcrc',
    validate(v){if(v.getUint8(8)!==2||v.getUint8(9)!==12||v.getUint8(10)!==3)throw Error('Unsupported NumDash progress layout');
      for(let i=0;i<15;i++)if(v.getUint8(12+i*11)>100||v.getUint8(13+i*11)>100||v.getUint8(14+i*11)>7)
        throw Error('NumDash level progress is invalid');},
    fields:[
      ...Array.from({length:12},(_,i)=>([
        {label:'Level '+(i+1)+' normal best (%)',offset:12+i*11,type:'u8',max:100,summary:i===0,group:'Normal completion'},
        {label:'Level '+(i+1)+' practice best (%)',offset:13+i*11,type:'u8',max:100,group:'Practice completion'}
      ])).flat(),
      {label:'Total attempts',offset:177,type:'u32',readonly:true,summary:true,group:'Totals'},
      {label:'Total jumps',offset:181,type:'u32',readonly:true,group:'Totals'}
    ]});

  // An installed NumDrive save is the two-byte Epsilon record data, not its
  // filename or storage wrapper. Completion flags come immediately after it.
  register({id:'numdrive',title:'NumDrive',record:'drivemad.sav',magic16:0x444d,exactSize:30,readonly:true,
    fields:[{label:'Last played level (zero-based)',offset:27,type:'u8',max:199,summary:true},
      {label:'Early level flags',offset:2,type:'u16',readonly:true,group:'Completion map'}],
    bits:[{label:'First 16 cleared levels',offset:2,type:'u16',readonly:true,
      names:Array.from({length:16},(_,i)=>'Level '+(i+1)),summary:true}]});

  // Balatro: 3 byte header, 24-byte settings_t, optional variable length run,
  // then FNV-1a checksum. The run body is left untouched.
  register({id:'balatro',title:'Balatro',record:'balatro.sav',magicByte:0xba,versionByte:1,minSize:31,checksum:'fnv',
    validate(v,b){if(v.getUint8(2)>1)throw Error('Unknown Balatro run flag');
      if(v.getUint8(3)>3)throw Error('Invalid Balatro game speed');
      if(v.getUint32(7,true)>v.getUint32(11,true))throw Error('Wins exceed runs');},
    fields:[
      {label:'Runs played',offset:11,type:'u32',max:2147483647,summary:true},
      {label:'Runs won',offset:7,type:'u32',max:2147483647,summary:true},
      {label:'Best ante',offset:5,type:'i16',min:0,max:32767,readonly:true},
      {label:'Best hand score',offset:19,type:'f64',readonly:true},
      {label:'Run in progress',offset:2,type:'u8',readonly:true,group:'Saved run'},
      {label:'Game speed preset',offset:3,type:'u8',max:3,readonly:true,group:'Options'}
    ],checkSave(v){if(v.getUint32(7,true)>v.getUint32(11,true))throw Error('Wins cannot exceed runs.');}});

  // Buckshot: fixed 208-byte C struct, with a checksum at offset 200
  // followed by four ABI padding bytes. The padding is not hashed.
  register({id:'buckshot',title:'Buckshot Roulette',record:'buckshot.sav',magicByte:0x42,versionByte:2,exactSize:208,checksum:'fnv',checksumOffset:200,
    validate(view){if(view.getUint8(2)>1||view.getUint8(16)>1)
      throw Error('Invalid Buckshot progress flags');},
    fields:[
      {label:'Matches won',offset:26,type:'u16',summary:true},
      {label:'Double or Nothing unlocked',offset:16,type:'u8',max:1,readonly:true},
      {label:'Paused match exists',offset:2,type:'u8',max:1,readonly:true,group:'Match'},
    ]});

  // Portal Returns: the last byte is a rolling 8-bit checksum (not FNV).
  register({id:'portal',title:'Portal Returns',record:'portal.sav',magicByte:80,versionByte:1,exactSize:23,checksum:'portal8',
    fields:[
      {label:'Main chambers unlocked',offset:2,type:'u8',min:1,max:40,summary:true},
      {label:'Prelude chambers unlocked',offset:3,type:'u8',min:1,max:38,summary:true},
      {label:'Selected main chamber',offset:4,type:'u8',min:1,max:40,readonly:true},
      {label:'Selected Prelude chamber',offset:5,type:'u8',min:1,max:38,readonly:true},
      {label:'Current pack',offset:20,type:'u8',max:1,readonly:true},
    ],checkSave(v){if(v.getUint8(4)>v.getUint8(2)||v.getUint8(5)>v.getUint8(3))
      throw Error('Selected chambers cannot exceed unlocked chambers.');}});

  // Sokoban: best move counts for each Microban level, zero means unsolved.
  register({id:'sokoban',title:'Sokoban',record:'sokoban.sav',magicByte:83,versionByte:1,minSize:44,
    fields:[{label:'Last selected level (zero-based)',offset:3,type:'u8',readonly:true,summary:true},
      ...Array.from({length:20},(_,i)=>({label:'Level '+(i+1)+' fewest moves (0 = unsolved)',offset:4+i*2,type:'u16',
        summary:i===0,group:'First 20 levels'}))]});

  // Isaac: the 12-byte lifetime record, not the variable isaacrun.sav snapshot.
  register({id:'isaac',title:'The Binding of Isaac',record:'isaac.sav',magicText:'ISP1',exactSize:12,
    fields:[{label:'Runs played',offset:4,type:'u16',summary:true},
      {label:'Deaths',offset:6,type:'u16',summary:true},
      {label:'Wins',offset:8,type:'u8',summary:true},
      {label:'Best stage (zero-based)',offset:9,type:'u8',readonly:true},
      {label:'Last character ID',offset:11,type:'u8',readonly:true}],
    checkSave(v){if(v.getUint8(8)>v.getUint16(4,true))throw Error('Wins cannot exceed runs.');}});

  // Sonic S1SV: fixed profile and mid-run progress, no checksum.
  register({id:'sonic',title:'Sonic the Hedgehog',record:'sonic.sav',magicText:'S1SV',versionByte:1,exactSize:32,
    fields:[{label:'Saved run score',offset:20,type:'u32',summary:true},
      {label:'Lives remaining',offset:9,type:'u8',summary:true},
      {label:'Continues',offset:10,type:'u8'},
      {label:'Chaos Emeralds',offset:11,type:'u8',max:6,readonly:true},
      {label:'Zone (zero-based)',offset:7,type:'u8',readonly:true,group:'Level'},
      {label:'Act (zero-based)',offset:8,type:'u8',readonly:true,group:'Level'},
      {label:'Has resumable game',offset:6,type:'u8',readonly:true,group:'Level'},
      {label:'Frames played',offset:28,type:'u32',readonly:true,group:'Other progress'}]});

  // Donkey Kong: variable packed arcade snapshot after a fixed 24-byte
  // profile. Checksummed score data can be edited without unpacking RAM.
  register({id:'donkeykong',title:'Donkey Kong',record:'donkeykong.sav',magicText:'DKG1',version:1,
    sizeField:'full16',minSize:28,checksum:'fnv',
    fields:[{label:'High score',offset:8,type:'u32',max:999999,summary:true},
      {label:'Games played',offset:12,type:'u32',summary:true},
      {label:'Boards completed',offset:16,type:'u32'},
      {label:'Highest level reached',offset:20,type:'u16',max:255,summary:true},
      {label:'Paused arcade run',offset:23,type:'u8',readonly:true,group:'Saved run'}]});

  // UNO: validated checksum, but the live card/deck state must remain intact.
  register({id:'uno',title:'UNO',record:'uno.sav',magicText:'UNO1',version:1,sizeField:'full16',
    exactSize:728,checksum:'fnv',readonly:true,
    fields:[{label:'Players',offset:8,type:'u8',min:2,max:4,summary:true},
      {label:'Bot difficulty',offset:9,type:'u8',max:2},
      {label:'Single-hand rules',offset:10,type:'u8',max:1},
      {label:'Saved match available',offset:13,type:'u8',max:1,summary:true}]});

  // FNF: score grids and note charts are versioned; the two independent
  // settings can safely change while charts and ranks are preserved.
  register({id:'fnf',title:"Friday Night Funkin'",record:'fnf.sav',magicText:'FNFS',version:1,
    sizeField:'full16',minSize:64,checksum:'fnv',
    fields:[{label:'Downscroll enabled',offset:8,type:'u8',max:1,summary:true,group:'Options'},
      {label:'Note timing offset (ms)',offset:10,type:'i16',min:-300,max:300,group:'Options'},
      {label:'Last week selected (zero-based)',offset:12,type:'u8',readonly:true,group:'Menus'},
      {label:'Last song selected (zero-based)',offset:14,type:'u8',readonly:true,group:'Menus'},
      {label:'Week difficulty',offset:13,type:'u8',readonly:true,group:'Menus'}]});

  // NumVisuals: settings, stopwatch and timer; clocks are read-only to avoid
  // returning to an inconsistent running timer.
  register({id:'numvisuals',title:'NumVisuals',record:'numvisuals.sav',magicByte:86,versionByte:1,exactSize:60,readonly:true,
    fields:[{label:'Counter value',offset:8,type:'i32',summary:true},
      {label:'Stopwatch accumulated (ms)',offset:16,type:'u32',summary:true},
      {label:'Timer duration (ms)',offset:24,type:'u32'},
      {label:'Timer remaining (ms)',offset:28,type:'u32'},
      {label:'Active visual mode',offset:3,type:'u8',group:'Settings'},
      {label:'Timer state',offset:6,type:'u8',group:'Settings'}]});

  // Undertale UT01: 8-byte save header plus a C-aligned Save structure.
  // Only independent gold is editable; health, EXP and plot flags stay intact.
  register({id:'undertale',title:'Undertale',record:'undertale.sav',magicText:'UT01',sizeField:'payload32',minSize:64,
    fields:[{label:'Gold',offset:24,type:'u16',summary:true},
      {label:'LV',offset:16,type:'u8',readonly:true,summary:true},
      {label:'EXP',offset:20,type:'u32',readonly:true},
      {label:'Current HP',offset:26,type:'i16',min:0,max:999,readonly:true},
      {label:'Maximum HP',offset:28,type:'i16',min:1,max:999,readonly:true},
      {label:'Enemies killed',offset:50,type:'u16',readonly:true},
      {label:'Play time (frames)',offset:52,type:'u32',readonly:true}]});

  // Celeste: the game reads all three official save layouts.
  // v1: 1552 bytes, checksum at 1544 (followed by 4 bytes of padding).
  // v2: 1680 bytes, checksum at 1676. v3: 1688 bytes, checksum at 1684.
  // Historic saves are shown read-only until the game upgrades them.
  register({id:'celeste',title:'Celeste',record:'celeste.sav',magic:0x43454c53,
    sizeField:'full16',minSize:1552,checksum:'fnv',
    checksumOffset(view,bytes){return view.getUint16(4,true)===1 ? 1544 : bytes.length-4;},
    validate(view,bytes){const sizes={1:1552,2:1680,3:1688};const version=view.getUint16(4,true);
      if(bytes.length!==sizes[version])throw Error('Unsupported Celeste save version or length');},
    readonlyWhen(view){return view.getUint16(4,true)<3;},
    readonlyNote(view){return 'Legacy Celeste save (version '+view.getUint16(4,true)+'). View its stats here; open the game to migrate it before editing.';},
    fields:[
      {label:'Mountain areas unlocked',offset:1066,type:'u8',max:10,summary:true},
      {label:'Total deaths',offset:1076,type:'u32',readonly:true,summary:true},
      {label:'Golden strawberries',offset:1080,type:'u32',readonly:true},
      {label:'Total jumps',offset:1084,type:'u32',readonly:true},
      {label:'Last chapter (zero-based)',offset:1067,type:'u8',readonly:true,group:'Last visit'},
      {label:'Cassette chapters owned (bitmask)',offset:1064,type:'u16',readonly:true,group:'Collectibles'}
    ]});

  // Hollow Knight: four independently checksummed slots. CRC32 covers
  // the bytes following the 16-byte header, not the header itself.
  register({id:'hollowknight',title:'Hollow Knight',record:'hk1.sav',
    records:['hk1.sav','hk2.sav','hk3.sav','hk4.sav'],magicText:'HKSV',sizeField:'hk32',
    minSize:160,checksum:'hkcrc',readonly:true,
    fields:[{label:'Geo',offset:28,type:'i32',summary:true},
      {label:'Maximum health',offset:17,type:'u8',summary:true},
      {label:'Current health',offset:16,type:'u8'},
      {label:'Play time (seconds)',offset:152,type:'f32',summary:true},
      {label:'Save format version',offset:4,type:'u32',group:'Save metadata'}]});

  // Retro-Go's ROM save-states are compressed emulator snapshots. Only its
  // launcher preferences are decoded, and kept strictly read-only.
  register({id:'retrogo',title:'Retro-Go',record:'retrogo.cfg',magicByte:82,versionByte:1,
    minSize:13,readonly:true,
    fields:[{label:'Emulation speed preset',offset:3,type:'u8',max:4,summary:true},
      {label:'Display scaling',offset:2,type:'u8',max:2,group:'Preferences'},
      {label:'Auto-save interval (seconds)',offset:9,type:'u8',max:99,group:'Preferences'}]});

  // NumBlocks worlds contain player state, inventories and region edits;
  // time is the only stable cross-version field safe to display.
  register({id:'numblocks',title:'NumBlocks',record:'nb1.nbw',
    records:Array.from({length:9},(_,i)=>'nb'+(i+1)+'.nbw'),minSize:20,readonly:true,
    validate(v,b){if(String.fromCharCode(...b.subarray(0,3))!=='NBW'||![49,50,51].includes(b[3]))
      throw Error('Unknown NumBlocks world format');},
    fields:[{label:'World age (game ticks)',offset:16,type:'u32',summary:true}]});
})();


// Special and complex save formats.
'use strict';
(() => {
  const binary = window.NumPlayBinarySave;
  const stats = window.NumPlaySaveStats;
  if (!binary?.register || !stats?.register) return;

  // Crossy Road's complete file is score, coins, and a 32-bit checksum.
  // CrossyWorks writes sum = score * 2654435761 ^ (coins + 0x5A17).
  binary.register({id:'crossyroad',title:'Crossy Road',record:'crossyroad.sav',exactSize:12,checksum:'crossy',
    validate(v) {
      if (v.getUint32(0,true) > 999999999 || v.getUint32(4,true) > 999999999)
        throw Error('Crossy Road score or coins are outside the game limits');
    },
    fields:[
      {label:'High score',offset:0,type:'u32',max:999999999,summary:true},
      {label:'Coins collected',offset:4,type:'u32',max:999999999,summary:true}
    ]});

  // Tetris' save.rs uses exactly 25 little-endian 32-bit words. The last
  // word is unused. Grid, pieces and bag remain untouched by the editor.
  binary.register({id:'tetris',title:'Tetris',record:'tetris.sav',exactSize:100,
    validate(v) {
      for (let i=0;i<20;i++) if (v.getUint32(i*4,true) > 0x3fffffff)
        throw Error('Invalid packed Tetris playfield');
      if ((v.getUint32(23*4,true) & 15) > 7)
        throw Error('Invalid saved Tetris piece bag');
    },
    fields:[
      {label:'Current score',offset:80,type:'u32',max:999999,summary:true},
      {label:'Current level',offset:84,type:'u16',min:1,max:20,summary:true},
      {label:'Lines toward next level',offset:86,type:'u16',readonly:true,group:'Saved game'},
      {label:'Current/next/held pieces',offset:88,type:'u32',readonly:true,group:'Saved game'},
      {label:'Bag contents (packed)',offset:92,type:'u32',readonly:true,group:'Saved game'}
    ]});

  const number = n => Number(n).toLocaleString();
  function readRecords(files, allowed, fileNames) {
    const sources = files.filter(f=>allowed.has(f.name)).sort((a,b) => (b.savedAt||0)-(a.savedAt||0));
    const result = new Map();
    const wanted = new Set(fileNames);
    for (const f of sources) {
      if (typeof f.content !== 'string') continue;
      const rx = /^#([>=])([a-z0-9_.-]+):(?:(\d+):)?([A-Za-z0-9+/]+={0,2})[ \t]*\r?$/gim;
      for (const m of f.content.matchAll(rx)) {
        const name = m[2].toLowerCase();
        if (!wanted.has(name) || result.has(name)) continue;
        try {
          if ((m[1] === '=') !== (m[3] !== undefined)) throw Error('Invalid record encoding');
          const e = {kind:m[1],name,size:m[3]===undefined?null:Number(m[3]),base64:m[4]};
          const data = window.NumPlayGameSaveRestore?.decodeEntry(e);
          if (!(data instanceof Uint8Array)) throw Error('Save decoder unavailable');
          if (data.length > 65536) throw Error('Save record exceeds safe inspection size');
          result.set(name, {name,bytes:data,file:f.name});
        } catch (error) {result.set(name,{name,error:String(error?.message||error)});}
      }
    }
    return result;
  }
  function fail(name, reason) { return {name, error:reason}; }
  function doom(records) {
    const entries=[];let occupied=0, bytes=0;
    for(let i=0;i<6;i++) {
      const rec=records.get('doomsav'+i+'.dsg');
      if(rec?.bytes){occupied++;bytes+=rec.bytes.length;entries.push(['Slot '+(i+1),number(rec.bytes.length)+' bytes (compressed save state)']);}
    }
    const resume=records.get('doomres.sav');
    if(resume?.bytes) entries.push(['Resume on Home',number(resume.bytes.length)+' bytes']);
    const cfg=records.get('doom.cfg');
    if(cfg?.bytes) {
      const b=cfg.bytes;
      if(b.length>=4 && b[0]===68 && b[1]>=1&&b[1]<=3) {
        entries.push(['Messages',b[2]?'On':'Off'],['Brightness preset',String(b[3])]);
        if(b[1]===3&&b.length>=10)entries.push(['Always run',b[9]?'On':'Off']);
      } else entries.push(['Doom configuration','Unrecognized format, not decoded']);
    }
    return {title:'Doom',fields:[['Saved game slots',occupied+'/6'],['Stored state bytes',number(bytes)],['Home resume',resume?.bytes?'Yes':'No']],entries,note:'The six compressed game states are preserved exactly. Only save-slot information and settings can be inspected.'};
  }
  function champion(records) {
    const rec=records.get('champion.sav');
    if(!rec?.bytes)return fail('Champion Island','No readable champion.sav record');
    const b=rec.bytes;
    if(b.length<3||String.fromCharCode(...b.slice(0,3))!=='CI1')return fail('Champion Island','Unrecognized Champion Island save');
    let i=3;const values=[];const decoder=new TextDecoder('utf-8',{fatal:true});
    while(i<b.length){
      if(values.length===128)throw Error('Champion Island has too many saved values');
      const len=b[i++];
      if(!len||len>=64||i+len+1>b.length)throw Error('Invalid Champion Island key');
      const key=decoder.decode(b.subarray(i,i+len));i+=len;
      const type=b[i++];let value;
      if(type===1){value='null';}
      else if(type===2){if(i>=b.length)throw Error('Truncated saved flag');value=b[i++]?'Yes':'No';}
      else if(type===3){if(i+4>b.length)throw Error('Truncated score');value=new DataView(b.buffer,b.byteOffset+i,4).getFloat32(0,true);i+=4;if(!Number.isFinite(value))throw Error('Non-finite score');}
      else if(type===4){if(i>=b.length)throw Error('Truncated string');const sz=b[i++];if(i+sz>b.length)throw Error('Truncated text');value=decoder.decode(b.subarray(i,i+sz));i+=sz;}
      else throw Error('Unknown Champion Island value type');
      values.push({key,type,value});
    }
    const numeric=values.filter(x=>x.type===3), completed=values.filter(x=>x.type===2&&x.value==='Yes');
    const sorted=numeric.filter(x=>/score|best|record|high|time|rating/i.test(x.key));
    return {title:'Champion Island',fields:[['Progress values',values.length],['True quest flags',completed.length],['Numeric scores',numeric.length]],
      entries:[...sorted,...numeric.filter(x=>!sorted.includes(x)),...values.filter(x=>x.type===4)].slice(0,35).map(x=>[x.key,String(x.value)]),
      note:'Shows saved quest flags and named score values from CI1. Their meanings depend on the game; editing is disabled to preserve quest consistency.'};
  }
  function earth(records) {
    const rec=records.get('finalearth2.sav');
    if(!rec?.bytes)return fail('The Final Earth 2','No readable finalearth2.sav record');
    const b=rec.bytes;
    if(b.length<16||String.fromCharCode(...b.subarray(0,4))!=='FE2S')return fail('The Final Earth 2','Unrecognized FE2S save header');
    const v=new DataView(b.buffer,b.byteOffset,b.length);
    if(v.getUint32(4,true)!==1) return fail('The Final Earth 2','Unsupported FE2S save version');
    let pos=16,chunks=0;
    while(pos<b.length){if(pos+2>b.length)throw Error('Truncated city chunk length');const n=v.getUint16(pos,true);pos+=2;
      if(!n||pos+n>b.length)throw Error('Truncated city chunk');pos+=n;chunks++;}
    return {title:'The Final Earth 2',fields:[['City stream (uncompressed)',number(v.getUint32(8,true))+' bytes'],['Storage used',number(b.length)+' bytes'],['Compressed chunks',chunks]],
      entries:[['Saved stream CRC','0x'+v.getUint32(12,true).toString(16).padStart(8,'0').toUpperCase()]],
      note:'The FE2S header and chunk boundaries were checked. The compressed city itself is not decompressed or modified; its CRC has not been independently verified.'};
  }
  function powder(records) {
    const names=['numpowder.sav','numpowder1.sav','numpowder2.sav','numpowder3.sav','numpowder4.sav'];
    let total=0,count=0;const entries=[];
    for(let i=0;i<names.length;i++){
      const rec=records.get(names[i]);if(!rec?.bytes)continue;const b=rec.bytes;
      if(b.length<6||String.fromCharCode(...b.subarray(0,4))!=='NPWD'||![2,3].includes(b[4])){entries.push(['Slot '+i,'Unrecognized simulation format']);continue;}
      let n=0,shift=0,pos=5,valid=false;
      for(let j=0;j<5&&pos<b.length;j++,shift+=7){const x=b[pos++];n|=(x&127)<<shift;if(!(x&128)){valid=true;break;}}
      if(!valid||n>65535){entries.push(['Slot '+i,'Invalid particle-count header']);continue;}
      count++;total+=n;entries.push([i?'Save slot '+i:'Autosave',number(n)+' particles · '+number(b.length)+' bytes']);
    }
    const cfg=records.get('numpowder.cfg');
    if(cfg?.bytes&&cfg.bytes.length>=16&&cfg.bytes[0]===1) {
      entries.push(['Most recently chosen slot',String(cfg.bytes[3])]);
      entries.push(['Simulation paused',cfg.bytes[15]&2?'Yes':'No']);
    }
    return {title:'NumPowder',fields:[['Simulation slots',count+'/5'],['Particles in saved slots',number(total)],['Total saved simulations',names.filter(n=>records.get(n)?.bytes).length]],
      entries,note:'Particle totals come from NPWD save headers; the individual particle simulations have not been fully decoded or validated. Read-only to protect the simulations.'};
  }

  const definitions=[
    {id:'doom',names:['doom.cfg','doomres.sav',...Array.from({length:6},(_,i)=>'doomsav'+i+'.dsg')],build:doom},
    {id:'championisland',names:['champion.sav'],build:champion},
    {id:'finalearth2',names:['finalearth2.sav','fe2meta.dat'],build:earth},
    {id:'numpowder',names:['numpowder.cfg',...Array.from({length:5},(_,i)=>i?'numpowder'+i+'.sav':'numpowder.sav')],build:powder}
  ];
  for(const d of definitions){
    let active=null;
    function assess(files,allowed){
      const matches=readRecords(files,allowed,d.names);
      if(!matches.size)return null;
      try {return {...d.build(matches),matches};}
      catch(e){return {...fail(d.id,String(e?.message||e)),matches};}
    }
    stats.register(d.id,{
      summary(files,allowed){const p=assess(files,allowed);if(!p)return null;
        if(p.error)return {error:p.error,fields:[],name:p.name};
        return {name:p.title,fields:p.fields.map(([label,value])=>({label,value:String(value)}))};
      },
      open(allowed,vault,ui){const p=assess(vault.files(),allowed);if(!p)return;
        const {make,section}=ui;
        const dlg=make('dialog','dialog gs-dialog');
        const head=make('div','gs-dialog-top');const ttl=make('h2','',p.title||d.id+' details');
        const close=make('button','close-button','×');close.type='button';close.setAttribute('aria-label','Close');
        close.onclick=()=>dlg.close();head.append(ttl,close);
        const note=make('p','gs-editor-note',p.error?'This save could not be decoded: '+p.error:(p.note||'Read-only save information.'));
        const body=make('div','gs-dialog-body');
        if(!p.error){
          const overview=make('div','gs-overview');
          for(const [k,v] of p.fields){const tile=make('div','gs-tile');tile.append(make('small','',k),make('strong','',String(v)));overview.append(tile);}
          body.append(overview);
          if(p.entries.length){const s=section('Saved progress details',body);const grid=make('div','gs-field-grid');
            for(const [k,v] of p.entries){const t=make('div','gs-tile');t.append(make('small','',k),make('strong','',String(v)));grid.append(t);}s.append(grid);}
        }
        dlg.append(head,note,body);document.body.append(dlg);
        dlg.addEventListener('close',()=>dlg.remove(),{once:true});dlg.showModal();
      }
    });
  }
})();


