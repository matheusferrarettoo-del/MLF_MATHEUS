// MLF BRASIL · Central Remota (Mini App do Telegram) — Central 3.1 (extensão 5.83.0+): + vídeos com erro e cópias de hoje
// Mesma página para todos os usuários do MLF_MATHEUS; o conteúdo é de cada um: chega pelo próprio robô do usuário.
// Os dados (casos do Atendente Duoke e devoluções da Shopee) chegam no próprio link, depois do "#",
// compactados pela extensão. Nada é buscado na internet e nada sai do celular para o site.
// Cada ação tocada aqui vai para o robô (Telegram.WebApp.sendData) e o resultado chega na conversa.
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => 'R$ ' + (+v || 0).toFixed(2).replace('.', ',');
  let D = null; // dados da extensão
  let atual = null; // { tipo: 'caso'|'dev', item }

  // ---------- enviar para o robô ----------
  function sendRaw(obj) {
    if (!tg || typeof tg.sendData !== 'function') { alert('Abra esta Central pelo botão "🖥️ Abrir Central MLF" do teclado do robô no Telegram.'); return; }
    const payload = JSON.stringify(Object.assign({ v: 1 }, obj));
    if (payload.length > 4096) { alert('Texto grande demais. Encurte e tente de novo.'); return; }
    const st = $('statusText'); if (st) st.textContent = 'Enviando solicitação…';
    tg.sendData(payload);
  }
  const send = (command) => { command = String(command || '').trim(); if (command) sendRaw({ command }); };
  function confirma(msg, fn) {
    if (tg && typeof tg.showConfirm === 'function') { try { return tg.showConfirm(msg, (ok) => { if (ok) fn(); }); } catch (e) { /* versão antiga */ } }
    if (window.confirm(msg)) fn();
  }
  const haptic = () => { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred('light'); } catch (e) { /* opcional */ } };

  // ---------- dados no link ----------
  async function lerDados() {
    const m = /[#&]d=([^&]+)/.exec(location.hash || '');
    if (!m) return null;
    const tipo = m[1][0];
    let s = decodeURIComponent(m[1].slice(1)).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    let txt;
    if (tipo === 'z') {
      if (typeof DecompressionStream === 'undefined') throw new Error('Atualize o aplicativo do Telegram para ver os casos aqui.');
      txt = await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    } else txt = new TextDecoder().decode(u8);
    return JSON.parse(txt);
  }

  // ---------- navegação ----------
  const views = ['vHome', 'vList', 'vDet'];
  let pilha = ['vHome'];
  function mostra(id, push = true) {
    views.forEach((v) => $(v).classList.toggle('on', v === id));
    if (push && pilha[pilha.length - 1] !== id) pilha.push(id);
    window.scrollTo(0, 0);
    if (tg && tg.BackButton) { if (id === 'vHome') tg.BackButton.hide(); else tg.BackButton.show(); }
  }
  function voltar() { pilha.pop(); mostra(pilha[pilha.length - 1] || 'vHome', false); }

  // ---------- início ----------
  function resumo() {
    const casos = (D && D.casos) || [], dev = (D && D.dev) || [];
    $('nCasos').textContent = D ? casos.length : '–';
    $('nDev').textContent = D ? dev.length : '–';
    const hoje = casos.filter((c) => c.hj).length;
    $('sCasos').textContent = D ? (casos.length ? `${hoje} de hoje · Atendente Duoke` : 'Nenhum caso aberto') : 'Atendente Duoke';
    const urg = dev.filter((d) => d.pz && d.pz - Date.now() < 48 * 36e5).length;
    $('sDev').textContent = D ? (D.devErr && !dev.length ? 'Não consegui ler: ' + D.devErr.slice(0, 40) : dev.length ? `${urg ? urg + ' vence(m) em 48 h · ' : ''}${money(dev.reduce((t, d) => t + d.rv, 0))}` : 'Nada esperando você') : 'Shopee';
    $('tCasos').classList.toggle('hot', !!casos.length); $('tCasos').classList.toggle('zero', D && !casos.length);
    $('tDev').classList.toggle('hot', !!dev.length); $('tDev').classList.toggle('zero', D && !dev.length);
    const vid = (D && D.vid) || [], cop = (D && D.cop) || [];
    const copOk = cop.filter((x) => x.ok), copErr = cop.filter((x) => !x.ok);
    $('nVid').textContent = D ? vid.length : '–';
    $('sVid').textContent = D ? (vid.length ? `${vid.filter((v) => /resolu/i.test(v.d)).length} por resolução · Shopee` : 'Nenhum vídeo com erro') : 'Shopee · envio de vídeos';
    $('nCop').textContent = D ? copOk.length : '–';
    $('sCop').textContent = D ? `${copOk.filter((x) => x.o === 'ml').length} no ML · ${copOk.filter((x) => x.o === 'sp').length} na Shopee${copErr.length ? ' · ' + copErr.length + ' com erro' : ''}` : 'Mercado Livre e Shopee';
    $('tVid').classList.toggle('hot', !!vid.length); $('tVid').classList.toggle('zero', D && !vid.length);
    $('tCop').classList.toggle('zero', D && !cop.length);
    $('updTxt').textContent = D ? `Atualizado às ${new Date(D.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} de ${new Date(D.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}${D.cut ? ' · lista resumida' : ''}` : 'Sem dados: toque em Atualizar dados.';
  }

  // ---------- listas ----------
  function lista(tipo) {
    const casos = (D && D.casos) || [], dev = (D && D.dev) || [];
    if (tipo === 'casos') {
      $('lEye').textContent = 'ATENDENTE DUOKE'; $('lTitle').textContent = 'Casos para você';
      $('lBody').innerHTML = casos.length ? casos.map((c, i) => `<button class="item" data-caso="${i}"><div class="t"><span>${esc(c.cl)}</span><span style="font-weight:600;font-size:10px;color:#8ea6b8">${esc(c.dt)}</span></div><div class="s">${c.hj ? '<span class="tag w">HOJE</span>' : ''}${c.ra ? '<span class="tag g">RASCUNHO PRONTO</span>' : ''}🏪 ${esc(c.lj)}</div><div class="m">⚠️ ${esc(c.mo)}</div></button>`).join('') : '<div class="empty">✅ Nenhum caso do Atendente Duoke esperando você.</div>';
    } else if (tipo === 'vid') {
      const vid = (D && D.vid) || [];
      $('lEye').textContent = 'SHOPEE · VÍDEOS'; $('lTitle').textContent = 'Vídeos com erro';
      $('lBody').innerHTML = vid.length ? vid.map((v, i) => `<button class="item" data-vid="${i}"><div class="t"><span>${esc(v.n || v.pid)}</span><span style="font-weight:600;font-size:10px;color:#8ea6b8">${v.at ? esc(new Date(v.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) : ''}</span></div><div class="s">${/resolu/i.test(v.d) ? '<span class="tag w">RESOLUÇÃO</span>' : v.st === 'invalido' ? '<span class="tag w">ARQUIVO</span>' : '<span class="tag r">ERRO</span>'}${v.sku ? 'SKU ' + esc(v.sku) : ''}${v.lj ? ' · ' + esc(v.lj) : ''}</div><div class="m">⚠️ ${esc(v.d)}</div></button>`).join('') : '<div class="empty">✅ Nenhum vídeo com erro.</div>';
    } else if (tipo === 'cop') {
      const cop = (D && D.cop) || [];
      $('lEye').textContent = 'HOJE'; $('lTitle').textContent = 'Cópias criadas hoje';
      $('lBody').innerHTML = cop.length ? cop.map((x, i) => `<button class="item" data-cop="${i}"><div class="t"><span>${esc(x.t || '(sem título)')}</span><span style="font-weight:600;font-size:10px;color:#8ea6b8">${esc(x.h || '')}</span></div><div class="s"><span class="tag ${x.o === 'ml' ? '' : 'g'}">${x.o === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'}</span>${x.ok ? '' : '<span class="tag r">ERRO</span>'}${x.lj ? esc(x.lj) + ' · ' : ''}${x.p ? money(x.p) + ' · ' : ''}${x.para ? 'cópia ' + esc(x.para) : ''}</div>${x.er ? `<div class="m">⚠️ ${esc(x.er)}</div>` : x.de ? `<div class="m">original ${esc(x.de)}${x.para ? ' · toque para abrir a cópia' : ''}</div>` : ''}</button>`).join('') : '<div class="empty">Nenhuma cópia criada hoje.</div>';
    } else {
      $('lEye').textContent = 'SHOPEE'; $('lTitle').textContent = 'Devoluções e reembolsos';
      $('lBody').innerHTML = dev.length ? dev.map((d, i) => { const h = d.pz ? Math.round((d.pz - Date.now()) / 36e5) : null; return `<button class="item" data-dev="${i}"><div class="t"><span>${esc(d.co || d.pe)}</span><span>${money(d.rv)}</span></div><div class="s">${h != null ? `<span class="tag ${h < 48 ? 'r' : ''}">${h <= 0 ? 'VENCIDO' : h < 48 ? 'VENCE EM ' + h + ' H' : 'PRAZO ' + Math.round(h / 24) + ' DIAS'}</span>` : ''}${d.sr ? '<span class="tag w">SEM DEVOLVER</span>' : ''}${d.pp ? '<span class="tag g">PROPOSTA</span>' : ''}pedido ${esc(d.pe)}</div><div class="m">❓ ${esc(d.mo)}${d.tx ? ' — "' + esc(d.tx) + '"' : ''}</div></button>`; }).join('') : `<div class="empty">${D && D.devErr ? '⚠️ ' + esc(D.devErr) : '✅ Nenhuma devolução esperando a sua ação.'}</div>`;
    }
    mostra('vList');
  }

  // ---------- caso do Duoke ----------
  const QUEM = { c: '👤 Cliente', l: '🏪 Loja', a: '🤖 Automática' };
  function caso(c) {
    atual = { tipo: 'caso', item: c };
    const prods = (c.pr || []).map((p) => `<p>• ${esc(p[0] || '(produto)')}${p[1] ? ' — ' + esc(p[1]) : ''}${p[2] ? ' — SKU ' + esc(p[2]) : ''}${p[3] ? ' — x' + esc(p[3]) : ''}${p[4] ? ' <span style="color:#8ea6b8">(pedido ' + esc(p[4]) + ')</span>' : ''}</p>`).join('') || '<p>Nenhum pedido apareceu no painel do Duoke.</p>';
    const conv = (c.cv || []).map((m) => `<div class="bub ${m[0]}"><small>${QUEM[m[0]] || ''}${m[1] ? ' · ' + esc(m[1]) : ''}</small>${esc(m[2])}</div>`).join('') || (c.um ? `<div class="bub c"><small>👤 Cliente</small>${esc(c.um)}</div>` : '<p>Sem mensagens.</p>');
    const at = c.at ? `<p>${c.at[0] ? '✉️ O Atendente respondeu (enviado):' : '✉️ O Atendente sugeriu, mas NÃO enviou:'}</p><div class="bub l">${esc(c.at[1])}</div>` : '<p>✉️ O Atendente ainda não respondeu este cliente.</p>';
    const rasc = c.ra ? `<div class="card" style="border-color:#1f9d6b"><h3>RASCUNHO PRONTO</h3><div class="bub l">${esc(c.ra)}</div>
      <div class="acts" style="margin:10px 0 0"><button class="btn ok" data-a="enviar">✅ Enviar este rascunho ao cliente</button>
      <textarea class="f" id="fAjuste" placeholder="O que mudar? Ex.: mais curta, sem prometer prazo"></textarea>
      <div class="row2"><button class="btn s" data-a="ajuste">✍️ Ajustar com a IA</button><button class="btn s" data-a="cancelar">✖️ Descartar</button></div></div></div>` : '';
    $('dBody').innerHTML = `
      <div class="card"><h3>CASO · ATENDENTE DUOKE</h3><div class="big">${esc(c.cl)}</div><p>🏪 ${esc(c.lj)}${c.dt ? ' · ' + esc(c.dt) : ''}</p><p>⚠️ <b>Por que veio para você:</b> ${esc(c.mo)}</p></div>
      <div class="card"><h3>PEDIDO</h3>${prods}</div>
      <div class="card"><h3>CONVERSA</h3>${conv}</div>
      <div class="card"><h3>RESPOSTA DO ATENDENTE</h3>${at}</div>
      ${rasc}
      <div class="card"><h3>COMO RESOLVER?</h3>
        <textarea class="f" id="fComo" maxlength="1200" placeholder="Ex.: pede desculpa e diz que vamos reenviar a peça em até 5 dias úteis"></textarea>
        <p class="hint2">"IA escreve" monta a mensagem com a sua orientação e manda o rascunho no chat para você conferir. "Enviar exatamente" manda o seu texto direto ao cliente (até 600 caracteres).</p>
        <div class="acts" style="margin:6px 0 0">
          <div class="row2"><button class="btn" data-a="como">🤖 IA escreve com isso</button><button class="btn w" data-a="texto">📨 Enviar exatamente</button></div>
          <button class="btn s" data-a="sug">💡 Sugira uma resposta (sem orientação)</button>
          <button class="btn s" data-a="ok">✔️ Já resolvi (tirar da lista)</button>
        </div></div>`;
    mostra('vDet');
  }
  function acaoCaso(a) {
    const c = atual.item, code = c.c;
    if (a === 'sug') return confirma(`Pedir uma sugestão de resposta para ${c.cl}? O rascunho chega no chat.`, () => sendRaw({ action: 'caso', op: 'sug', code }));
    if (a === 'como') { const t = ($('fComo').value || '').trim(); if (!t) return alert('Escreva como devo resolver.'); return sendRaw({ action: 'caso', op: 'como', code, texto: t }); }
    if (a === 'texto') { const t = ($('fComo').value || '').trim(); if (!t) return alert('Escreva a mensagem para o cliente.'); if (t.length > 600) return alert(`A mensagem tem ${t.length} caracteres. O limite do chat é 600.`); return confirma(`Enviar EXATAMENTE este texto para ${c.cl} pelo Duoke?\n\n"${t.slice(0, 300)}${t.length > 300 ? '…' : ''}"`, () => sendRaw({ action: 'caso', op: 'texto', code, texto: t })); }
    if (a === 'ok') return confirma(`Marcar o caso de ${c.cl} como resolvido e tirar da lista?`, () => sendRaw({ action: 'caso', op: 'ok', code }));
    if (a === 'enviar') return confirma(`Enviar o rascunho para ${c.cl} pelo Duoke?`, () => sendRaw({ action: 'caso', op: 'enviar', code }));
    if (a === 'ajuste') { const t = ($('fAjuste').value || '').trim(); if (!t) return alert('Escreva o que mudar.'); return sendRaw({ action: 'caso', op: 'ajuste', code, texto: t }); }
    if (a === 'cancelar') return confirma('Descartar o rascunho?', () => sendRaw({ action: 'caso', op: 'cancelar', code }));
  }

  // ---------- devolução ----------
  const NOME = { ac: '✅ Aceitar o reembolso', pa: '💸 Reembolso parcial', di: '⚖️ Disputar (contestar)', ag: '📦 Aguardar a devolução', ap: '🤝 Aceitar a proposta do comprador', dd: '↩️ Desistir da disputa', de: '⏭️ Deixar para depois' };
  function dev(d) {
    atual = { tipo: 'dev', item: d };
    const h = d.pz ? Math.round((d.pz - Date.now()) / 36e5) : null;
    const prazo = d.pz ? `${new Date(d.pz).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} (${h <= 0 ? 'VENCIDO' : h < 48 ? 'em ' + h + ' h' : 'em ' + Math.round(h / 24) + ' dias'})` : '';
    const itens = (d.it || []).map((x) => `<p>• ${esc(x[0])} × ${esc(x[1])}${x[2] ? ' — SKU ' + esc(x[2]) : ''}</p>`).join('') || '<p>—</p>';
    const dk = d.dk ? `<p style="color:#8ea6b8">${esc(d.dk.f)}${d.dk.ca ? ' · há caso aberto no Duoke' : ''}</p>${d.dk.m.map((m) => `<div class="bub c"><small>👤 ${esc(m[0])}</small>${esc(m[1])}</div>`).join('')}${d.dk.rl ? `<div class="bub l"><small>🏪 Última resposta da loja</small>${esc(d.dk.rl)}</div>` : ''}` : '<p>Nenhuma mensagem deste cliente no Atendente Duoke.</p>';
    const btns = (d.ac || []).map((a) => a === 'pa' ? '' : `<button class="btn ${a === 'ac' || a === 'ap' ? 'ok' : a === 'di' || a === 'dd' ? 'w' : 's'}" data-a="${a}">${NOME[a]}</button>`).join('');
    const parcial = (d.ac || []).includes('pa') ? `<div class="card"><h3>REEMBOLSO PARCIAL</h3><input class="f" id="fValor" inputmode="decimal" placeholder="Valor em R$ (menor que ${money(d.rv)})"><p class="hint2">O comprador fica com o produto e pode aceitar ou recusar a oferta.</p><button class="btn" data-a="pa" style="width:100%">💸 Oferecer reembolso parcial</button></div>` : '';
    $('dBody').innerHTML = `
      <div class="card"><h3>DEVOLUÇÃO · SHOPEE</h3><div class="big">${money(d.rv)}</div><p>📄 ${esc(d.sn)} · pedido ${esc(d.pe)}${d.co ? ' · 👤 ' + esc(d.co) : ''}</p>
        ${d.sr ? '<p><span class="tag w">SEM DEVOLVER O PRODUTO</span> o comprador quer o reembolso sem mandar o produto de volta</p>' : ''}${d.pc ? '<p><span class="tag">DEVOLUÇÃO PARCIAL</span></p>' : ''}
        ${d.cu != null ? `<p>📉 Se aceitar sem o produto voltar, você perde a Entrada: <b>${money(d.cu)}</b></p>` : ''}</div>
      <div class="card"><h3>ITENS</h3>${itens}</div>
      <div class="card"><h3>MOTIVO</h3><p>${esc(d.mo)}</p>${d.tx ? `<div class="bub c"><small>👤 Comprador</small>${esc(d.tx)}</div>` : ''}</div>
      <div class="card"><h3>SITUAÇÃO</h3><p>📍 ${esc(d.stt)}</p>${prazo ? `<p>⏰ Prazo para responder: <b>${esc(prazo)}</b></p>` : ''}${(d.pd || []).map((p) => `<p>⚠️ ${esc(p)}</p>`).join('')}${d.pp ? '<p>🤝 O comprador fez uma proposta e está esperando a sua resposta.</p>' : ''}</div>
      <div class="card"><h3>MENSAGENS NO DUOKE</h3>${dk}</div>
      ${parcial}
      <div class="acts">${btns}</div>`;
    mostra('vDet');
  }
  function acaoDev(a) {
    const d = atual.item, code = d.c;
    if (a === 'ac') return confirma(`Aceitar o reembolso de ${money(d.rv)} da devolução ${d.sn} (pedido ${d.pe})?${d.sr ? '\n\nATENÇÃO: o comprador NÃO vai devolver o produto.' : ''}\n\nIsso é feito na Shopee agora.`, () => sendRaw({ action: 'dev', op: 'ac', code }));
    if (a === 'pa') {
      const v = +String(($('fValor') || {}).value || '').replace(/[^\d,\.]/g, '').replace(',', '.');
      if (!(v > 0)) return alert('Informe o valor do reembolso parcial.');
      if (v >= d.rv) return alert(`O parcial precisa ser menor que ${money(d.rv)}. Para o valor inteiro, use "Aceitar o reembolso".`);
      return confirma(`Oferecer ${money(v)} de reembolso parcial na devolução ${d.sn}? O comprador fica com o produto e pode aceitar ou recusar.`, () => sendRaw({ action: 'dev', op: 'pa', code, valor: String(v) }));
    }
    if (a === 'di') return confirma(`Contestar a devolução ${d.sn}? A Shopee decide. O motivo (e o e-mail, se faltar) são escolhidos no chat, com confirmação.`, () => sendRaw({ action: 'dev', op: 'di', code }));
    if (a === 'ag') return confirma(`Aguardar a devolução do produto (${d.sn})? Ela sai da lista até a situação mudar.`, () => sendRaw({ action: 'dev', op: 'ag', code }));
    if (a === 'ap') return confirma(`Aceitar a proposta do comprador na devolução ${d.sn}? Isso é feito na Shopee agora.`, () => sendRaw({ action: 'dev', op: 'ap', code }));
    if (a === 'dd') return confirma(`Desistir da disputa da devolução ${d.sn}? Isso é feito na Shopee agora.`, () => sendRaw({ action: 'dev', op: 'dd', code }));
    if (a === 'de') return sendRaw({ action: 'dev', op: 'de', code });
  }

  // ---------- vídeo com erro ----------
  function video(v) {
    atual = { tipo: 'vid', item: v };
    const res = /resolu/i.test(v.d);
    $('dBody').innerHTML = `
      <div class="card"><h3>VÍDEO COM ERRO · SHOPEE</h3><div class="big" style="font-size:16px">${esc(v.n || v.pid)}</div><p>🆔 anúncio ${esc(v.pid)}${v.sku ? ' · SKU ' + esc(v.sku) : ''}${v.lj ? ' · ' + esc(v.lj) : ''}</p><p>🎞️ ${esc(v.f || '')}</p></div>
      <div class="card"><h3>O QUE ACONTECEU</h3><p>⚠️ ${esc(v.d)}</p>${res ? '<p>💡 A Shopee aceita no máximo 1280 × 1280. Um vídeo 1080 × 1920 (vertical Full HD) precisa ser exportado em 720 × 1280. Troque o arquivo na pasta de vídeos e rode a busca de vídeos de novo.</p>' : ''}${v.st === 'invalido' ? '<p>💡 O arquivo está fora das regras da Shopee: troque o arquivo na pasta de vídeos.</p>' : ''}</div>
      <div class="acts">${v.st === 'erro' ? '<button class="btn" data-a="vr">🔁 Tentar de novo</button>' : ''}<button class="btn s" data-a="vi">🚫 Ignorar este vídeo</button></div>`;
    mostra('vDet');
  }
  function acaoVid(a) {
    const v = atual.item;
    if (a === 'vr') return confirma(`Colocar o vídeo de "${v.n}" de volta na fila de envio?`, () => sendRaw({ action: 'vid', op: 'vr', key: v.k, s: v.s }));
    if (a === 'vi') return confirma(`Ignorar o vídeo de "${v.n}"? Ele sai da lista e não é enviado.`, () => sendRaw({ action: 'vid', op: 'vi', key: v.k, s: v.s }));
  }
  function abrirCopia(x) {
    if (!x.para) return;
    const url = x.o === 'ml' ? 'https://produto.mercadolivre.com.br/' + String(x.para).replace(/^([A-Z]{3})(\d+)$/, '$1-$2') : `https://shopee.com.br/product/${encodeURIComponent(x.s || '')}/${encodeURIComponent(x.para)}`;
    if (tg && typeof tg.openLink === 'function') tg.openLink(url); else window.open(url, '_blank');
  }

  // ---------- eventos ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, [data-command]'); if (!el) return;
    if (el.dataset.command) { haptic(); return send(el.dataset.command); }
    if (el.dataset.go) { haptic(); return lista(el.dataset.go); }
    if (el.dataset.back != null) return voltar();
    if (el.dataset.caso != null) return caso(D.casos[+el.dataset.caso]);
    if (el.dataset.dev != null) return dev(D.dev[+el.dataset.dev]);
    if (el.dataset.vid != null) return video(D.vid[+el.dataset.vid]);
    if (el.dataset.cop != null) return abrirCopia(D.cop[+el.dataset.cop]);
    if (el.dataset.a && atual) { haptic(); return atual.tipo === 'caso' ? acaoCaso(el.dataset.a) : atual.tipo === 'vid' ? acaoVid(el.dataset.a) : acaoDev(el.dataset.a); }
    if (el.id === 'btnRefresh') return sendRaw({ action: 'refresh' });
  });
  $('commandForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('command').value.trim(); if (v) send(v); });

  if (tg) {
    tg.ready(); tg.expand();
    try { tg.setHeaderColor('#0b1c2d'); tg.setBackgroundColor('#071522'); } catch (e) { /* opcional */ }
    const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u && u.first_name) $('firstName').textContent = ' ' + u.first_name;
    if (tg.MainButton) tg.MainButton.hide();
    if (tg.BackButton) tg.BackButton.onClick(voltar);
  }
  $('today').textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  lerDados().then((d) => { D = d; resumo(); }).catch((e) => { D = null; resumo(); $('updTxt').textContent = '⚠️ ' + e.message; });
})();
