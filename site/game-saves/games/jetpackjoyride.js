'use strict';
(() => {
  window.NumPlayBinarySave.register({
    id:'jetpackjoyride',title:'Jetpack Joyride',record:'jetpackjoyride.sav',magic:0x31524a4a,version:2,
    sizeField:'full16',checksum:'fnv',minSize:28,
    fields:[
      {label:'Best distance (m)',offset:8,type:'u32',summary:true},
      {label:'Coins',offset:12,type:'u32',summary:true},
      {label:'Runs',offset:16,type:'u32',summary:true},
      {label:'Help seen',offset:20,type:'u8',max:1,readonly:true},
      {label:'Head start',offset:21,type:'u8',max:1,readonly:true},
      {label:'Double coins',offset:22,type:'u8',max:1,readonly:true},
      {label:'Saved run in progress',offset:23,type:'u8',max:1,readonly:true}
    ]
  });
})();
