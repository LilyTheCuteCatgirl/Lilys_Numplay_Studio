'use strict';
(() => {
  const f=(label,offset,type='u32',max=4294967295,extra={})=>({label,offset,type,max,...extra});
  window.NumPlayBinarySave.register({
    id:'subway',title:'Subway Surfers',record:'subway.sav',magic:0x31425553,sizeField:'payload32',exactSize:120,
    fields:[
      f('Coins',8,'u32',4294967295,{summary:true}),f('Keys',12,'u32',4294967295,{summary:true}),
      f('Best score',16,'u32',4294967295,{summary:true}),f('Runs',20),
      f('Hoverboards',24,'u16',65535,{group:'Powerups'}),
      f('Headstarts',26,'u16',65535,{group:'Powerups'}),
      f('Score boosters',28,'u16',65535,{group:'Powerups'}),
      f('Mystery boxes',30,'u16',65535,{group:'Powerups'}),
      ...['Jetpack','Super Sneakers','Coin Magnet','2x Multiplier'].map((label,i)=>f(label+' level',32+i,'u8',6,{group:'Powerup upgrades'})),
      f('Selected character',38,'u8',3,{group:'Selections',readonly:true}),
      f('Selected board',39,'u8',2,{group:'Selections',readonly:true}),
      f('Mission set',40,'u8',255,{group:'Missions'}),
      f('Missions completed in set',41,'u8',7,{group:'Missions'}),
      ...['Coins collected','Jumps','Rolls','Powerups collected','Boards used','Stumbles','Jetpacks','Magnets','Mystery prizes','Total runs','Distance'].map((label,i)=>f(label,56+i*4,'u32',4294967295,{group:'Lifetime totals'}))
    ],
    bits:[
      {label:'Characters unlocked',offset:36,type:'u8',names:['Starter character','Character 2','Character 3','Character 4'],keepFirst:true,summary:true},
      {label:'Boards unlocked',offset:37,type:'u8',names:['Starter board','Board 2','Board 3'],keepFirst:true,summary:true}
    ],
    checkSave(v){
      if (!(v.getUint8(36) & (1<<v.getUint8(38)))) throw Error('Keep the selected character unlocked.');
      if (!(v.getUint8(37) & (1<<v.getUint8(39)))) throw Error('Keep the selected board unlocked.');
    }
  });
})();
