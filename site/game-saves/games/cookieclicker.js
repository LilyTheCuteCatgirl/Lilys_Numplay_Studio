'use strict';
(() => {
  window.NumPlayBinarySave.register({
    id:'cookieclicker',title:'Cookie Clicker',record:'cookieclicker.sav',magic:0x314b4343,
    minSize:128,
    fields:[
      {label:'Cookies',offset:8,type:'f64',max:1e300,summary:true},
      {label:'Cookies baked this ascension',offset:16,type:'f64',max:1e300,summary:true,readonly:true},
      {label:'Cookies baked in previous ascensions',offset:24,type:'f64',max:1e300,readonly:true},
      {label:'Cookies sucked by wrinklers',offset:32,type:'f64',max:1e300,readonly:true},
      {label:'Handmade cookies',offset:40,type:'f64',max:1e300,readonly:true},
      {label:'Cookie clicks',offset:48,type:'f64',max:1e300,readonly:true},
      {label:'Prestige',offset:56,type:'f64',max:1e300,readonly:true,group:'Ascension'},
      {label:'Heavenly chips',offset:64,type:'f64',max:1e300,readonly:true,group:'Ascension'},
      {label:'Heavenly chips spent',offset:72,type:'f64',max:1e300,readonly:true,group:'Ascension'},
      {label:'Best raw cookies per second',offset:80,type:'f64',max:1e300,readonly:true,group:'Records'},
      {label:'Golden cookie clicks',offset:88,type:'u32',group:'Records',readonly:true},
      {label:'Golden cookies missed',offset:96,type:'u32',group:'Records',readonly:true},
      {label:'Reindeer clicked',offset:100,type:'u32',group:'Records',readonly:true},
      {label:'Wrinklers popped',offset:104,type:'u32',group:'Records',readonly:true},
      {label:'Ascensions',offset:108,type:'u32',group:'Records',readonly:true}
    ]
  });
})();
