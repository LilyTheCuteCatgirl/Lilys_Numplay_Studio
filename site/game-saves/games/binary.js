'use strict';
(() => {
  const registry = window.NumPlaySaveStats;
  const number = n => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const fname = name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bytesFrom = encoded => {
    if (!encoded || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw Error('Invalid save encoding');
    const binary = atob(encoded);
    if (btoa(binary) !== encoded) throw Error('Invalid save encoding');
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  };
  const hash = (bytes, end = bytes.length) => {
    let value = 2166136261;
    for (let i = 0; i < end; i++) value = Math.imul(value ^ bytes[i], 16777619) >>> 0;
    return value;
  };
  // Games such as Suika, Flappy Dunk and Doodle Jump use FNV-1a on
  // little-endian uint32 words after the checksum. Most use offset 4;
  // Suika places its checksum at offset 8 because its header is longer.
  function wordHash(bytes, start = 8) {
    if (bytes.length < start + 4 || bytes.length % 4 || start % 4)
      throw Error('Invalid word-checksummed save size');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let value = 2166136261;
    for (let i = start; i < bytes.length; i += 4)
      value = Math.imul(value ^ view.getUint32(i, true), 16777619) >>> 0;
    return value;
  }
  function read(view, field) {
    const o = field.offset;
    switch (field.type || 'u32') {
      case 'u8': return view.getUint8(o);
      case 'u16': return view.getUint16(o, true);
      case 'u32': return view.getUint32(o, true);
      case 'f64': return view.getFloat64(o, true);
      default: throw Error('Unsupported field type');
    }
  }
  function write(view, field, value) {
    const o = field.offset;
    switch (field.type || 'u32') {
      case 'u8': view.setUint8(o, value); break;
      case 'u16': view.setUint16(o, value, true); break;
      case 'u32': view.setUint32(o, value, true); break;
      case 'f64': view.setFloat64(o, value, true); break;
      default: throw Error('Unsupported field type');
    }
  }
  const pop = n => { let c = 0; for (let i = 0; i < 32; i++) c += (n >>> i) & 1; return c; };
  function register(schema) {
    if (!/^[a-z0-9]+$/.test(schema.id) || !/^[a-z0-9_.]+\.sav$/.test(schema.record)) throw Error('Invalid game stats module');
    const rx = new RegExp('^#([>=])('+fname(schema.record)+'):(?:([0-9]+):)?([A-Za-z0-9+/]+={0,2})[ \\t]*(\\r?)$', 'gm');
    let dialog = null;
    function decode(files, groupFiles) {
      const sources = files.filter(f => groupFiles.has(f.name)).sort((a,b) =>
        (Number(b.name === schema.id + '_saves.py') - Number(a.name === schema.id + '_saves.py')) ||
        (b.savedAt || 0) - (a.savedAt || 0));
      for (const file of sources) {
        const match = [...file.content.matchAll(rx)][0];
        if (!match) continue;
        try {
          if ((match[1] === '=') !== (match[3] !== undefined)) throw Error('Invalid compressed save record');
          const entry = { kind: match[1], name: schema.record, size: match[3] ? Number(match[3]) : null, base64: match[4] };
          const bytes = window.NumPlayGameSaveRestore?.decodeEntry(entry) || (match[1] === '>' ? bytesFrom(match[4]) : null);
          if (!bytes) throw Error('Compressed game-save decoder unavailable');
          if (bytes.length < (schema.minSize ?? (schema.exactSize ?? 16)) || (schema.exactSize && bytes.length !== schema.exactSize)) throw Error('Unexpected save file size');
          const view = new DataView(bytes.buffer);
          if (schema.magic !== undefined && view.getUint32(0, true) !== schema.magic) throw Error('Save signature mismatch');
          if (schema.magicByte !== undefined && bytes[0] !== schema.magicByte) throw Error('Save signature mismatch');
          if (schema.magicText && String.fromCharCode(...bytes.subarray(0,4)) !== schema.magicText) throw Error('Save signature mismatch');
          if (schema.versionByte !== undefined && bytes[schema.magicText ? 4 : 1] !== schema.versionByte) throw Error('Unsupported save version');
          if (schema.version !== undefined && view.getUint16(4, true) !== schema.version) throw Error('Unsupported save version');
          if (schema.sizeField === 'full16' && view.getUint16(6, true) !== bytes.length) throw Error('Save length mismatch');
          if (schema.sizeField === 'payload32' && view.getUint32(4, true) !== bytes.length - 8) throw Error('Save length mismatch');
          if (schema.checksum === 'fnv' && view.getUint32(bytes.length-4, true) !== hash(bytes, bytes.length-4)) throw Error('Save checksum failed');
          if (schema.checksum === 'word-fnv' && view.getUint32(schema.checksumOffset ?? 4, true) !== wordHash(bytes, (schema.checksumOffset ?? 4) + 4)) throw Error('Save checksum failed');
          const max = schema.checksum === 'fnv' ? bytes.length - 4 : bytes.length;
          for (const f of [...schema.fields, ...(schema.bits || [])]) {
            if (f.offset < 0 || f.offset + ({u8:1,u16:2,u32:4,f64:8}[f.type || 'u32']) > max) throw Error('Unknown save field layout');
          }
          return { file, match, bytes, view, compressed: match[1] === '=' };
        } catch (e) { return { error: String(e?.message || e), file }; }
      }
      return null;
    }
    function summary(files, groupFiles) {
      const s = decode(files, groupFiles);
      if (!s) return null;
      if (s.error) return { error: s.error, fields: [], name: schema.title };
      const fields = [];
      for (const f of schema.fields) if (f.summary) fields.push({ label: f.label, value: number(read(s.view,f)) });
      for (const f of schema.bits || []) if (f.summary) fields.push({label:f.label,value:pop(read(s.view,f)) + '/' + f.names.length});
      return { fields, name: schema.title };
    }
    function open(groupFiles, bridge, ui) {
      const source = decode(bridge.files(), groupFiles);
      if (!source) return;
      if (dialog?.open) dialog.close(); dialog?.remove();
      const {make, inputField, checkField, section} = ui;
      dialog = make('dialog','dialog gs-dialog'); document.body.append(dialog);
      const head = make('div','gs-dialog-top'), name = make('div');
      name.append(make('h2','',schema.title + ' stats'),make('p','muted',source.file.name));
      const close = make('button','close-button','×');close.type='button';close.setAttribute('aria-label','Close');close.onclick=()=>dialog.close();head.append(name,close);
      const note = make('p','gs-editor-note','Changes affect your browser backup, not your calculator. Export a Save Vault backup before editing.');
      const body = make('div','gs-dialog-body'), footer = make('div','gs-dialog-footer');
      const msg = make('p','gs-message'), edit = make('button','button button-outline','Edit stats'), cancel=make('button','button button-outline','Cancel editing'), save=make('button','button button-primary','Save backed-up copy');
      for (const b of [edit,cancel,save]) b.type='button';footer.append(msg,cancel,edit,save);dialog.append(head,note,body,footer);
      let editing = false;
      function draw() {
        body.replaceChildren();msg.textContent='';edit.hidden=editing;cancel.hidden=save.hidden=!editing;edit.disabled=!!source.error || !bridge.canEdit() || (source.compressed && source.bytes.length > 2048);
        if (source.error) {body.append(make('p','gs-warning',source.error));return;}
        const overview=make('div','gs-overview');
        const stats = summary([source.file],new Set([source.file.name]));
        for(const {label,value} of stats?.fields || []) {const tile=make('div','gs-tile');tile.append(make('small','',label),make('strong','',String(value)));overview.append(tile);}
        if (overview.childElementCount)body.append(overview);
        if(source.compressed && source.bytes.length > 2048)
          body.append(make('p','gs-warning','This large compressed backup can be viewed, but editing it is disabled to avoid expanding the calculator storage file.'));
        const inputValues=[],inputBits=[];
        for (const group of [...new Set(schema.fields.map(f=>f.group || 'Progress'))]) {
          const part=section(group,body), grid=make('div','gs-field-grid');part.append(grid);
          for(const f of schema.fields.filter(f=>(f.group || 'Progress') === group)){
            const val=read(source.view,f);
            const field=inputField(f.label,val,f.max ?? ({u8:255,u16:65535,u32:4294967295,f64:1e300}[f.type || 'u32']),editing && !f.readonly,f.min ?? 0);
            if(f.type==='f64') {field.input.step='any';field.input.type='number';}
            grid.append(field.wrap);inputValues.push({f,input:field.input});
          }
        }
        for(const bits of schema.bits || []){
          const part=section(bits.label,body),grid=make('div','gs-check-grid');part.append(grid);
          bits.names.forEach((label,i)=>{const field=checkField(label,!!(read(source.view,bits)&(1<<i)),editing && !bits.readonly,i===0 && bits.keepFirst);grid.append(field.row);inputBits.push({bits,index:i,input:field.input});});
        }
        if(schema.extra) schema.extra(source,body,ui);
        save.onclick=async()=>{
          if(!bridge.canEdit()){msg.textContent='Finish the USB operation first.';return;}
          const current=bridge.files().find(f=>f.name===source.file.name);
          if(!current || current.content!==source.file.content) {msg.textContent='This backup changed. Close and reopen to edit the latest copy.';return;}
          try {
            const data=new Uint8Array(source.bytes),view=new DataView(data.buffer);
            for(const {f,input} of inputValues){
              if(f.readonly)continue;
              const raw=input.value.trim(),value=Number(raw),maximum=f.max ?? ({u8:255,u16:65535,u32:4294967295,f64:1e300}[f.type || 'u32']);
              if(!raw || !Number.isFinite(value) || value < (f.min ?? 0) || value > maximum || (f.type!=='f64' && (!Number.isSafeInteger(value)||!/^[0-9]+$/.test(raw)))) throw Error('Invalid value for '+f.label);
              write(view,f,value);
            }
            for(const bits of schema.bits || []) {
              if(bits.readonly)continue;
              let mask=0;
              for(const {bits:ref,index,input} of inputBits)if(ref===bits && input.checked)mask|=1<<index;
              if(bits.keepFirst)mask|=1;
              write(view,bits,mask);
            }
            if(schema.checkSave) schema.checkSave(view,data);
            if(schema.checksum==='fnv')view.setUint32(data.length-4,hash(data,data.length-4),true);
            if(schema.checksum==='word-fnv')view.setUint32(schema.checksumOffset ?? 4,wordHash(data,(schema.checksumOffset ?? 4)+4),true);
            const encoded=btoa(Array.from(data,x=>String.fromCharCode(x)).join(''));
            if(source.compressed && data.length > 2048) throw Error('Editing this large compressed backup is not yet supported.');
            const changed=source.file.content.replace(source.match[0],'#>'+schema.record+':'+encoded+source.match[5]);
            if(changed===source.file.content){msg.textContent='No changes were made.';return;}
            const after=decode([{name:source.file.name,content:changed,savedAt:source.file.savedAt}],new Set([source.file.name]));
            if(!after || after.error) throw Error('Edited save failed validation: '+(after?.error || 'unknown'));
            save.disabled=true;await bridge.save(source.file.name,changed);dialog.close();
          }catch(e){msg.textContent=String(e?.message||e);}finally{save.disabled=false;}
        };
      }
      edit.onclick=()=>{if(source.error||!bridge.canEdit()||(source.compressed && source.bytes.length>2048))return;editing=true;draw();};cancel.onclick=()=>{editing=false;draw();};draw();dialog.showModal();
    }
    registry.register(schema.id,{summary,open});
    return {decode,summary};
  }
  window.NumPlayBinarySave = { register, hash, wordHash };
})();
