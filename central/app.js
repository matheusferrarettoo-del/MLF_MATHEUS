// MLF BRASIL · Central Remota (Mini App do Telegram) — Central 3.4: + 10 últimos pedidos pendentes da Shopee e as etiquetas (extensão 5.86.0+).
// Central 3.3: + Meus anúncios lidos do Firebase do usuário (extensão 5.85.0+).
// Central 3.2 (extensão 5.84.0+): + aprovações (atendimento, preço,
// campanhas e anúncios), plano de ação do gerente, notificações importantes e resumo diário. Central 3.1: vídeos e cópias.
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

  const RECENTE = 20 * 36e5;
  function pendPlano() {
    const pl = (D && D.pl) || {};
    return (pl.spN || 0) + (pl.est || []).reduce((t, c) => t + (c.t || []).filter((x) => x.m === 'aprovar' && !(x.u && Date.now() - x.u.at < RECENTE)).length, 0);
  }
  const quando = (t) => (t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
  const it = (attr, titulo, dir, sub, msg) => `<button class="item" ${attr}><div class="t"><span>${esc(titulo)}</span><span style="font-weight:600;font-size:10px;color:#8ea6b8">${esc(dir || '')}</span></div>${sub ? `<div class="s">${sub}</div>` : ''}${msg ? `<div class="m">${esc(msg)}</div>` : ''}</button>`;
  const sec = (t) => `<div class="sec">${esc(t)}</div>`;
  const vazio = (t) => `<div class="empty">${t}</div>`;
  const velha = () => vazio('Atualize a extensão MLF BRASIL para a versão 5.84.0 ou mais nova e toque em "Atualizar dados".');

  // ---------- início ----------
  function resumo() {
    const casos = (D && D.casos) || [], dev = (D && D.dev) || [];
    $('nDev').textContent = D ? dev.length : '–';
    const hoje = casos.filter((c) => c.hj).length;
    const urg = dev.filter((d) => d.pz && d.pz - Date.now() < 48 * 36e5).length;
    $('sDev').textContent = D ? (D.devErr && !dev.length ? 'Não consegui ler: ' + D.devErr.slice(0, 40) : dev.length ? `${urg ? urg + ' vence(m) em 48 h · ' : ''}${money(dev.reduce((t, d) => t + d.rv, 0))}` : 'Nada esperando você') : 'Shopee';
    $('tDev').classList.toggle('hot', !!dev.length); $('tDev').classList.toggle('zero', D && !dev.length);
    const vid = (D && D.vid) || [], cop = (D && D.cop) || [];
    const copOk = cop.filter((x) => x.ok), copErr = cop.filter((x) => !x.ok);
    $('nVid').textContent = D ? vid.length : '–';
    $('sVid').textContent = D ? (vid.length ? `${vid.filter((v) => /resolu/i.test(v.d)).length} por resolução · Shopee` : 'Nenhum vídeo com erro') : 'Shopee · envio de vídeos';
    $('nCop').textContent = D ? copOk.length : '–';
    $('sCop').textContent = D ? `${copOk.filter((x) => x.o === 'ml').length} no ML · ${copOk.filter((x) => x.o === 'sp').length} na Shopee${copErr.length ? ' · ' + copErr.length + ' com erro' : ''}` : 'Mercado Livre e Shopee';
    $('tVid').classList.toggle('hot', !!vid.length); $('tVid').classList.toggle('zero', D && !vid.length);
    $('tCop').classList.toggle('zero', D && !cop.length);
    // v3.2
    const novo = !!(D && D.v >= 2);
    const setT = (id, n, sub, hot) => { $('n' + id).textContent = D ? (novo || id === 'Atd' ? n : '–') : '–'; $('s' + id).textContent = D && !novo && id !== 'Atd' ? 'Atualize a extensão (5.84.0+)' : sub; $('t' + id).classList.toggle('hot', !!(novo && hot && n)); $('t' + id).classList.toggle('zero', !!(D && novo && !n)); };
    const a = (D && D.atd) || {}, pr = (D && D.pre) || {}, cm = (D && D.cam) || {}, pl = (D && D.pl) || {};
    const nAtd = casos.length + (a.duv || []).length + (a.revN || 0) + (a.mlN || 0);
    setT('Atd', nAtd, D ? [casos.length && casos.length + ' caso(s)', (a.duv || []).length && a.duv.length + ' dúvida(s)', a.revN && a.revN + ' avaliação(ões)', a.mlN && a.mlN + ' no ML'].filter(Boolean).join(' · ') || 'Nada esperando você' : 'Duoke, avaliações e Mercado Livre', true);
    const nPre = (pr.cmd || []).length + (pr.mlp ? pr.mlp.n : 0);
    setT('Pre', nPre, nPre ? [(pr.cmd || []).length && pr.cmd.length + ' comando(s)', pr.mlp && pr.mlp.n + ' no ML'].filter(Boolean).join(' · ') : 'Nada aguardando', true);
    const nCam = (cm.cmd || []).length + (cm.lot || []).length + (cm.titN || 0);
    setT('Cam', nCam, nCam ? [(cm.cmd || []).length && cm.cmd.length + ' comando(s)', (cm.lot || []).length && cm.lot.length + ' lote(s)', cm.titN && cm.titN + ' título(s)'].filter(Boolean).join(' · ') : 'Nada aguardando', true);
    const pend = pendPlano();
    setT('Pl', pend, pend ? `${pend} para aprovar · ${(pl.est || []).length} conta(s)` : (pl.est || []).length ? `${(pl.est || []).length} conta(s) · nada para aprovar` : 'Sem plano ainda', true);
    const nt = (D && D.nt) || [], urgN = nt.filter((t) => t.l <= 1).length;
    setT('Nt', nt.length, nt.length ? (urgN ? urgN + ' urgente(s) · ' : '') + nt.length + ' aviso(s)' : 'Nenhum aviso', urgN > 0);
    const pd = D && D.ped, pdl = (pd && pd.l) || [];
    $('nPed').textContent = D && D.v >= 2 && pd ? pdl.length : '–';
    $('sPed').textContent = !D ? 'Shopee · etiquetas para imprimir' : !pd ? (D.v >= 2 ? 'Atualize a extensão (5.86.0+)' : 'Atualize a extensão (5.86.0+)') : pd.erro ? '⚠️ ' + pd.erro.slice(0, 40) : pdl.length ? `${pdl.filter((x) => x.st === 'p' && !x.et).length} etiqueta(s) por imprimir · ${pd.total} pendente(s)` : 'Nenhum pedido pendente';
    $('tPed').classList.toggle('hot', pdl.some((x) => x.st === 'p' && !x.et)); $('tPed').classList.toggle('zero', !!(pd && !pdl.length));
    const rs = D && D.rs;
    $('sRs').textContent = !D ? 'vendas, Ads e rotina' : !novo ? 'Atualize a extensão (5.84.0+)' : rs ? [rs.ml ? 'ML ' + rs.ml.v + ' venda(s)' : '', rs.sp ? 'Shopee ' + rs.sp.o + ' pedido(s)' : ''].filter(Boolean).join(' · ') || 'toque para ver' : 'sem leitura agora';
    $('updTxt').textContent = D ? `Atualizado às ${new Date(D.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} de ${new Date(D.at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}${D.cut ? ' · lista resumida' : ''}` : 'Sem dados: toque em Atualizar dados.';
  }

  // ---------- listas ----------
  function lista(tipo) {
    const casos = (D && D.casos) || [], dev = (D && D.dev) || [];
    const novo = !!(D && D.v >= 2);
    if (tipo === 'atd') {
      const a = (D && D.atd) || {};
      $('lEye').textContent = '1 · ATENDIMENTO'; $('lTitle').textContent = 'Aguardando sua aprovação';
      let h = '';
      if (casos.length) h += sec('CASOS DO ATENDENTE DUOKE') + casos.map((c, i) => it(`data-caso="${i}"`, c.cl, c.dt, `${c.hj ? '<span class="tag w">HOJE</span>' : ''}${c.ra ? '<span class="tag g">RASCUNHO PRONTO</span>' : ''}🏪 ${esc(c.lj)}`, '⚠️ ' + c.mo)).join('');
      if ((a.duv || []).length) h += sec('DÚVIDAS DO ATENDENTE (ELE PRECISA DA SUA RESPOSTA)') + a.duv.map((x, i) => it(`data-duv="${i}"`, x.q, x.n > 1 ? x.n + ' conversas' : '', `${x.lj ? '🏪 ' + esc(x.lj) : ''}${x.pr ? ' · ' + esc(x.pr) : ''}`, x.ex ? '👤 "' + x.ex + '"' : '')).join('');
      if ((a.rev || []).length) h += sec(`RESPOSTAS DE AVALIAÇÕES · SHOPEE${a.revN > a.rev.length ? ` (${a.rev.length} de ${a.revN})` : ''}`) + a.rev.map((x, i) => it(`data-rev="${i}"`, x.p || 'Avaliação', '★'.repeat(x.e || 0), `${x.st === 'revisar' ? '<span class="tag w">REVISAR</span>' : '<span class="tag g">RESPOSTA PRONTA</span>'}${esc(x.lj)}`, x.c ? '👤 "' + x.c + '"' : '(sem comentário)')).join('');
      if ((a.ml || []).length) h += sec(`MERCADO LIVRE · O ROBÔ DEIXOU PARA VOCÊ${a.mlN > a.ml.length ? ` (${a.ml.length} de ${a.mlN})` : ''}`) + a.ml.map((x) => it('data-info="ml"', x.tp === 'q' ? 'Pergunta ' + x.id : 'Conversa ' + x.id, quando(x.at), '<span class="tag">RESPONDA NO MERCADO LIVRE</span>', x.r)).join('');
      $('lBody').innerHTML = h || (D && !novo && !casos.length ? velha() : vazio('✅ Nenhum atendimento esperando a sua aprovação.'));
      return mostra('vList');
    }
    if (tipo === 'pre' || tipo === 'cam') {
      const o = (D && D[tipo]) || {};
      $('lEye').textContent = tipo === 'pre' ? '2 · PREÇOS' : '3 · CAMPANHAS E ANÚNCIOS'; $('lTitle').textContent = 'Aguardando aprovação';
      let h = '';
      if ((o.cmd || []).length) h += sec('COMANDOS DO GERENTE') + o.cmd.map((x, i) => it(`data-cmd="${tipo}:${i}"`, '"' + x.tx + '"', quando(x.at), `${x.rf ? '<span class="tag w">SÓ NO COMPUTADOR</span>' : ''}${x.it ? x.it + ' anúncio(s)' : ''}${x.ob ? ' · ' + esc(x.ob) : ''}`, x.d)).join('');
      if (tipo === 'pre' && o.mlp) h += sec('MERCADO LIVRE · ANÁLISE DIÁRIA DE PREÇOS') + it('data-mlp="1"', `${o.mlp.n} ajuste(s) recomendados`, quando(o.mlp.at), o.mlp.ok ? '<span class="tag g">PRESERVA A ENTRADA</span>' : '<span class="tag r">CATÁLOGO DESATUALIZADO</span>', o.mlp.it.slice(0, 3).map((x) => `${x.t}: ${money(x.de)} → ${money(x.para)}`).join(' · '));
      if (tipo === 'cam') {
        if ((o.lot || []).length) h += sec('PULVERIZAÇÃO · LOTES DE ANÚNCIOS NOVOS') + o.lot.map((x, i) => it(`data-lot="${i}"`, `${x.n} anúncio(s) novo(s)`, x.j != null ? x.j + 'h' : '', `<span class="tag ${x.lj === 'ml' ? '' : 'g'}">${x.lj === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'}</span>`, (x.it || []).slice(0, 3).join(' · '))).join('');
        if ((o.tit || []).length) h += sec(`TÍTULOS E DESCRIÇÕES · SHOPEE${o.titN > o.tit.length ? ` (${o.tit.length} de ${o.titN})` : ''}`) + o.tit.map((x, i) => it(`data-tit="${i}"`, x.de || 'Anúncio', quando(x.at), `${x.ok ? '' : '<span class="tag w">REVISAR NO COMPUTADOR</span>'}${x.para ? 'título novo' : ''}${x.para && x.ds ? ' + ' : ''}${x.ds ? 'descrição nova' : ''}${x.lj ? ' · ' + esc(x.lj) : ''}`, x.para ? '→ ' + x.para : '')).join('');
      }
      $('lBody').innerHTML = h || (D && !novo ? velha() : vazio('✅ Nada aguardando a sua aprovação.'));
      return mostra('vList');
    }
    if (tipo === 'pl') {
      const pl = (D && D.pl) || {};
      $('lEye').textContent = '4 · GERENTE'; $('lTitle').textContent = 'Plano de ação';
      let h = '';
      (pl.est || []).forEach((c, ci) => {
        h += sec(`${c.lj === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'} · ${c.nm} · ${c.eg}`) + (c.ob ? `<p class="hint2">🎯 ${esc(c.ob)}${c.ex ? '' : ' · ⚠️ esta conta não está aberta neste computador'}</p>` : '');
        h += (c.t || []).map((t, ti) => { const feito = t.u && Date.now() - t.u.at < RECENTE; return it(`data-est="${ci}:${ti}"`, `${t.o}. ${t.t}`, t.p, `${t.m === 'auto' ? '<span class="tag g">AUTOMÁTICA</span>' : t.m === 'aprovar' ? '<span class="tag w">PRECISA DO SEU OK</span>' : '<span class="tag">VOCÊ FAZ</span>'}${feito ? `<span class="tag ${t.u.ok ? 'g' : 'r'}">${t.u.ok ? 'FEITA HOJE' : 'FALHOU'}</span>` : ''}${t.q ? t.q + ' anúncio(s)' : ''}`, t.r); }).join('');
      });
      if ((pl.sp || []).length) h += sec(`PLANO ESTRATÉGICO · SHOPEE${pl.spN > pl.sp.length ? ` (${pl.sp.length} de ${pl.spN})` : ''}`) + pl.sp.map((x, i) => it(`data-spt="${i}"`, x.t, x.sc ? x.sc + ' pts' : '', `${x.b ? '<span class="tag r">BLOQUEADA</span>' : '<span class="tag w">PLANEJADA</span>'}${esc(x.p)}${x.lj ? ' · ' + esc(x.lj) : ''}`, x.b || x.r)).join('');
      $('lBody').innerHTML = h || (D && !novo ? velha() : vazio('O gerente ainda não montou um plano. Defina o estágio das contas no computador (Gerente → Estágio da conta).'));
      return mostra('vList');
    }
    if (tipo === 'nt') {
      const nt = (D && D.nt) || [];
      const IC = ['🔴', '🟠', '🟡', '🔵', '📌'];
      $('lEye').textContent = '8 · AVISOS'; $('lTitle').textContent = 'Notificações importantes';
      $('lBody').innerHTML = nt.length ? nt.map((t) => it('data-info="nt"', `${IC[t.l] || '•'} ${t.lj}`, t.l <= 1 ? 'URGENTE' : '', '', t.t)).join('') : (D && !novo ? velha() : vazio('✅ Nenhum aviso importante agora.'));
      return mostra('vList');
    }
    if (tipo === 'rs') return resumoDia();
    if (tipo === 'anc') return anuncios();
    if (tipo === 'ped') {
      const pd = D && D.ped, l = (pd && pd.l) || [];
      $('lEye').textContent = 'SHOPEE · A ENVIAR'; $('lTitle').textContent = 'Últimos pedidos pendentes';
      const proc = l.filter((x) => x.st === 'p');
      $('lBody').innerHTML = !pd ? velha() : pd.erro && !l.length ? vazio('⚠️ ' + esc(pd.erro)) : !l.length ? vazio('✅ Nenhum pedido pendente na Shopee.')
        : (proc.length ? `<div class="acts" style="margin:0 0 6px"><button class="btn" data-a="pedtodas">🏷 Receber as ${proc.length} etiqueta(s) processada(s) num PDF</button></div>` : '')
          + l.map((x, i) => it(`data-ped="${i}"`, x.sn, quando(x.at), `${x.st === 'p' ? (x.et ? '<span class="tag g">ETIQUETA IMPRESSA</span>' : '<span class="tag w">ETIQUETA POR IMPRIMIR</span>') : '<span class="tag">ORGANIZAR ENVIO</span>'}${money(x.v)}${x.tr ? ' · ' + esc(x.tr) : ''}`, x.it.map(([k, q]) => `${k} x${q}`).join(' · ') || x.nm)).join('')
          + `<p class="hint2">Os ${l.length} pedidos mais recentes entre os ${pd.total} esperando envio. A etiqueta chega aqui no chat em PDF, cortada em 10 × 15 cm e com o SKU no rodapé.</p>`;
      atual = { tipo: 'pedl', item: proc };
      return mostra('vList');
    }
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

  // ---------- v3.2: detalhes das aprovações ----------
  const x2 = (op, key, s, texto) => sendRaw(Object.assign({ action: 'x', op, key: String(key), s: String(s || '') }, texto ? { texto } : {}));
  function det(tipo, item, html) { atual = { tipo, item }; $('dBody').innerHTML = html; mostra('vDet'); }
  function duvida(x) {
    det('duv', x, `<div class="card"><h3>DÚVIDA DO ATENDENTE DUOKE</h3><div class="big" style="font-size:16px">${esc(x.q)}</div><p>${x.lj ? '🏪 ' + esc(x.lj) : ''}${x.pr ? ' · ' + esc(x.pr) : ''}${x.n > 1 ? ' · apareceu em ' + x.n + ' conversas' : ''}</p>${x.ex ? `<div class="bub c"><small>👤 Cliente</small>${esc(x.ex)}</div>` : ''}</div>
      <div class="card"><h3>SUA RESPOSTA</h3><textarea class="f" id="fResp" maxlength="1200" placeholder="Ex.: sim, a peça vai montada; só encaixar as prateleiras"></textarea><p class="hint2">Fica salva no banco do Atendente e ele passa a usar nas próximas conversas.</p></div>
      <div class="acts"><button class="btn ok" data-a="dr">💾 Salvar resposta</button></div>`);
  }
  function avaliacao(x) {
    det('rev', x, `<div class="card"><h3>AVALIAÇÃO · SHOPEE</h3><div class="big" style="font-size:16px">${'★'.repeat(x.e || 0)}${'☆'.repeat(5 - (x.e || 0))}</div><p>📦 ${esc(x.p)}${x.lj ? ' · ' + esc(x.lj) : ''}</p><div class="bub c"><small>👤 Comprador</small>${esc(x.c || '(sem comentário)')}</div>${x.pb ? `<p>⚠️ ${esc(x.pb)}</p>` : ''}</div>
      <div class="card"><h3>RESPOSTA DA LOJA (PODE EDITAR)</h3><textarea class="f" id="fResp" maxlength="1000">${esc(x.t)}</textarea></div>
      <div class="acts"><button class="btn ok" data-a="ra">✅ Aprovar esta resposta</button><button class="btn s" data-a="rd">🗑️ Descartar</button></div>`);
  }
  function comando(tipo, x) {
    det('cmd', x, `<div class="card"><h3>COMANDO DO GERENTE</h3><div class="big" style="font-size:16px">"${esc(x.tx)}"</div><p>🎯 ${esc(x.ob)}${x.it ? ' · ' + x.it + ' anúncio(s) aptos' : ''}</p><p>🕒 ${esc(quando(x.at))} · vale por 12 h</p></div>
      <div class="card"><h3>O QUE VAI SER FEITO</h3>${String(x.d || '').split('\n').filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('') || '<p>Veja os detalhes no computador (Gerente → Comandos).</p>'}</div>
      <div class="acts">${x.rf ? `<p class="hint2">⚠️ Plano com ${esc(x.rf)}: por segurança, a aprovação é só no computador (Gerente → Comandos), com confirmação reforçada.</p>` : '<button class="btn ok" data-a="ca">🚀 Aprovar e executar</button>'}<button class="btn s" data-a="cc">✖️ Cancelar comando</button></div>`);
  }
  function precoMl(o) {
    det('mlp', o, `<div class="card"><h3>MERCADO LIVRE · PREÇOS</h3><div class="big">${o.n} ajuste(s)</div><p>Análise de ${esc(quando(o.at))}. Sempre com líquido igual ou maior que a Entrada do SKU; o frete não muda.</p>${o.ok ? '' : '<p>⚠️ O catálogo MLF Sistema está desatualizado: sincronize no computador antes de aplicar.</p>'}</div>
      <div class="card"><h3>ANÚNCIOS</h3>${o.it.map((x) => `<div class="kv"><span>${esc(x.t)}<br><small style="color:#8ea6b8">${esc(x.id)} · ${esc(x.a)}</small></span><b>${money(x.de)} → ${money(x.para)}</b></div>`).join('')}${o.n > o.it.length ? `<p class="hint2">… e mais ${o.n - o.it.length}.</p>` : ''}</div>
      <div class="acts">${o.ok ? `<button class="btn ok" data-a="mp">💲 Aplicar os ${o.n} ajuste(s)</button>` : ''}</div>`);
  }
  function lote(x) {
    det('lot', x, `<div class="card"><h3>PULVERIZAÇÃO · ${x.lj === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'}</h3><div class="big">${x.n} anúncio(s) novo(s)</div><p>Criados por duplicação, na fila que já existe. Janela das ${x.j}h.</p></div>
      <div class="card"><h3>PRODUTOS</h3>${(x.it || []).map((n) => `<p>• ${esc(n)}</p>`).join('')}${x.n > (x.it || []).length ? `<p class="hint2">… e mais ${x.n - x.it.length}.</p>` : ''}</div>
      <div class="acts"><button class="btn ok" data-a="la">🌱 Aprovar o lote</button><button class="btn s" data-a="lr">✖️ Recusar</button></div>`);
  }
  function titulo(x) {
    det('tit', x, `<div class="card"><h3>TÍTULO E DESCRIÇÃO · SHOPEE</h3><p>Atual:</p><div class="bub c">${esc(x.de)}</div>${x.para ? `<p>Novo título:</p><div class="bub l">${esc(x.para)}</div>` : ''}${x.ds ? '<p>📝 Inclui uma descrição nova (veja o texto inteiro no computador, aba Títulos).</p>' : ''}${x.ok ? '' : '<p>⚠️ O texto tem problema: revise no computador (aba Títulos).</p>'}</div>
      <div class="acts">${x.ok ? '<button class="btn ok" data-a="ta">✅ Aprovar</button>' : ''}<button class="btn s" data-a="tr">✖️ Rejeitar</button></div>`);
  }
  function tarefa(c, t) {
    const feito = t.u && Date.now() - t.u.at < RECENTE;
    det('est', { c, t }, `<div class="card"><h3>${c.lj === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'} · ${esc(c.nm)} · ${esc(c.eg)}</h3><div class="big" style="font-size:16px">${t.o}. ${esc(t.t)}</div><p>Prioridade ${esc(t.p)}${t.q ? ' · ' + t.q + ' anúncio(s)' : ''}</p></div>
      <div class="card"><h3>POR QUÊ</h3><p>${esc(t.r)}</p>${t.er ? `<p>🤖 Quem faz: <b>${esc(t.er)}</b></p>` : ''}${t.u ? `<p>${t.u.ok ? '✅' : '⚠️'} Última vez (${esc(quando(t.u.at))}): ${esc(t.u.m)}</p>` : ''}</div>
      <div class="acts">${t.m !== 'manual' ? (c.ex ? `<button class="btn ${feito ? 's' : 'ok'}" data-a="ee">▶️ ${feito ? 'Executar de novo' : 'Executar'}: ${esc(t.er || 'tarefa')}</button>` : '<p class="hint2">⚠️ Esta conta não está aberta no computador principal: abra a loja lá para executar.</p>') : '<p class="hint2">🖥️ Esta tarefa é feita por você no computador.</p>'}<button class="btn s" data-a="ei">🙈 Deixar de lado por 7 dias</button></div>`);
  }
  function tarefaSp(x) {
    det('spt', x, `<div class="card"><h3>PLANO ESTRATÉGICO · SHOPEE</h3><div class="big" style="font-size:16px">${esc(x.t)}</div><p>${esc(x.p)}${x.lj ? ' · ' + esc(x.lj) : ''}${x.sc ? ' · ' + x.sc + ' pts' : ''}</p></div>
      <div class="card"><h3>RECOMENDAÇÃO</h3><p>${esc(x.r || '—')}</p>${x.b ? `<p>⛔ Bloqueada: ${esc(x.b)}</p>` : ''}</div>
      <div class="acts">${x.b ? '' : '<button class="btn ok" data-a="pa">✅ Aprovar estratégia</button>'}<button class="btn s" data-a="pr">✖️ Rejeitar</button></div>`);
  }
  function acaoX(a) {
    const { tipo, item: x } = atual;
    const txt = () => (($('fResp') || {}).value || '').trim();
    if (tipo === 'duv' && a === 'dr') { const t = txt(); if (t.length < 2) return alert('Escreva a resposta.'); return x2('dr', x.id, '', t); }
    if (tipo === 'rev') { if (a === 'ra') { const t = txt(); if (!t) return alert('A resposta está vazia.'); return confirma('Aprovar esta resposta da avaliação? Ela é publicada na próxima rodada.', () => x2('ra', x.k, x.s, t)); } return confirma('Descartar esta resposta?', () => x2('rd', x.k, x.s)); }
    if (tipo === 'cmd') return a === 'ca' ? confirma(`Aprovar e executar o comando "${x.tx}"? Isso mexe na loja agora (dá para desfazer em Gerente → Comandos).`, () => x2('ca', x.id)) : confirma('Cancelar este comando?', () => x2('cc', x.id));
    if (tipo === 'mlp') return confirma(`Aplicar ${x.n} ajuste(s) de preço no Mercado Livre agora?`, () => x2('mp', 'ml'));
    if (tipo === 'lot') return a === 'la' ? confirma(`Aprovar o lote de ${x.n} anúncio(s) novo(s)? Ele entra na fila de duplicação.`, () => x2('la', x.id, x.c)) : confirma('Recusar este lote?', () => x2('lr', x.id, x.c));
    if (tipo === 'tit') return a === 'ta' ? confirma('Aprovar a proposta de título/descrição?', () => x2('ta', x.k, x.s)) : confirma('Rejeitar a proposta?', () => x2('tr', x.k, x.s));
    if (tipo === 'est') return a === 'ee' ? confirma(`Executar "${x.t.t}" agora?`, () => x2('ee', x.t.k, x.c.id)) : confirma('Deixar esta tarefa de lado por 7 dias?', () => x2('ei', x.t.k, x.c.id));
    if (tipo === 'spt') return a === 'pa' ? confirma(`Aprovar a estratégia "${x.t}"?`, () => x2('pa', x.k, x.s)) : confirma('Rejeitar esta estratégia?', () => x2('pr', x.k, x.s));
  }
  // ---------- 9. resumo diário ----------
  function resumoDia() {
    const r = D && D.rs;
    const pct = (a, b) => (b > 0 ? `<span class="${a >= b ? 'up' : 'dn'}">${a >= b ? '+' : ''}${Math.round((a / b - 1) * 100)}%</span>` : '');
    const sem = (p, nome) => (p ? `<div class="kv"><span>${nome} · 7 dias</span><b>${money(p.r)} ${pct(p.r, p.ra)}</b></div><div class="kv"><span>pedidos 7 dias</span><b>${p.o} ${pct(p.o, p.oa)}</b></div>` : '');
    atual = null;
    if (!r) { $('dBody').innerHTML = D && !(D.v >= 2) ? velha() : vazio('Sem leitura do resumo agora. Toque em Atualizar dados.'); return mostra('vDet'); }
    const pend = { atd: ((D.casos || []).length + ((D.atd || {}).duv || []).length + ((D.atd || {}).revN || 0)), pre: ((D.pre || {}).cmd || []).length + ((D.pre || {}).mlp ? 1 : 0), cam: ((D.cam || {}).cmd || []).length + ((D.cam || {}).lot || []).length + ((D.cam || {}).titN || 0), pl: pendPlano() };
    $('dBody').innerHTML = `<div class="card"><h3>9 · RESUMO DIÁRIO DA OPERAÇÃO</h3><p>${esc(new Date(D.at).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${esc(new Date(D.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}</p></div>
      <div class="card"><h3>VENDAS</h3>
        <div class="kv"><span>🟡 Mercado Livre hoje</span><b>${r.ml ? `${r.ml.v} venda(s) · ${money(r.ml.t)}` : r.mlOn ? '—' : 'desconectado'}</b></div>
        <div class="kv"><span>🟠 Shopee ${r.sp ? '(' + r.sp.d.slice(8) + '/' + r.sp.d.slice(5, 7) + ')' : ''}</span><b>${r.sp ? `${r.sp.o} pedido(s) · ${money(r.sp.r)}` : 'sem coleta ainda'}</b></div>
        ${sem(r.ml7, 'ML')}${sem(r.sp7, 'Shopee')}</div>
      <div class="card"><h3>ATENDIMENTO</h3>
        <div class="kv"><span>Perguntas sem resposta (ML)</span><b>${r.q == null ? '—' : r.q}</b></div>
        <div class="kv"><span>Mensagens de pós-venda (ML)</span><b>${r.un == null ? '—' : r.un}</b></div>
        <div class="kv"><span>Reclamações abertas (ML)</span><b>${r.cl == null ? '—' : r.cl}</b></div>
        <div class="kv"><span>Duoke: casos · dúvidas</span><b>${r.dk ? r.dk.c + ' · ' + r.dk.d : '—'}</b></div></div>
      <div class="card"><h3>SHOPEE ADS E ROBÔS</h3>
        <div class="kv"><span>Ads</span><b>${r.ads ? `ROAS ${String(r.ads.roas).replace('.', ',')} · gasto ${money(r.ads.c)} · vendas ${money(r.ads.g)}` : 'ainda sem rodada'}</b></div>
        <div class="kv"><span>Bot Ads</span><b>${esc(r.bot || '—')}</b></div>
        <div class="kv"><span>Rotina do dia</span><b>${r.rot ? r.rot.f + ' de ' + r.rot.t + ' blocos' : 'desligada / sem rotina hoje'}</b></div>
        <div class="kv"><span>Médico do sistema</span><b>${r.med ? r.med + ' parada(s)' : 'sem paradas'}</b></div></div>
      <div class="card"><h3>ESPERANDO VOCÊ</h3>
        <div class="kv"><span>Atendimento</span><b>${pend.atd}</b></div><div class="kv"><span>Preços</span><b>${pend.pre}</b></div><div class="kv"><span>Campanhas e anúncios</span><b>${pend.cam}</b></div><div class="kv"><span>Plano do gerente</span><b>${pend.pl}</b></div>
        <div class="kv"><span>Devoluções</span><b>${(D.dev || []).length}</b></div><div class="kv"><span>Vídeos com erro</span><b>${(D.vid || []).length}</b></div><div class="kv"><span>Cópias de hoje</span><b>${(D.cop || []).filter((x) => x.ok).length}</b></div></div>
      <div class="acts"><button class="btn s" data-command="painel">▦ Mandar o painel completo no chat</button></div>`;
    mostra('vDet');
  }

  // ---------- pedido pendente ----------
  function pedido(x) {
    atual = { tipo: 'ped', item: x };
    const h = x.pz ? Math.round((x.pz - Date.now()) / 36e5) : null;
    $('dBody').innerHTML = `<div class="card"><h3>PEDIDO SHOPEE</h3><div class="big">${esc(x.sn)}</div><p>🕒 ${esc(quando(x.at))} · ${money(x.v)}${x.tr ? ' · 🚚 ' + esc(x.tr) : ''}</p>${x.pz ? `<p>⏰ Enviar até ${esc(quando(x.pz))}${h != null && h < 24 ? ` <span class="tag r">${h <= 0 ? 'ATRASADO' : 'EM ' + h + ' H'}</span>` : ''}</p>` : ''}</div>
      <div class="card"><h3>PRODUTOS</h3>${x.it.map(([k, q]) => `<div class="kv"><span>${esc(k)}</span><b>x${q}</b></div>`).join('') || `<p>${esc(x.nm)}</p>`}</div>
      <div class="card"><h3>ETIQUETA</h3>${x.st === 'p' ? `<p>${x.et ? '✅ Já foi impressa em ' + esc(quando(x.et)) + '. Dá para receber de novo.' : '🏷 Ainda não foi impressa.'}</p>` : '<p>📦 O envio deste pedido ainda não foi organizado (coleta ou postagem). Organize na Shopee para a etiqueta sair; se já organizou, toque abaixo.</p>'}</div>
      <div class="acts"><button class="btn ${x.st === 'p' ? 'ok' : 's'}" data-a="pedet">🏷 Receber a etiqueta aqui no chat (PDF)</button></div>`;
    mostra('vDet');
  }

  // ---------- Meus anúncios (Firebase do usuário, MLF Sistema) ----------
  // A extensão guarda a cópia diária dos anúncios em usuarios/{uid}/anunciosLojas e anunciosCache. A Central lê
  // dali com o login do próprio usuário no MLF Sistema (as regras do Firebase só deixam cada um ler o seu).
  const FB = { key: 'AIzaSyBv78q2fiMNGzoYilq4OqaHGYxZvP0iBHU', proj: 'mlf-decor' };
  const FBK = 'mlfCentralFbLogin';
  const AN = { tok: null, exp: 0, lojas: null, loja: null, itens: null, q: '' };
  const lsG = () => { try { return JSON.parse(localStorage.getItem(FBK) || 'null'); } catch (e) { return null; } };
  const lsS = (v) => { try { if (v) localStorage.setItem(FBK, JSON.stringify(v)); else localStorage.removeItem(FBK); } catch (e) { /* sem armazenamento */ } };
  async function post(url, body, form) {
    const r = await fetch(url, form ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const c = (j.error && j.error.message) || 'HTTP ' + r.status; const e = new Error(/INVALID_LOGIN|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(c) ? 'E-mail ou senha incorretos.' : /TOO_MANY/.test(c) ? 'Muitas tentativas. Espere alguns minutos.' : /TOKEN_EXPIRED|INVALID_REFRESH|USER_NOT_FOUND/.test(c) ? 'O login venceu. Entre de novo.' : c); e.auth = r.status === 400; throw e; }
    return j;
  }
  async function fbLogin(email, senha) {
    const j = await post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FB.key, { email, password: senha, returnSecureToken: true });
    lsS({ r: j.refreshToken, uid: j.localId, email: j.email });
    AN.tok = j.idToken; AN.exp = Date.now() + (+j.expiresIn || 3600) * 1000 - 60e3;
  }
  async function fbTok() {
    if (AN.tok && Date.now() < AN.exp) return AN.tok;
    const s = lsG(); if (!s || !s.r) return null;
    try {
      const j = await post('https://securetoken.googleapis.com/v1/token?key=' + FB.key, { grant_type: 'refresh_token', refresh_token: s.r }, true);
      if (j.refresh_token && j.refresh_token !== s.r) lsS({ ...s, r: j.refresh_token });
      AN.tok = j.id_token; AN.exp = Date.now() + (+j.expires_in || 3600) * 1000 - 60e3;
      return AN.tok;
    } catch (e) { if (e.auth) lsS(null); throw e; }
  }
  const dec = (v) => (!v ? null : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? +v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'arrayValue' in v ? ((v.arrayValue.values) || []).map(dec) : 'mapValue' in v ? campos(v.mapValue.fields || {}) : null);
  const campos = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, dec(v)]));
  async function fbGet(path, q) {
    const tok = await fbTok(); if (!tok) throw new Error('login');
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FB.proj}/databases/(default)/documents/${path}${q ? '?' + q : ''}`, { headers: { Authorization: 'Bearer ' + tok } });
    if (r.status === 404) return null;
    if (r.status === 403) throw new Error('O Firebase não deixou ler os anúncios (regras do Firebase: usuarios/{uid}/anunciosLojas e anunciosCache).');
    if (!r.ok) throw new Error('Firebase: HTTP ' + r.status);
    return r.json();
  }
  function telaLogin(msg, email) {
    $('lEye').textContent = 'MLF SISTEMA'; $('lTitle').textContent = 'Meus anúncios';
    $('lBody').innerHTML = `<div class="card"><h3>ENTRAR NO MLF SISTEMA</h3><p>Os anúncios vêm do SEU Firebase (o mesmo login do MLF Sistema). A senha não fica guardada: só a chave de acesso, neste celular.</p>
      <input class="f" id="fbEmail" type="email" autocomplete="username" placeholder="e-mail" value="${esc(email || (lsG() || {}).email || '')}" style="margin:6px 0">
      <input class="f" id="fbSenha" type="password" autocomplete="current-password" placeholder="senha" style="margin:0 0 8px">
      ${msg ? `<p>⚠️ ${esc(msg)}</p>` : ''}<button class="btn" data-fb="entrar" style="width:100%">Entrar</button></div>`;
    mostra('vList');
  }
  async function anuncios() {
    $('lEye').textContent = 'SHOPEE E MERCADO LIVRE'; $('lTitle').textContent = 'Meus anúncios';
    const s = lsG();
    if (!s || !s.r) return telaLogin();
    $('lBody').innerHTML = vazio('Lendo as suas lojas no Firebase…'); mostra('vList');
    try {
      const j = await fbGet(`usuarios/${s.uid}/anunciosLojas`, 'pageSize=50');
      AN.lojas = ((j && j.documents) || []).map((d) => campos(d.fields)).filter((x) => x.loja && x.conta).sort((a, b) => (a.loja + a.nome).localeCompare(b.loja + b.nome));
    } catch (e) { return e.message === 'login' ? telaLogin() : ($('lBody').innerHTML = vazio('⚠️ ' + esc(e.message))); }
    $('lBody').innerHTML = (AN.lojas.length ? AN.lojas.map((l, i) => it(`data-anl="${i}"`, `${l.loja === 'ml' ? '🟡 Mercado Livre' : '🟠 Shopee'} · ${l.nome || l.conta}`, l.total + ' anúncio(s)', `busca completa ${esc(quando(l.full))} · conferido ${esc(quando(l.check))}`, '')).join('')
      : vazio('Ainda não há anúncios no seu Firebase. A extensão MLF BRASIL 5.85.0+ com o MLF Sistema conectado envia a cópia sozinha (1 vez por dia, e as alterações a cada 2 horas).'))
      + `<p class="hint2">Conectado como ${esc(s.email || '')} · <button class="textbtn" data-fb="sair">sair</button></p>`;
  }
  async function abrirLoja(l) {
    AN.loja = l; AN.itens = null; AN.q = '';
    $('lEye').textContent = l.loja === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'; $('lTitle').textContent = l.nome || l.conta;
    $('lBody').innerHTML = vazio('Carregando ' + l.total + ' anúncio(s)…'); mostra('vList');
    try {
      const s = lsG(), lk = l.loja + '_' + String(l.conta).replace(/[^A-Za-z0-9_-]/g, '');
      const ps = await Promise.all([...Array(+l.partes || 1).keys()].map((i) => fbGet(`usuarios/${s.uid}/anunciosCache/${lk}_${i}`)));
      AN.itens = ps.flatMap((d) => { try { return d ? JSON.parse(campos(d.fields).j || '[]') : []; } catch (e) { return []; } }).map((x) => (l.loja === 'ml'
        ? { id: x.id, t: x.title, sku: x.sku || '', p: x.price, e: x.available_quantity, v: x.sold_quantity, img: x.secure_thumbnail, st: x.status === 'active' ? 'ATIVO' : 'PAUSADO', link: x.permalink, vr: (x.variations || []).map((y) => [y.nm, y.seller_custom_field, y.price, y.available_quantity]) }
        : { id: x.id, t: x.name, sku: x.parentSku || '', p: x.priceMin, e: x.stock, v: x.sold, img: x.img, st: x.status === 'NORMAL' ? 'ATIVO' : 'PAUSADO', link: `https://shopee.com.br/product/${l.conta}/${x.id}`, vr: (x.models || []).map((m) => [m.name, m.sku, m.price, m.stock]), vid: x.video }))
        .sort((a, b) => (b.v || 0) - (a.v || 0));
    } catch (e) { $('lBody').innerHTML = vazio('⚠️ ' + esc(e.message)); return; }
    listaItens();
  }
  function listaItens() {
    const q = AN.q.trim().toLowerCase();
    const l = AN.itens.filter((x) => !q || String(x.t).toLowerCase().includes(q) || String(x.id).toLowerCase().includes(q) || String(x.sku).toLowerCase().includes(q) || x.vr.some((v) => String(v[1] || '').toLowerCase().includes(q)));
    const mostra2 = l.slice(0, 150);
    $('lBody').innerHTML = `<input class="f" id="anQ" type="search" placeholder="Buscar por título, SKU ou ID" value="${esc(AN.q)}"><p class="hint2">${l.length} de ${AN.itens.length} anúncio(s) · cópia de ${esc(quando(AN.loja.check || AN.loja.full))}</p>`
      + mostra2.map((x, i) => it(`data-ani="${AN.itens.indexOf(x)}"`, x.t, money(x.p), `${x.st === 'ATIVO' ? '' : '<span class="tag w">PAUSADO</span>'}${x.e ? '' : '<span class="tag r">SEM ESTOQUE</span>'}${x.vid === false ? '<span class="tag w">SEM VÍDEO</span>' : ''}${esc(x.sku)}${x.sku ? ' · ' : ''}estoque ${x.e} · ${x.v || 0} venda(s)`, '')).join('')
      + (l.length > mostra2.length ? `<p class="hint2">Mostrando 150 de ${l.length}. Use a busca.</p>` : '');
    const inp = $('anQ'); inp.addEventListener('input', () => { AN.q = inp.value; const pos = inp.selectionStart; listaItens(); const n = $('anQ'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ok */ } });
  }
  function anuncio(x) {
    atual = { tipo: 'anc', item: x };
    $('dBody').innerHTML = `<div class="card"><h3>${AN.loja.loja === 'ml' ? 'MERCADO LIVRE' : 'SHOPEE'} · ${esc(AN.loja.nome || AN.loja.conta)}</h3>${x.img ? `<img src="${esc(x.img)}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:10px;float:right;margin-left:8px">` : ''}<div class="big" style="font-size:16px">${esc(x.t)}</div><p>🆔 ${esc(x.id)}${x.sku ? ' · SKU ' + esc(x.sku) : ''}</p><p>💲 ${money(x.p)} · 📦 estoque ${x.e} · 🛒 ${x.v || 0} venda(s) · ${esc(x.st)}</p>${x.vid === false ? '<p>🎞️ sem vídeo</p>' : ''}</div>
      ${x.vr.length ? `<div class="card"><h3>VARIAÇÕES (${x.vr.length})</h3>${x.vr.slice(0, 60).map((v) => `<div class="kv"><span>${esc(v[0] || '—')}<br><small style="color:#8ea6b8">${esc(v[1] || '')}</small></span><b>${money(v[2])} · ${v[3]} un.</b></div>`).join('')}</div>` : ''}
      <div class="acts"><button class="btn" data-a="abrir">↗ Abrir o anúncio</button></div>`;
    mostra('vDet');
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
    if (el.dataset.duv != null) return duvida(D.atd.duv[+el.dataset.duv]);
    if (el.dataset.rev != null) return avaliacao(D.atd.rev[+el.dataset.rev]);
    if (el.dataset.cmd != null) { const [t, i] = el.dataset.cmd.split(':'); return comando(t, D[t].cmd[+i]); }
    if (el.dataset.mlp != null) return precoMl(D.pre.mlp);
    if (el.dataset.lot != null) return lote(D.cam.lot[+el.dataset.lot]);
    if (el.dataset.tit != null) return titulo(D.cam.tit[+el.dataset.tit]);
    if (el.dataset.est != null) { const [ci, ti] = el.dataset.est.split(':').map(Number); const c = D.pl.est[ci]; return tarefa(c, c.t[ti]); }
    if (el.dataset.spt != null) return tarefaSp(D.pl.sp[+el.dataset.spt]);
    if (el.dataset.info != null) return;
    if (el.dataset.ped != null) return pedido(D.ped.l[+el.dataset.ped]);
    if (el.dataset.a === 'pedet' && atual && atual.tipo === 'ped') { haptic(); return sendRaw({ action: 'x', op: 'et', key: atual.item.sn, s: '' }); }
    if (el.dataset.a === 'pedtodas' && atual && atual.tipo === 'pedl') { haptic(); const sns = atual.item.map((x) => x.sn); return confirma(`Receber num PDF as etiquetas de ${sns.length} pedido(s) processado(s)?`, () => sendRaw({ action: 'x', op: 'et', key: sns.join(','), s: '' })); }
    if (el.dataset.fb === 'entrar') { const em = ($('fbEmail').value || '').trim(), se = $('fbSenha').value || ''; if (!em || !se) return alert('Informe o e-mail e a senha do MLF Sistema.'); el.disabled = true; el.textContent = 'Entrando…'; return fbLogin(em, se).then(anuncios, (er) => telaLogin(er.message, em)); }
    if (el.dataset.fb === 'sair') return confirma('Sair do MLF Sistema neste celular?', () => { lsS(null); AN.tok = null; telaLogin(); });
    if (el.dataset.anl != null) return abrirLoja(AN.lojas[+el.dataset.anl]);
    if (el.dataset.ani != null) return anuncio(AN.itens[+el.dataset.ani]);
    if (el.dataset.a === 'abrir' && atual && atual.tipo === 'anc') { const u = atual.item.link; return tg && typeof tg.openLink === 'function' ? tg.openLink(u) : window.open(u, '_blank'); }
    if (el.dataset.a && atual) { haptic(); return atual.tipo === 'caso' ? acaoCaso(el.dataset.a) : atual.tipo === 'vid' ? acaoVid(el.dataset.a) : atual.tipo === 'dev' ? acaoDev(el.dataset.a) : acaoX(el.dataset.a); }
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
