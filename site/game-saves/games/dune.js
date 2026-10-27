'use strict';
(() => {
  window.NumPlayBinarySave.register({
    id:'dune',title:'Dune',record:'dune.sav',magic:0x454e5544,version:1,
    sizeField:'full16',checksum:'fnv',minSize:36,
    fields:[
      {label:'Best score',offset:8,type:'u32',max:100000000,summary:true},
      {label:'Coins',offset:12,type:'u32',max:100000000,summary:true},
      {label:'Runs',offset:16,type:'u32'},
      {label:'Equipped ball',offset:25,type:'u8',max:25,readonly:true,group:'Selections'},
      {label:'Selected landscape',offset:26,type:'u8',max:6,readonly:true,group:'Selections'},
      {label:'Saved run in progress',offset:27,type:'u8',max:1,readonly:true,group:'Selections'}
    ],
    bits:[
      {label:'Balls unlocked',offset:20,type:'u32',names:Array.from({length:26},(_,i)=>i?'Ball '+(i+1):'Basic Ball'),keepFirst:true,summary:true},
      {label:'Landscapes unlocked',offset:24,type:'u8',names:Array.from({length:7},(_,i)=>i?'Landscape '+(i+1):'Night Land'),keepFirst:true,summary:true}
    ],
    checkSave(v){
      if(!(v.getUint32(20,true)&(1<<v.getUint8(25)))) throw Error('Keep the equipped ball unlocked.');
      if(!(v.getUint8(24)&(1<<v.getUint8(26)))) throw Error('Keep the selected landscape unlocked.');
    }
  });
})();
