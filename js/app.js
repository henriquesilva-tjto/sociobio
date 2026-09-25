import { putInterview, getInterview, listInterviews, deleteInterview, putAudio, getAudios, allData, importData, getSetting, saveSetting, markSynced } from './db.js';
import { visibleQuestions } from './rules.js';
import { $, show, hide, downloadBlob, escapeCsv, blobToBase64, base64ToBlob } from './ui.js';

const modules = {
  A: 'Perfil sociodemográfico', B: 'Organização socioprodutiva', C: 'Produção e comercialização',
  D: 'Políticas públicas e crédito', E: 'Sustentabilidade ambiental', F: 'Renda e reprodução socioeconômica',
  G: 'Inovação social e tecnologias'
};

const state = { questions: [], interview: null, visible: [], index: 0, mediaRecorder: null, chunks: [], recognition: null, recording: false };

function uid() { return 'INT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
function moduleOf(q) { return modules[q.id[0]] || 'Questionário'; }
function setNetwork() {
  const on = navigator.onLine;
  $('network').textContent = on ? '● Online' : '● Offline';
  $('network').className = 'network ' + (on ? 'online' : 'offline');
}

async function homeStats() {
  const items = await listInterviews();
  const pending = items.filter(x => x.syncStatus !== 'synced').length;
  const completed = items.filter(x => x.status === 'completed').length;
  const inProgress = items.filter(x => x.status !== 'completed').length;
  $('stats').innerHTML = `<div><b>${items.length}</b><small>Total</small></div><div><b>${completed}</b><small>Concluídas</small></div><div><b>${inProgress}</b><small>Em andamento</small></div><div><b>${pending}</b><small>Pendentes</small></div>`;
}

async function renderList() {
  const list = $('interviewList');
  const items = await listInterviews();
  await homeStats();
  if (!items.length) { list.innerHTML = '<p class="note">Nenhuma entrevista salva neste aparelho.</p>'; return; }
  list.innerHTML = '';
  for (const it of items) {
    const el = document.createElement('div');
    el.className = 'listitem';
    const d = new Date(it.updatedAt).toLocaleString('pt-BR');
    const sync = it.syncStatus === 'synced' ? 'Sincronizada' : 'Pendente';
    el.innerHTML = `<div><strong>${it.meta?.id_quest || it.id}</strong><small>${it.meta?.municipio || 'Sem município'} • ${it.meta?.cadeiaLabel || 'Sem cadeia'}<br>${d}</small></div><div class="item-actions"><span class="status ${it.syncStatus === 'synced' ? 'ok' : ''}">${it.status === 'completed' ? 'Concluída' : 'Em andamento'} • ${sync}</span></div>`;
    const btn = document.createElement('button'); btn.className = 'secondary'; btn.textContent = it.status === 'completed' ? 'Abrir' : 'Continuar'; btn.onclick = () => loadInterview(it.id);
    const del = document.createElement('button'); del.className = 'danger'; del.textContent = 'Excluir';
    del.onclick = async () => { if (confirm('Excluir esta entrevista e seus áudios? Esta ação não pode ser desfeita.')) { await deleteInterview(it.id); await renderList(); } };
    el.querySelector('.item-actions').append(btn, del); list.appendChild(el);
  }
}

function resetSetup() {
  $('setupMsg').textContent = '';
  $('id_quest').value = '';
  $('data').value = new Date().toISOString().slice(0, 10);
  $('entrevistador').value = '';
  $('municipio').value = '';
  $('comunidade').value = '';
  $('tipo_local').value = '';
  $('gps').value = '';
  $('cadeia').value = '';
  $('consent').value = '';
  $('audioConsent').checked = false;
}

async function startNewInterview() {
  resetSetup(); hide('home'); show('setup');
}

async function startInterview() {
  const consent = $('consent').value;
  if (!['1', '2'].includes(consent)) { $('setupMsg').textContent = 'Registre o consentimento antes de iniciar.'; return; }
  if (!$('cadeia').value) { $('setupMsg').textContent = 'Selecione a cadeia produtiva.'; return; }
  state.interview = {
    id: uid(), createdAt: Date.now(), updatedAt: Date.now(), status: 'in_progress', syncStatus: 'pending',
    meta: {
      id_quest: $('id_quest').value.trim() || uid(), data: $('data').value, entrevistador: $('entrevistador').value.trim(),
      municipio: $('municipio').value.trim(), comunidade: $('comunidade').value.trim(), tipo_local: $('tipo_local').value,
      gps: $('gps').value, cadeia: $('cadeia').value, cadeiaLabel: $('cadeia').selectedOptions[0]?.text || '', consent,
      audio_authorized: $('audioConsent').checked
    }, answers: {}
  };
  await putInterview(state.interview);
  state.index = 0; state.visible = visibleQuestions(state.questions, state.interview.answers);
  hide('setup'); show('survey'); renderQuestion();
}

async function loadInterview(id) {
  const it = await getInterview(id); if (!it) return;
  state.interview = it; state.index = 0; state.visible = visibleQuestions(state.questions, it.answers || {});
  hide('home'); hide('settings'); hide('setup'); show('survey'); renderQuestion();
}

function current() { return state.visible[state.index]; }

function renderQuestion() {
  state.visible = visibleQuestions(state.questions, state.interview.answers || {});
  if (state.index >= state.visible.length) { finishInterview(); return; }
  const q = current();
  $('moduleLabel').textContent = moduleOf(q);
  $('questionCount').textContent = `${state.index + 1} / ${state.visible.length}`;
  $('progressBar').style.width = `${((state.index + 1) / state.visible.length) * 100}%`;
  $('qcode').textContent = (q.star ? '★ ' : '') + q.id;
  $('qtext').textContent = q.text;
  $('qnote').textContent = q.star ? 'Pergunta comparável — não alterar enunciado nem escala.' : '';
  $('answerArea').innerHTML = ''; $('heard').textContent = ''; $('voiceStatus').textContent = ''; $('audioState').textContent = '';
  renderAnswer(q); updateNav();
}

function renderAnswer(q) {
  const a = state.interview.answers || (state.interview.answers = {});
  if (q.type === 'single' || q.type === 'multi') {
    const wrap = document.createElement('div'); wrap.className = 'options';
    const currentVals = q.type === 'multi' && Array.isArray(a[q.var]) ? a[q.var] : [];
    q.options.forEach(o => {
      const lab = document.createElement('label'); lab.className = 'option';
      const inp = document.createElement('input'); inp.type = q.type === 'multi' ? 'checkbox' : 'radio'; inp.name = 'ans'; inp.value = o.value;
      inp.checked = q.type === 'multi' ? currentVals.map(String).includes(String(o.value)) : String(a[q.var]) === String(o.value);
      inp.onchange = () => { if (q.type === 'multi') a[q.var] = [...wrap.querySelectorAll('input:checked')].map(x => Number(x.value)); else a[q.var] = Number(o.value); persist(); };
      lab.append(inp, document.createTextNode(' ' + o.label)); wrap.appendChild(lab);
    }); $('answerArea').appendChild(wrap);
  } else if (q.type === 'compound') {
    for (const f of q.fields) {
      const div = document.createElement('div'); div.className = 'field';
      const label = document.createElement('label'); label.textContent = f.label;
      const inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.inputMode = 'numeric'; inp.value = a[f.name] ?? '';
      inp.oninput = () => { a[f.name] = inp.value === '' ? '' : Number(inp.value); persist(); };
      div.append(label, inp); $('answerArea').appendChild(div);
    }
  } else {
    const div = document.createElement('div'); div.className = 'field'; const label = document.createElement('label'); label.textContent = q.type === 'number' ? 'Valor' : 'Resposta';
    const inp = document.createElement(q.type === 'text' ? 'textarea' : 'input'); if (q.type === 'number') { inp.type = 'number'; inp.inputMode = 'decimal'; }
    inp.value = a[q.var] ?? ''; inp.oninput = () => { a[q.var] = inp.value; persist(); }; div.append(label, inp); $('answerArea').appendChild(div);
  }
}

function updateNav() { $('prevBtn').disabled = state.index === 0; }
async function persist() { if (!state.interview) return; state.interview.updatedAt = Date.now(); state.interview.syncStatus = 'pending'; await putInterview(state.interview); }

function speak(text) {
  if (!('speechSynthesis' in window)) { $('voiceStatus').textContent = 'Síntese de voz não disponível.'; return; }
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; u.rate = .95; speechSynthesis.speak(u);
}

function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return null;
  const r = new SR(); r.lang = 'pt-BR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  r.onstart = () => $('voiceStatus').textContent = '🎤 Ouvindo… fale a resposta.';
  r.onresult = e => { let text = ''; for (const res of e.results) text += res[0].transcript; $('heard').textContent = 'Transcrição: ' + text; applySpeech(text); };
  r.onerror = e => $('voiceStatus').textContent = 'Reconhecimento de voz: ' + e.error + '. Use a gravação de áudio se necessário.';
  r.onend = () => $('voiceStatus').textContent = 'Reconhecimento encerrado.';
  return r;
}

function applySpeech(text) {
  const q = current(); if (!q) return; const a = state.interview.answers;
  if (q.type === 'text' || q.type === 'number') {
    const el = $('answerArea').querySelector('textarea,input'); if (!el) return;
    el.value = q.type === 'number' ? ((text.match(/\d+(?:[,.]\d+)?/) || [''])[0].replace(',', '.')) : text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (q.type === 'single') {
    const n = text.toLowerCase(); let hit = q.options.find(o => n.includes(String(o.value)) || n.includes(o.label.toLowerCase()));
    if (!hit) hit = q.options.find(o => o.label.toLowerCase().split(/\W+/).filter(x => x.length > 3).some(w => n.includes(w)));
    if (hit) { const el = [...$('answerArea').querySelectorAll('input')].find(x => String(x.value) === String(hit.value)); if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } }
  } else if (q.type === 'multi') {
    const n = text.toLowerCase(); const els = [...$('answerArea').querySelectorAll('input')];
    els.forEach(el => { const o = q.options.find(x => String(x.value) === String(el.value)); if (o && (n.includes(String(o.value)) || n.includes(o.label.toLowerCase()))) el.checked = true; });
    els[0]?.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

async function toggleRecording() {
  if (!state.interview?.meta.audio_authorized) { $('audioState').textContent = 'A gravação de áudio não foi autorizada nesta entrevista.'; return; }
  if (state.recording) { state.mediaRecorder?.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { $('audioState').textContent = 'Gravação de áudio não disponível neste navegador.'; return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); state.chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    state.mediaRecorder = new MediaRecorder(stream, { mimeType: mime }); const q = current();
    state.mediaRecorder.ondataavailable = e => { if (e.data.size) state.chunks.push(e.data); };
    state.mediaRecorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); const blob = new Blob(state.chunks, { type: mime }); await putAudio({ id: uid(), interviewId: state.interview.id, questionId: q.id, createdAt: Date.now(), blob, mime }); state.recording = false; $('recordBtn').textContent = '⏺ Gravar áudio'; $('audioState').textContent = '✓ Áudio salvo localmente.'; };
    state.mediaRecorder.start(); state.recording = true; $('recordBtn').textContent = '⏹ Parar gravação'; $('audioState').textContent = '🔴 Gravando…';
  } catch (e) { $('audioState').textContent = 'Não foi possível acessar o microfone. Verifique a permissão do Chrome.'; }
}

async function finishInterview() {
  if (!state.interview) return;
  if (state.recording) state.mediaRecorder?.stop();
  state.interview.status = 'completed'; await persist();
  $('finishMeta').textContent = `${state.interview.meta.municipio || 'Sem município'} • ${state.interview.meta.cadeiaLabel || 'Sem cadeia'} • ${new Date(state.interview.updatedAt).toLocaleString('pt-BR')}`;
  $('finishSummary').innerHTML = `<div><b>Respostas preenchidas</b><br>${Object.keys(state.interview.answers || {}).length}</div><div><b>Armazenamento</b><br>Salvo no aparelho</div>`;
  hide('survey'); show('finish'); state.index = 0;
}

async function exportCurrentJson() { downloadBlob(new Blob([JSON.stringify(state.interview, null, 2)], { type: 'application/json' }), `${state.interview.meta.id_quest}.json`); }
async function exportCurrentCsv() { const rows = [['entrevista_id', 'codigo', 'variavel', 'resposta']]; for (const [k, v] of Object.entries(state.interview.answers || {})) rows.push([state.interview.id, state.interview.meta.id_quest, k, Array.isArray(v) ? v.join('|') : v]); downloadBlob(new Blob(['\ufeff' + rows.map(r => r.map(escapeCsv).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }), `${state.interview.meta.id_quest}.csv`); }
async function exportCurrentAudios() { const audios = await getAudios(state.interview.id); for (let i = 0; i < audios.length; i++) downloadBlob(audios[i].blob, `${state.interview.meta.id_quest}_${audios[i].questionId}_${i + 1}.webm`); }

async function syncPending() {
  const url = (await getSetting('syncUrl'))?.value;
  if (!url) { $('homeMsg').textContent = 'Configure a URL de sincronização em Configurações.'; return; }
  if (!navigator.onLine) { $('homeMsg').textContent = 'Sem internet. As entrevistas continuam armazenadas localmente.'; return; }
  const pending = (await listInterviews()).filter(x => x.syncStatus !== 'synced'); if (!pending.length) { $('homeMsg').textContent = 'Não há entrevistas pendentes.'; return; }
  let ok = 0;
  for (const it of pending) {
    try { const audios = await getAudios(it.id); const payload = { interview: it, audios: audios.map(a => ({ id: a.id, interviewId: a.interviewId, questionId: a.questionId, createdAt: a.createdAt, mime: a.mime })) }; const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error('HTTP ' + r.status); await markSynced(it.id); ok++; } catch (e) { break; }
  }
  $('homeMsg').textContent = `Sincronização: ${ok} de ${pending.length} entrevistas enviadas.`; await renderList();
}

async function init() {
  try {
    const response = await fetch('./data/questions.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar o questionário.');
    state.questions = await response.json();
  } catch (e) {
    $('homeMsg').textContent = 'Erro ao carregar as perguntas. Abra o aplicativo por HTTPS ou por um servidor local.';
    return;
  }

  $('data').value = new Date().toISOString().slice(0, 10);
  setNetwork(); await renderList();

  window.addEventListener('online', async () => { setNetwork(); await homeStats(); });
  window.addEventListener('offline', setNetwork);
  $('newInterview').onclick = startNewInterview;
  $('refreshList').onclick = renderList;
  $('openSettings').onclick = async () => { hide('home'); show('settings'); const s = await getSetting('syncUrl'); $('syncUrl').value = s?.value || ''; };
  $('backSettings').onclick = () => { hide('settings'); show('home'); renderList(); };
  $('saveSettings').onclick = async () => { await saveSetting('syncUrl', $('syncUrl').value.trim()); $('settingsMsg').textContent = 'Configuração salva neste aparelho.'; };
  document.querySelectorAll('.backHome').forEach(b => b.onclick = () => { hide('setup'); show('home'); renderList(); });
  $('gpsBtn').onclick = () => { if (!navigator.geolocation) { $('setupMsg').textContent = 'Geolocalização não disponível.'; return; } navigator.geolocation.getCurrentPosition(p => { $('gps').value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`; }, () => $('setupMsg').textContent = 'Não foi possível obter a localização.'); };
  $('consent').onchange = e => { if (e.target.value === '0') $('setupMsg').textContent = 'Sem consentimento, a aplicação deve ser encerrada.'; else $('setupMsg').textContent = ''; };
  $('startInterview').onclick = startInterview;
  $('saveBtn').onclick = async () => { await persist(); $('voiceStatus').textContent = '✓ Salvo neste aparelho.'; };
  $('prevBtn').onclick = () => { if (state.index > 0) { state.index--; renderQuestion(); } };
  $('nextBtn').onclick = async () => { await persist(); state.index++; renderQuestion(); };
  $('speakBtn').onclick = () => speak($('qtext').textContent);
  $('micBtn').onclick = () => { if (!state.recognition) state.recognition = setupRecognition(); if (!state.recognition) { $('voiceStatus').textContent = 'Este Chrome não disponibilizou reconhecimento de fala. Use a gravação de áudio.'; return; } try { state.recognition.start(); } catch (e) {} };
  $('recordBtn').onclick = toggleRecording;
  $('exportJson').onclick = exportCurrentJson; $('exportCsv').onclick = exportCurrentCsv; $('exportAudios').onclick = exportCurrentAudios;
  $('backHomeFinish').onclick = async () => { hide('finish'); show('home'); await renderList(); };
  $('exportAll').onclick = async () => { const data = await allData(); const audios = []; for (const a of data.audios) audios.push({ ...a, blob: await blobToBase64(a.blob) }); const backup = { format: 'sociobio-backup-v1', createdAt: new Date().toISOString(), interviews: data.interviews, audios }; downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `backup_sociobiodiversidade_${new Date().toISOString().slice(0, 10)}.json`); $('homeMsg').textContent = `Backup criado: ${data.interviews.length} entrevistas e ${audios.length} áudios.`; };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); if (payload.format !== 'sociobio-backup-v1') throw new Error('Formato inválido'); const audios = (payload.audios || []).map(a => ({ ...a, blob: base64ToBlob(a.blob, a.mime || 'audio/webm') })); await importData({ interviews: payload.interviews || [], audios }); $('homeMsg').textContent = `Backup restaurado: ${(payload.interviews || []).length} entrevistas.`; await renderList(); } catch (err) { $('homeMsg').textContent = 'Não foi possível restaurar o backup: ' + err.message; } e.target.value = ''; };
  $('exportAllCsv').onclick = async () => { const items = await listInterviews(); const rows = [['entrevista_id', 'codigo', 'data', 'entrevistador', 'municipio', 'comunidade', 'cadeia', 'status', 'sync_status', 'variavel', 'resposta']]; for (const it of items) for (const [k, v] of Object.entries(it.answers || {})) rows.push([it.id, it.meta.id_quest, it.meta.data, it.meta.entrevistador, it.meta.municipio, it.meta.comunidade, it.meta.cadeiaLabel, it.status, it.syncStatus, k, Array.isArray(v) ? v.join('|') : v]); downloadBlob(new Blob(['\ufeff' + rows.map(r => r.map(escapeCsv).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }), 'entrevistas_sociobiodiversidade.csv'); $('homeMsg').textContent = `CSV geral criado com ${items.length} entrevistas.`; };
  $('syncBtn').onclick = syncPending;
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
