/* Shared Save Vault game stats and editor controls. */
'use strict';
(() => {
  const editors = new Map();
  let vault = null;
  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  function inputField(label, value, max, editable, min = 0) {
    const wrap = make('label', 'gs-field');
    wrap.append(make('span', '', label));
    const inp = make('input', 'gs-input');
    inp.type = 'number'; inp.min = String(min); inp.max = String(max);
    inp.step = '1'; inp.value = String(value); inp.disabled = !editable;
    wrap.append(inp);
    return { wrap, input: inp };
  }
  function checkField(label, checked, editable, locked = false) {
    const row = make('label', 'gs-check');
    const inp = make('input'); inp.type = 'checkbox'; inp.checked = checked; inp.disabled = !editable || locked;
    row.append(inp, make('span', '', label));
    return { row, input: inp };
  }
  function selectField(label, names, selected, editable) {
    const wrap = make('label', 'gs-field'); wrap.append(make('span', '', label));
    const sel = make('select', 'gs-input'); sel.disabled = !editable;
    names.forEach((name, id) => {
      const opt = make('option', '', name); opt.value = String(id); sel.append(opt);
    });
    sel.value = String(selected < names.length ? selected : 0);
    wrap.append(sel); return { wrap, input: sel };
  }
  function section(title, parent) {
    const s = make('section', 'gs-section');
    s.append(make('h3', '', title)); parent.append(s); return s;
  }
  const ui = { make, inputField, checkField, selectField, section };
  function register(id, editor) {
    if (editors.has(id)) throw new Error('Duplicate stats editor: ' + id);
    editors.set(id, editor);
  }
  function bind(api) { vault = api; }
  function summary(id, files, groupFiles) {
    const editor = editors.get(id);
    if (editor) {
      const result = editor.summary(files, groupFiles);
      if (result) return result;
    }
    return groupFiles?.size ? { generic: true, fields: [] } : null;
  }
  function open(id, groupFiles) {
    const editor = editors.get(id);
    if (!vault) return;
    if (editor && editor.summary(vault.files(), groupFiles)) { editor.open(groupFiles, vault, ui); return; }
    const dialog = make('dialog', 'dialog gs-dialog');
    const head = make('div', 'gs-dialog-top');
    head.append(make('h2', '', 'Save details'));
    const close = make('button', 'close-button', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => dialog.close()); head.append(close);
    const note = make('p', 'gs-editor-note',
      'This game does not have a verified stats decoder yet. Its backups can still be exported, backed up, and restored. No save data will be changed here.');
    const body = make('div', 'gs-dialog-body');
    for (const f of vault.files().filter(f => groupFiles.has(f.name))) {
      const section = make('section', 'gs-section');
      section.append(make('h3', '', f.name));
      const count = [...f.content.matchAll(/^#(?:>|=)[a-z0-9_.-]+:/gim)].length;
      section.append(make('p', 'muted', count + ' embedded save record(s) · ' +
        new Blob([f.content]).size.toLocaleString() + ' bytes of backed-up script data'));
      body.append(section);
    }
    dialog.append(head, note, body); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), {once:true}); dialog.showModal();
  }
  window.NumPlaySaveStats = { register, bind, summary, open, ui };
})();
