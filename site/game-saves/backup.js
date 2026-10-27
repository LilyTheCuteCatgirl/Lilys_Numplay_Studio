/* Select one game's calculator records for a read-only Save Vault backup. */
'use strict';
(() => {
  const safeName = name => typeof name === 'string' && /^[a-z0-9_.-]{1,90}$/i.test(name) && !name.includes('..');
  const lineRx = /^#([>=])([a-z0-9_.-]+):(?:(\d+):)?([A-Za-z0-9+/]+={0,2})\s*$/i;
  const owned = (name, id, patterns) => {
    const lower = name.toLowerCase();
    return lower === id.toLowerCase() + '.sav' || lower === id.toLowerCase() + '_saves.py' ||
      patterns.some(p => typeof p === 'string' && (p.endsWith('*') ?
        lower.startsWith(p.slice(0, -1).toLowerCase()) : lower === p.toLowerCase()));
  };
  function base64(bytes) {
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192)
      text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(text);
  }
  function verifiedCopy(line, raw) {
    try {
      const codec = window.NumPlayGameSaveRestore;
      const entry = codec?.parseEntries(line)?.[0];
      if (!entry) return false;
      const unpacked = codec.decodeEntry(entry);
      return unpacked.length === raw.length && unpacked.every((x, i) => x === raw[i]);
    } catch (_) { return false; }
  }
  function collect(gameId, patterns, records, scripts) {
    if (!/^[a-z0-9_-]{1,70}$/i.test(gameId) || !Array.isArray(patterns) || !patterns.length)
      throw new Error('The game does not have a recognized backup format.');
    if (!Array.isArray(records) || !Array.isArray(scripts)) throw new Error('Invalid calculator backup session.');
    const binaries = new Map();
    for (const r of records) {
      if (!safeName(r.name) || r.name.toLowerCase().endsWith('.py') || !owned(r.name, gameId, patterns)) continue;
      if (!(r.value instanceof Uint8Array) || !r.value.length || r.value.length > 60000)
        throw new Error(r.name + ' is not a supported calculator save size.');
      binaries.set(r.name.toLowerCase(), { name: r.name, bytes: r.value, line: '#>' + r.name + ':' + base64(r.value) });
    }
    const files = [];
    const covered = new Set();
    let copied = 0;
    // Keep only the requested game's backup records. The normal vault merge
    // retains records from other games already saved in numplay_saves.py.
    for (const file of scripts) {
      if (!safeName(file.name) || !/_saves\.py$/i.test(file.name) || typeof file.content !== 'string') continue;
      const shared = file.name.toLowerCase() === 'numplay_saves.py';
      const dedicated = !shared && owned(file.name, gameId, patterns);
      if (!shared && !dedicated) continue;
      const lines = [];
      const used = new Set();
      for (const line of file.content.split(/\r?\n/)) {
        const record = line.match(lineRx);
        if (!record) { if (dedicated && line) lines.push(line); continue; }
        if (!owned(record[2], gameId, patterns)) continue;
        if (!safeName(record[2])) continue;
        const name = record[2].toLowerCase();
        if (used.has(name)) continue;
        lines.push(binaries.has(name) && !verifiedCopy(line.trimEnd(), binaries.get(name).bytes) ?
          binaries.get(name).line : line.trimEnd());
        used.add(name);
        copied++;
      }
      if (dedicated) {
        // A game's own script must stay usable if its Python copy is restored.
        for (const [name, binary] of binaries) if (!used.has(name)) {
          lines.push(binary.line); used.add(name); copied++;
        }
      }
      if (used.size) files.push({ name: file.name, content: lines.join('\n') + '\n' });
      for (const name of used) covered.add(name);
    }
    // Some older games only have a live .sav file, not a Python copy.
    // Archive the raw bytes in the standard shared record format.
    const missing = [...binaries].filter(([name]) => !covered.has(name)).map(([, binary]) => binary);
    if (missing.length) {
      const text = missing.map(b => b.line).join('\n') + '\n';
      const shared = files.find(f => f.name.toLowerCase() === 'numplay_saves.py');
      if (shared) shared.content += text;
      else files.push({ name: 'numplay_saves.py', content: text });
      copied += missing.length;
    }
    if (!copied || !files.length)
      throw new Error('No saved progress for this game was found on the calculator. Nothing was changed.');
    for (const file of files) {
      if (new Blob([file.content]).size > 600 * 1024)
        throw new Error('The backup for ' + gameId + ' is too large to store safely.');
    }
    return { files, records: copied };
  }
  window.NumPlayGameSaveBackup = { collect };
})();
