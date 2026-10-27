/* Hill Climb Racing save format and editor, from NumPlay games/hillclimb/src/save.c. */
'use strict';
(() => {
  const VEHICLES = [
    ['Hill Climber', ['Engine','Suspension','Tires','4WD'], [13,14,16,10]],
    ['Motocross Bike', ['Engine','Suspension','Tires','Air Control'], [12,14,16,10]],
    ['Monster Truck', ['Engine','Suspension','Tires','4WD'], [14,16,18,10]],
    ['Quad Bike', ['Engine','Suspension','Tires','4WD'], [12,14,16,10]],
    ['Race Car', ['Engine','Suspension','Tires','Downforce'], [12,14,16,10]],
    ['Rally Car', ['Engine','Suspension','Tires','Downforce'], [13,14,17,10]],
    ['Dune Buggy', ['Engine','Suspension','Tires','Fuel'], [16,15,25,20]],
    ['Tank', ['Engine','Suspension','Tracks','Fuel'], [16,15,20,20]],
    ['Tractor', ['Engine','Tires','Fuel','Stability'], [16,15,20,15]],
    ['Tourist Bus', ['Engine','Suspension','Tires','Fuel'], [15,15,20,25]],
    ['Super Diesel 4x4', ['Engine','Suspension','Tires','Fuel'], [15,15,20,20]],
    ['Snow Mobile', ['Engine','Suspension','Tracks','Fuel'], [17,15,20,20]],
    ['Truck', ['Engine','Suspension','Tires','Fuel'], [15,15,20,25]],
  ];
  const STAGES = ['Countryside','Desert','Arctic','Highway','Cave','Moon','Mars','Alien Planet','Arctic Cave','Forest','Mountain','Mudpool','Volcano'];
  const VEHICLE_ORDER = [0,1,2,8,3,9,4,10,5,7,11,12,6];
  const MASK = (1 << 13) - 1;
  const number = new Intl.NumberFormat();
  let dialog = null;
  const countBits = (mask) => {
    let count = 0;
    for (let i = 0; i < 13; i++) count += (mask >>> i) & 1;
    return count;
  };
  const recordPattern = /^#>hillclimb\.sav:([A-Za-z0-9+/]+={0,2})[ \t]*(\r?)$/gm;
  function decodeFile(file) {
    const line = [...file.content.matchAll(recordPattern)][0];
    if (!line) return null;
    try {
      const encoded = line[1];
      if (encoded.length % 4 !== 0) throw Error('Invalid base64 length');
      const raw = atob(encoded);
      const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
      if (bytes.length < 16) throw Error('Save is too short');
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (v.getUint32(0, true) !== 0x31524348) throw Error('Save signature is not HCR1');
      const size = v.getUint32(4, true);
      if (size !== bytes.length - 8) throw Error('Save size does not match its header');
      if (size !== 444 && size !== 236 && size !== 224) throw Error('Unknown Hill Climb save format');
      const modern = size === 444;
      if (modern && v.getUint16(8, true) !== 3) throw Error('Unsupported Hill Climb save version');
      const o = modern ? 8 : 0;
      const coins = v.getUint32(8 + o / 2, true); // v3: 12, legacy: 8
      const cars = (v.getUint16(modern ? 16 : 12, true) | 1) & MASK;
      const maps = (v.getUint16(modern ? 18 : 14, true) | 1) & MASK;
      if (!modern) return { file, line, bytes, size, modern, coins, cars, maps };
      const upgrades = VEHICLES.map((vehicle, i) => vehicle[1].map((_, j) => v.getUint8(20 + i * 4 + j)));
      const best = STAGES.map((_, s) => VEHICLES.map((_, c) => v.getUint16(72 + (s * 13 + c) * 2, true)));
      return {
        file, line, bytes, size, modern, coins, cars, maps, upgrades, best,
        vehicle: v.getUint8(410), stage: v.getUint8(411), seenHelp: v.getUint8(412),
        runs: v.getUint32(416, true), meters: v.getUint32(420, true),
        flips: v.getUint32(424, true), bestAirMs: v.getUint32(428, true),
        coinsEarned: v.getUint32(432, true),
        stageLevels: STAGES.map((_, i) => v.getUint8(436 + i)),
      };
    } catch (error) {
      return { file, invalid: String(error.message || error) };
    }
  }
  function findCopy(files, groupFiles) {
    const matches = files.filter(f => groupFiles.has(f.name))
      .map(decodeFile).filter(Boolean);
    matches.sort((a, b) => (b.file.name === 'hillclimb_saves.py') - (a.file.name === 'hillclimb_saves.py') ||
      (b.file.savedAt || 0) - (a.file.savedAt || 0));
    return matches[0] || null;
  }
  function summary(files, groupFiles) {
    const save = findCopy(files, groupFiles);
    if (!save || save.invalid) return save ? { error: save.invalid } : null;
    return { coins: save.coins, cars: countBits(save.cars), maps: countBits(save.maps), modern: save.modern };
  }
  function open(groupFiles, bridge, ui) {
    const { make, inputField, checkField, selectField, section } = ui;
    const source = findCopy(bridge.files(), groupFiles);
    if (!source) return;
    if (dialog?.open) dialog.close();
    dialog?.remove();
    dialog = make('dialog', 'dialog gs-dialog'); document.body.append(dialog);
    let editing = false;
    const heading = make('div', 'gs-dialog-top');
    const headLabel = make('div'); headLabel.append(make('h2', '', 'Hill Climb Racing stats'));
    const info = make('p', 'muted', source.file.name + ' · ' + (source.modern ? 'Save format v3' : 'Legacy save format'));
    headLabel.append(info);
    const close = make('button', 'close-button', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => dialog.close());
    heading.append(headLabel, close);
    const note = make('p', 'gs-editor-note', 'These stats are in your browser backup, not on your calculator. Editing does not change your calculator. Export a vault backup before making changes.');
    const body = make('div', 'gs-dialog-body');
    const footer = make('div', 'gs-dialog-footer');
    const message = make('p', 'gs-message');
    const edit = make('button', 'button button-outline', 'Edit stats'); edit.type = 'button';
    const cancel = make('button', 'button button-outline', 'Cancel editing'); cancel.type = 'button';
    const saveBtn = make('button', 'button button-primary', 'Save backed-up copy'); saveBtn.type = 'button';
    footer.append(message, cancel, edit, saveBtn);
    cancel.hidden = saveBtn.hidden = true;
    dialog.append(heading, note, body, footer);
    function draw() {
      body.replaceChildren(); message.textContent = '';
      edit.hidden = editing; cancel.hidden = saveBtn.hidden = !editing;
      edit.disabled = !source.modern || !!source.invalid || !bridge.canEdit();
      if (source.invalid) {
        body.append(make('p', 'gs-warning', 'Could not read save data: ' + source.invalid)); return;
      }
      if (!source.modern) {
        body.append(make('p', 'gs-warning', 'This is an older Hill Climb save. Coins and unlocks can be viewed here, but editing requires a version 3 save. Opening the game in a recent NumPlay build upgrades the save.'));
      }
      const quick = make('div', 'gs-overview');
      for (const [label, value] of [['Coins', number.format(source.coins)], ['Cars unlocked', countBits(source.cars) + '/13'], ['Maps unlocked', countBits(source.maps) + '/13']]) {
        const tile = make('div', 'gs-tile'); tile.append(make('small', '', label), make('strong', '', value)); quick.append(tile);
      }
      body.append(quick);
      if (!source.modern) return;
      const overview = section('Progress', body); const fields = make('div', 'gs-field-grid'); overview.append(fields);
      const values = {};
      for (const [key,label,max] of [['coins','Coins',0xffffffff],['coinsEarned','Total coins earned',0xffffffff],['runs','Runs',0xffffffff],['meters','Total meters driven',0xffffffff],['flips','Flips',0xffffffff],['bestAirMs','Best air time (ms)',0xffffffff]]) {
        const x = inputField(label, source[key], max, editing); values[key] = x.input; fields.append(x.wrap);
      }
      const unlocks = section('Vehicles', body);
      const carList = make('div', 'gs-check-grid'); unlocks.append(carList);
      const carChecks = VEHICLES.map((v,i) => checkField(v[0] + (i === 0 ? ' (starter)' : ''), !!(source.cars & (1 << i)), editing, i === 0));
      for (const id of VEHICLE_ORDER) carList.append(carChecks[id].row);
      const allCars = make('button','button button-outline','Unlock all vehicles'); allCars.type='button'; allCars.hidden=!editing;
      allCars.addEventListener('click',()=>carChecks.forEach(x=>x.input.checked=true)); unlocks.append(allCars);
      const chosenCar = selectField('Selected vehicle',VEHICLES.map(v=>v[0]),source.vehicle,editing); unlocks.append(chosenCar.wrap);
      const mapsSection = section('Maps', body); const mapList = make('div','gs-map-grid'); mapsSection.append(mapList);
      const mapChecks = []; const mapLevels=[];
      STAGES.forEach((name,i)=>{
        const wrap=make('div','gs-map-item');
        const x=checkField(name+(i===0?' (starter)':''),!!(source.maps&(1<<i)),editing,i===0);
        const lvl=inputField('Stage level',source.stageLevels[i],255,editing);
        mapChecks.push(x.input);mapLevels.push(lvl.input); wrap.append(x.row,lvl.wrap);mapList.append(wrap);
      });
      const allMaps=make('button','button button-outline','Unlock all maps');allMaps.type='button';allMaps.hidden=!editing;
      allMaps.addEventListener('click',()=>mapChecks.forEach(x=>x.checked=true)); mapsSection.append(allMaps);
      const chosenMap=selectField('Selected map',STAGES,source.stage,editing);mapsSection.append(chosenMap.wrap);
      const upgradesSection=section('Vehicle upgrades',body);
      const upgradeFields=VEHICLES.map((v,i)=>{
        const details=make('details','gs-details');details.open=i===0;
        details.append(make('summary','',v[0]));
        const grid=make('div','gs-upgrade-grid');const inputs=[];
        v[1].forEach((name,u)=>{const x=inputField(name+' (max '+v[2][u]+')',source.upgrades[i][u],v[2][u],editing,1);inputs.push(x.input);grid.append(x.wrap);});
        details.append(grid);upgradesSection.append(details);return inputs;
      });
      const distanceSection=section('Best distance per map and vehicle',body);
      distanceSection.append(make('p','muted','Distances are in meters. Open a map to see the best result for every vehicle.'));
      const bestInputs=[];
      STAGES.forEach((s,i)=>{
        const details=make('details','gs-details');details.append(make('summary','',s));
        const grid=make('div','gs-distance-grid');
        const row=VEHICLES.map((v,c)=>{const x=inputField(v[0],source.best[i][c],65535,editing);grid.append(x.wrap);return x.input;});
        bestInputs.push(row);details.append(grid);distanceSection.append(details);
      });
      const readNum=(input,max,min=0)=>{
        const text=input.value.trim(); const n=Number(text);
        if(!/^\d+$/.test(text)||!Number.isSafeInteger(n)||n<min||n>max)
          throw Error('Enter a whole number from '+min+' to '+number.format(max)+' for '+(input.parentElement?.firstElementChild?.textContent||'this field')+'.');
        return n;
      };
      saveBtn.onclick=async()=>{
        if(!bridge.canEdit()){message.textContent='A USB operation is running. Try again afterward.';return;}
        const current=bridge.files().find(x=>x.name===source.file.name);
        if(!current||current.content!==source.file.content){message.textContent='This backup changed since the editor opened. Close and reopen it to protect the newer copy.';return;}
        try{
          const bytes=new Uint8Array(source.bytes), view=new DataView(bytes.buffer);
          for(const [key,input] of Object.entries(values)){
            const offsets={coins:12,coinsEarned:432,runs:416,meters:420,flips:424,bestAirMs:428};
            view.setUint32(offsets[key],readNum(input,0xffffffff),true);
          }
          let cars=1,maps=1;
          carChecks.forEach((x,i)=>{if(x.input.checked)cars|=1<<i;});
          mapChecks.forEach((x,i)=>{if(x.checked)maps|=1<<i;});
          const selectedCar=Number(chosenCar.input.value),selectedMap=Number(chosenMap.input.value);
          if(!(cars&(1<<selectedCar))||!(maps&(1<<selectedMap)))throw Error('Select an unlocked vehicle and an unlocked map.');
          view.setUint16(16,cars,true);view.setUint16(18,maps,true);
          view.setUint8(410,selectedCar);view.setUint8(411,selectedMap);
          VEHICLES.forEach((v,i)=>v[1].forEach((_,u)=>view.setUint8(20+i*4+u,readNum(upgradeFields[i][u],v[2][u],1))));
          STAGES.forEach((_,i)=>{
            view.setUint8(436+i,readNum(mapLevels[i],255));
            VEHICLES.forEach((_,c)=>view.setUint16(72+(i*13+c)*2,readNum(bestInputs[i][c],65535),true));
          });
          const encoded=btoa(String.fromCharCode(...bytes));
          const newline=source.line[2]||'';
          const replacement='#>hillclimb.sav:'+encoded+newline;
          const changed=source.file.content.replace(source.line[0],replacement);
          if(changed===source.file.content){message.textContent='No changes were made.';return;}
          const result=decodeFile({...source.file,content:changed});
          if(!result?.modern||result.invalid)throw Error('Modified save failed validation.');
          saveBtn.disabled=true;
          await bridge.save(source.file.name,changed);
          dialog.close();
        }catch(err){message.textContent=err?.message||String(err);}
        finally{saveBtn.disabled=false;}
      };
    }
    edit.onclick=()=>{if(!source.modern||source.invalid||!bridge.canEdit())return;editing=true;draw();};
    cancel.onclick=()=>{editing=false;draw();};
    draw(); dialog.showModal();
  }
  window.NumPlaySaveStats.register('hillclimb', { summary, open });
})();
