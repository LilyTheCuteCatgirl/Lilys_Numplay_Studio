'use strict';
(() => {
  const field = (label,offset,type='u32',max=4294967295,extra={})=>({label,offset,type,max,...extra});
  window.NumPlayBinarySave.register({
    id:'monkeymart',title:'Monkey Mart',record:'monkeymart.sav',magic:0x544d4d4d,version:1,
    sizeField:'full16',checksum:'fnv',exactSize:364,
    fields:[
      field('Money',8,'u32',1000000000,{summary:true}),
      field('Current hat',16,'u8',20,{group:'Outfits',readonly:true}),
      field('Current mart',17,'u8',1,{group:'Marts',readonly:true}),
      field('Mart 1 progress',18,'u8',255,{group:'Marts',readonly:true}),
      field('Mart 2 progress',19,'u8',255,{group:'Marts',readonly:true}),
      field('Mart 1 cash box',20,'u32',100000000,{group:'Marts',summary:true}),
      field('Mart 2 cash box',24,'u32',100000000,{group:'Marts'})
    ],
    bits:[{label:'Hats owned',offset:12,type:'u32',keepFirst:true,names:Array.from({length:21},(_,i)=>i===0?'Starter hat':'Hat '+(i+1)),summary:true}],
    checkSave(v){if(!(v.getUint32(12,true)&(1<<v.getUint8(16))))throw Error('Keep the currently equipped hat unlocked.');},
    extra(s,body,ui){
      const {section,make}=ui;
      const part=section('Mart inventory and upgrades',body);
      for(let m=0;m<2;m++){
        const owned=Array.from({length:43},(_,i)=>s.view.getUint8(28+m*43+i)).filter(Boolean).length;
        const upgraded=Array.from({length:36},(_,i)=>s.view.getUint8(286+m*36+i)).filter(n=>n>1).length;
        part.append(make('p','muted','Mart '+(m+1)+': '+owned+' purchased places, '+upgraded+' upgraded abilities. Individual shelf and upgrade levels are preserved when saving.'));
      }
    }
  });
})();
