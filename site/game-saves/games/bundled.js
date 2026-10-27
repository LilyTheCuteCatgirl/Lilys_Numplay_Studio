'use strict';
(() => {
  const register = window.NumPlayBinarySave.register;
  register({id:'dinorun',title:'Chrome Dino',record:'dinorun.sav',magicText:'DINO',versionByte:2,exactSize:12,
    fields:[{label:'Highest distance',offset:8,type:'u32',max:39999999,summary:true}]});
  register({id:'flappybird',title:'Flappy Bird',record:'flappy.sav',magicByte:70,versionByte:1,exactSize:26,
    fields:[{label:'Classic best',offset:4,type:'u16',max:9999,summary:true},
      {label:'Custom best',offset:6,type:'u16',max:9999,summary:true},
      {label:'Game mode',offset:2,type:'u8',max:1,readonly:true}]});
  register({id:'coreball',title:'Core Ball',record:'coreball.sav',magicByte:67,versionByte:1,exactSize:12,checksum:'fnv',
    fields:[{label:'Current level',offset:3,type:'u8',min:1,max:61,summary:true},
      {label:'Highest unlocked level',offset:4,type:'u8',min:1,max:61,summary:true},
      {label:'Guide viewed',offset:2,type:'u8',readonly:true}],
    checkSave(v){if(v.getUint8(3)>v.getUint8(4))throw Error('Current level cannot exceed your highest unlocked level.');}});
  register({id:'g2048',title:'2048',record:'g2048.sav',magicByte:50,versionByte:1,exactSize:144,
    fields:[
      {label:'Selected board size',offset:2,type:'u8',max:3,readonly:true},
      ...[3,4,5,6].flatMap((s,i)=>[
        {label:s+'×'+s+' best',offset:8+i*4,type:'u32',group:'Best scores',summary:i===1},
        {label:s+'×'+s+' current score',offset:24+i*4,type:'u32',group:'Current games',readonly:true},
        {label:s+'×'+s+' moves',offset:40+i*4,type:'u32',group:'Moves',readonly:true}
      ])],
    checkSave(v){for(let i=0;i<4;i++)if(v.getUint32(8+i*4,true)<v.getUint32(24+i*4,true))throw Error('A best score cannot be lower than the current game score.');}});
  register({id:'blockblast',title:'Block Blast',record:'blockblast.sav',magicByte:66,versionByte:1,minSize:26,
    fields:[
      {label:'Best score',offset:8,type:'u32',summary:true},
      {label:'Current score',offset:12,type:'u32',readonly:true,summary:true},
      {label:'Best before this run',offset:16,type:'u32',readonly:true},
      {label:'Combo',offset:3,type:'u8',readonly:true}
    ],checkSave(v){if(v.getUint32(8,true)<v.getUint32(12,true))throw Error('Best score cannot be less than the current score.');}});

  // The following layouts were checked against Mason363/NumPlay's original game sources.
  // Fields that would disrupt an in-progress run are deliberately read-only.
  register({id:'invaders',title:'Space Invaders',record:'invaders.sav',magicByte:73,versionByte:1,exactSize:8,
    fields:[{label:'High score',offset:4,type:'u32',max:9999,summary:true}]});

  register({id:'breakout',title:'Block Breaker',record:'breakout.sav',magicByte:66,versionByte:2,exactSize:12,
    fields:[
      {label:'Highest score',offset:8,type:'u32',max:99999,summary:true},
      {label:'Highest level reached',offset:2,type:'u8',min:1,max:99,summary:true},
      {label:'Speed setting',offset:3,type:'u8',max:2,readonly:true},
      {label:'Screen shake',offset:4,type:'u8',max:1,readonly:true}
    ]});

  register({id:'chess',title:'Chess',record:'numchess.sav',magicByte:67,versionByte:1,exactSize:8,
    fields:[
      {label:'Puzzle rating',offset:2,type:'u16',min:100,max:4000,summary:true},
      {label:'Puzzle win streak',offset:4,type:'u16',summary:true},
      {label:'Last opponent',offset:6,type:'u8',readonly:true},
      {label:'Last side and clock settings',offset:7,type:'u8',readonly:true}
    ]});

  register({id:'connectfour',title:'Connect Four',record:'connect4.sav',magicByte:67,versionByte:1,exactSize:16,
    fields:[
      {label:'Player 1 wins',offset:8,type:'u16',max:999,summary:true},
      {label:'Player 2 wins',offset:10,type:'u16',max:999,summary:true},
      {label:'Player 3 wins',offset:12,type:'u16',max:999},
      {label:'Draws',offset:14,type:'u16',max:999},
      {label:'CPU enabled',offset:2,type:'u8',max:1,readonly:true,group:'Settings'},
      {label:'Players',offset:3,type:'u8',min:2,max:3,readonly:true,group:'Settings'},
      {label:'CPU level',offset:4,type:'u8',max:2,readonly:true,group:'Settings'}
    ]});

  register({id:'pacman',title:'Pac-Man',record:'pacman.sav',magicByte:80,versionByte:1,exactSize:52,
    fields:[
      {label:'High score',offset:8,type:'u32',max:9999999,summary:true},
      {label:'Starting level',offset:5,type:'u8',min:1,max:21,group:'Settings',summary:true},
      {label:'Saved run score',offset:16,type:'u32',readonly:true,group:'Paused game'},
      {label:'Saved run level',offset:13,type:'u8',readonly:true,group:'Paused game'},
      {label:'Saved run lives',offset:14,type:'u8',readonly:true,group:'Paused game'},
      {label:'Has a paused run',offset:12,type:'u8',readonly:true,group:'Paused game'}
    ]});

  register({id:'sudoku',title:'Sudoku',record:'sudoku.sav',magicByte:83,versionByte:1,exactSize:352,
    fields:[
      {label:'Easy best (seconds)',offset:12,type:'u32',summary:true,group:'Fastest completion times (0 means none)'},
      {label:'Medium best (seconds)',offset:16,type:'u32',group:'Fastest completion times (0 means none)'},
      {label:'Hard best (seconds)',offset:20,type:'u32',group:'Fastest completion times (0 means none)'},
      {label:'Expert best (seconds)',offset:24,type:'u32',group:'Fastest completion times (0 means none)'},
      {label:'Current puzzle elapsed (seconds)',offset:8,type:'u32',readonly:true,group:'Current puzzle'},
      {label:'Current difficulty',offset:3,type:'u8',readonly:true,group:'Current puzzle'},
      {label:'Mistakes this puzzle',offset:5,type:'u8',readonly:true,group:'Current puzzle'}
    ]});

  register({id:'snake',title:'Snake',record:'snake.sav',magicByte:83,versionByte:2,exactSize:658,
    fields:[
      {label:'Current snake mode',offset:3,type:'u8',max:11,readonly:true,group:'Settings'},
      ...['Classic','Wall','Portal','Cheese','Borderless','Twin','Winged','Yin-Yang','Statue','Light','Magnet','Peaceful'].map((name,i)=>({
        label:name+' best (normal count, speed, size)',offset:10+i*54,type:'u16',max:504,summary:i===0,group:'Best lengths by mode'
      }))
    ]});

  register({id:'twoplayer',title:'2 Players',record:'twoplayer.sav',magicByte:80,versionByte:1,exactSize:52,
    fields:[
      {label:'Last selected game',offset:2,type:'u8',readonly:true,group:'Settings'},
      {label:'CPU difficulty',offset:3,type:'u8',readonly:true,group:'Settings'},
      ...['Pong','Air Hockey','Tanks','Light Cycles','Quick Draw','Tug of War'].flatMap((name,i)=>
        ['P1 wins (two people)','P2 wins (two people)','P1 wins (against CPU)','P2 wins (against CPU)'].map((label,j)=>({
          label,offset:4+i*8+j*2,type:'u16',summary:i===0&&j===0,group:name+' results'
        })))
    ]});

  register({id:'uttt',title:'Ultimate Tic-Tac-Toe',record:'uttt.sav',magicByte:85,versionByte:1,exactSize:113,
    fields:[
      ...['Two players','Easy computer','Medium computer','Hard computer'].flatMap((mode,i)=>
        ['X / human-side wins','O / computer-side wins','Draws'].map((label,j)=>({
          label,offset:8+i*6+j*2,type:'u16',summary:i===0&&j===0,group:mode+' results'
        }))),
      {label:'Moves in paused game',offset:5,type:'u8',max:81,readonly:true,group:'Current game'}
    ]});

  // These three games checksum 32-bit words of the in-progress state, not bytes.
  register({id:'towerblock',title:'Tower Blocks',record:'towerblocks.sav',magicByte:84,versionByte:1,exactSize:668,checksum:'word-fnv',
    fields:[
      {label:'Best tower height',offset:8,type:'u32',summary:true},
      {label:'Current tower height',offset:12,type:'u32',readonly:true,summary:true},
      {label:'Color sequence',offset:16,type:'u32',readonly:true,group:'Saved run'}
    ]});

  register({id:'flappydunk',title:'Flappy Dunk',record:'flappydunk.sav',magicByte:70,versionByte:1,exactSize:200,checksum:'word-fnv',
    fields:[
      {label:'Best score',offset:8,type:'u32',summary:true},
      {label:'Total swishes',offset:12,type:'u32',summary:true},
      {label:'Games played',offset:16,type:'u32'},
      {label:'Best streak',offset:20,type:'u32'},
      {label:'Current ball skin',offset:3,type:'u8',readonly:true,group:'Outfit'}
    ]});

  register({id:'suika',title:'Suika Game',record:'suika.sav',magicByte:83,versionByte:1,exactSize:1052,checksum:'word-fnv',checksumOffset:8,
    fields:[
      {label:'Best score',offset:12,type:'u32',summary:true},
      {label:'Saved run score',offset:16,type:'u32',readonly:true,summary:true},
      {label:'Next fruit',offset:4,type:'u8',readonly:true,group:'Saved run'}
    ]});

  register({id:'doodlejump',title:'Doodle Jump',record:'doodlejump.sav',magicByte:68,versionByte:1,exactSize:488,checksum:'word-fnv',
    fields:[
      {label:'Best height',offset:8,type:'u32',summary:true},
      {label:'Saved climb score',offset:12,type:'u32',readonly:true,summary:true},
      {label:'Saved climb flags',offset:2,type:'u8',readonly:true,group:'Saved climb'}
    ]});
})();
