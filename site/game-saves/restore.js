/* Game-aware backup restoration. Calculator writes are performed by the verified USB storage module. */
'use strict';
(() => {
  const textDecoder = new TextDecoder('utf-8', { fatal: true });
  const textEncoder = new TextEncoder();
  const safeName = name => /^[a-z0-9_.-]{1,90}$/i.test(name) && !name.includes('..');
  const clone = r => ({ name: r.name, value: new Uint8Array(r.value) });
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const recordRx = /^#([>=])([a-z0-9_.-]{1,90}):(?:(\d+):)?([A-Za-z0-9+/]+={0,2})\s*$/gim;

  function decodedText(record) {
    const bytes = record.value[0] <= 1 ? record.value.subarray(1) : record.value;
    return textDecoder.decode(bytes).replace(/\0+$/, '');
  }
  function scriptRecord(name, content, flag = 0) {
    const bytes = textEncoder.encode(content);
    const out = new Uint8Array(bytes.length + 2);
    out[0] = flag;
    out.set(bytes, 1);
    return { name, value: out };
  }
  function parseEntries(script) {
    const entries = [];
    for (const m of script.matchAll(recordRx)) {
      if (!safeName(m[2])) continue;
      const compressed = m[1] === '=';
      if (compressed !== (m[3] !== undefined)) throw Error('Malformed game-save record for ' + m[2]);
      entries.push({ name: m[2], original: m[0].replace(/\r?\n$/, ''), kind: m[1], size: compressed ? Number(m[3]) : null, base64: m[4] });
    }
    return entries;
  }
  function decodeBase64(base64) {
    if (!base64 || base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
      throw Error('Damaged base64 backup');
    const str = atob(base64);
    const bytes = Uint8Array.from(str, c => c.charCodeAt(0));
    if (btoa(str) !== base64) throw Error('Noncanonical base64 backup');
    return bytes;
  }
  function unpackLz(packed, cap) {
    if (!Number.isSafeInteger(cap) || cap < 1 || cap >= 65536) throw Error('Invalid packed save size');
    const out = new Uint8Array(cap);
    let i = 0, o = 0;
    while (i < packed.length) {
      const flags = packed[i++];
      for (let bit = 0; bit < 8 && i < packed.length; bit++) {
        if (flags & (1 << bit)) {
          if (o >= cap) throw Error('Packed save exceeds expected size');
          out[o++] = packed[i++];
        } else {
          if (i + 2 > packed.length) throw Error('Truncated packed save');
          const distance = (packed[i] | ((packed[i + 1] & 15) << 8)) + 1;
          const len = (packed[i + 1] >> 4) + 3;
          i += 2;
          if (distance > o || o + len > cap) throw Error('Damaged packed save reference');
          for (let k = 0; k < len; k++, o++) out[o] = out[o - distance];
        }
      }
    }
    if (o !== cap) throw Error('Packed save did not produce the expected number of bytes');
    return out;
  }
  function decodeEntry(entry) {
    const bytes = decodeBase64(entry.base64);
    return entry.kind === '=' ? unpackLz(bytes, entry.size) : bytes;
  }
  // Recognize the game's current and older save headers before restoring it.
  function validateKnownRecord(name, bytes) {
    if (name !== 'hillclimb.sav') return;
    if (![232, 244, 452].includes(bytes.length)) throw Error('Hill Climb backup has an unknown file size');
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (data.getUint32(0, true) !== 0x31524348 || data.getUint32(4, true) !== bytes.length - 8)
      throw Error('Hill Climb backup has an invalid header');
    if (bytes.length === 452 && data.getUint16(8, true) !== 3)
      throw Error('Hill Climb backup version is unsupported');
  }
  function belongs(name, id, records) {
    return records.some(entry => entry === name || (entry.endsWith('*') && name.startsWith(entry.slice(0, -1)))) ||
      name === id + '.sav';
  }
  function gameSources(files, id, patterns) {
    const personal = files.filter(f => f.name.toLowerCase() === id.toLowerCase() + '_saves.py');
    const dedicated = files.filter(f => f.name.toLowerCase() !== 'numplay_saves.py' &&
      (patterns.includes(f.name) || f.name.toLowerCase() === id.toLowerCase() + '_saves.py'));
    const individual = personal.length ? personal : dedicated;
    const shared = files.filter(f => f.name === 'numplay_saves.py');
    const archive = new Map();
    for (const file of shared) {
      for (const entry of parseEntries(file.content)) if (belongs(entry.name, id, patterns)) archive.set(entry.name, { entry, file });
    }
    // A game's own Python script is authoritative for that game's save.
    for (const file of individual) {
      for (const entry of parseEntries(file.content)) if (belongs(entry.name, id, patterns)) archive.set(entry.name, { entry, file });
    }
    return { individual, shared, archive };
  }
  function mergeSharedScript(liveText, newLines) {
    const found = new Set();
    const merged = liveText.replace(/^#[>=]([a-z0-9_.-]+):[^\r\n]*/gim, (line, name) => {
      if (!newLines.has(name)) return line;
      found.add(name);
      return newLines.get(name);
    });
    const missing = [...newLines].filter(([name]) => !found.has(name)).map(([, line]) => line);
    if (!missing.length) return merged;
    const newline = liveText.includes('\r\n') ? '\r\n' : '\n';
    return merged + (merged && !merged.endsWith('\n') ? newline : '') + missing.join(newline) + newline;
  }
  function prepare(files, gameMap, live, targetGame = null) {
    const current = new Map(live.map(clone).map(r => [r.name, r]));
    const updates = new Map();
    const matched = [], unavailable = [];
    const ids = targetGame ? [targetGame] : [...gameMap.keys()];
    for (const id of ids) {
      const patterns = gameMap.get(id) || [];
      if (!patterns.length) { unavailable.push(id + ': no known game save records'); continue; }
      const { individual, shared, archive } = gameSources(files, id, patterns);
      if (!archive.size) { if (targetGame) unavailable.push(id + ': no backup data'); continue; }
      const originalShared = current.get('numplay_saves.py');
      const liveShared = updates.get('numplay_saves.py') || originalShared;
      let hasGame = individual.some(f => current.has(f.name)) || [...archive.keys()].some(n => current.has(n));
      if (!hasGame && originalShared && shared.length) {
        const liveEntries = parseEntries(decodedText(originalShared));
        hasGame = liveEntries.some(e => belongs(e.name, id, patterns));
      }
      if (!hasGame) { unavailable.push(id + ': no matching game saves found on calculator'); continue; }
      const newShared = new Map();
      let modified = false;
      for (const { entry, file } of archive.values()) {
        const raw = decodeEntry(entry);
        if (!raw.length || raw.length > 60000) throw Error('Game save ' + entry.name + ' has an unsafe size');
        validateKnownRecord(entry.name, raw);
        // Also restore missing raw saves when another file proves this game's
        // progress already exists on the calculator (for example its Python copy).
        const existing = current.get(entry.name);
        if (!existing || !same(existing.value, raw)) {
          updates.set(entry.name, { name: entry.name, value: raw });
          modified = true;
        }
        if (file.name === 'numplay_saves.py') newShared.set(entry.name, entry.original);
      }
      // A per-game restore must never copy other games' save lines from a
      // mixed Python file. Keep an existing script's other lines verbatim.
      for (const file of individual) {
        const lines = new Map(parseEntries(file.content)
          .filter(entry => belongs(entry.name, id, patterns))
          .map(entry => [entry.name, entry.original]));
        if (!lines.size) continue;
        const old = current.get(file.name);
        const content = mergeSharedScript(old ? decodedText(old) : '', lines);
        const value = scriptRecord(file.name, content, old && old.value[0] <= 1 ? old.value[0] : 0);
        if (!old || !same(old.value, value.value)) { updates.set(file.name, value); modified = true; }
      }
      // Only replace this game's lines in the shared Python script. Other games remain untouched.
      if (newShared.size && liveShared) {
        const merged = mergeSharedScript(decodedText(liveShared), newShared);
        const value = scriptRecord('numplay_saves.py', merged, liveShared.value[0] <= 1 ? liveShared.value[0] : 0);
        if (!same(liveShared.value, value.value)) { updates.set(value.name, value); modified = true; }
      }
      matched.push({ id, changed: modified, files: archive.size });
    }
    if (targetGame && !matched.length) throw Error(unavailable.join('; ') || 'No matching save records found');
    return { updates: [...updates.values()], matched, unavailable };
  }
  window.NumPlayGameSaveRestore = { prepare, parseEntries, decodeEntry, mergeSharedScript };
})();
