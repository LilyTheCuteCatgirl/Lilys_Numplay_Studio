'use strict';
(() => {
  window.NumPlayBinarySave.register({
    id:'stickmanhook',title:'Stickman Hook',record:'stickmanhook.sav',magic:0x334b4853,version:1,
    sizeField:'full16',checksum:'fnv',exactSize:28,
    fields:[
      {label:'Levels completed',offset:8,type:'u32',max:100000000,summary:true},
      {label:'Current level',offset:12,type:'u32',max:100000000,readonly:true,summary:true},
      {label:'Current skin',offset:16,type:'u8',max:255,readonly:true},
      {label:'Help seen',offset:17,type:'u8',max:1,readonly:true},
      {label:'Saved course in progress',offset:18,type:'u8',max:1,readonly:true}
    ],
    checkSave(v){if(v.getUint32(12,true)>v.getUint32(8,true))throw Error('Completed levels must be at least the current level.');}
  });
})();
