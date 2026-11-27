# Central Remota MLF BRASIL

A Central Remota é hospedada junto ao repositório **MLF_MATHEUS** em `/central/` e usa o Telegram como canal seguro de entrada para o assistente já existente na extensão Chrome MLF BRASIL.

## Fluxo real confirmado na extensão 5.75.3

1. O usuário abre a Mini App pelo botão enviado pelo bot Telegram conectado à extensão.
2. A página envia `{"v":1,"command":"..."}` usando `Telegram.WebApp.sendData()`.
3. O módulo `lib/telegram.js` da extensão recebe a mensagem `web_app_data` pelo long polling do Telegram.
4. Antes de aceitar comandos, a extensão verifica se o chat é privado e corresponde ao chat pareado nas configurações.
5. O comando é encaminhado para `deps.assist(text, { source: 'telegram' })`, isto é, para o assistente que já existe na extensão.
6. O assistente aplica suas regras de risco e confirmação; quando necessário, o bot devolve os botões de confirmação no Telegram.

**Não há um segundo assistente, Firebase novo ou servidor de comandos nesta primeira integração.** O computador principal precisa permanecer ligado, com Chrome e extensão ativos e Telegram conectado, pois é ele que recebe e executa as solicitações.

## Publicação

No repositório `MLF_MATHEUS`, habilite GitHub Pages em **Settings → Pages → Deploy from a branch → main → /(root)**. Após publicar, a página ficará em:

`https://matheusferrarettoo-del.github.io/MLF_MATHEUS/central/`

Confirme o endereço publicado antes de configurá-lo na extensão.

## Configuração da extensão

1. Atualize a extensão para a versão que contém a Mini App e o tratamento de `web_app_data`.
2. Abra **Configurações → Atendimento → Telegram** na extensão.
3. No campo da URL da Mini App (`tgMiniAppUrl`), informe o endereço HTTPS publicado acima.
4. Salve, abra o bot pareado e use **/central** ou o botão **Abrir Central MLF**.
5. Envie primeiro um comando de consulta, por exemplo: `painel`.

## Limitações e segurança

- A Central é uma interface estática; ela não mostra o estado em tempo real do computador nem executa ações sozinha.
- As respostas do assistente chegam na conversa do Telegram. A interface não lê mensagens do bot de volta para dentro da página.
- A extensão usa long polling (`getUpdates`) enquanto o Chrome está ativo. Não conecte o mesmo bot em outro consumidor de updates ao mesmo tempo; isso pode gerar conflito 409.
- O vínculo do Telegram é feito pelo pareamento individual da extensão. A Mini App não usa `initDataUnsafe` como autenticação; o nome exibido é apenas cosmético.
- Não coloque token do bot, chaves de marketplace ou credenciais no GitHub.
- A aplicação de preços/SKUs e suas coleções Firestore não são alteradas por este módulo.


## Central 2.0 — diagnóstico operacional

A interface `/central/` ganhou cartões de consulta para:
- diagnóstico do computador principal;
- estado conhecido da extensão;
- robôs e automações;
- conexões com Shopee, Mercado Livre, Duoke e Telegram.

Esses cartões enviam perguntas ao mesmo assistente por `Telegram.WebApp.sendData()`. Eles **não são indicadores de telemetria em tempo real** e não devem ser interpretados como prova automática de que um serviço está online.

### Próxima etapa para monitoramento automático real

Para mostrar presença, última atividade, versão da extensão, erros recentes e estados de automações atualizados automaticamente, é necessário adicionar à extensão um emissor de heartbeat e um canal de leitura autenticado. Antes de ativar isso, devem ser definidos:
1. autenticação e autorização do proprietário;
2. armazenamento de estado com regras restritas (sem tokens de bot ou credenciais);
3. intervalo e expiração do heartbeat;
4. quais dados podem ser enviados, minimizando dados pessoais;
5. política para comandos e ações remotas, mantendo as confirmações já existentes.

A integração inicial não grava esses dados no Firestore nem altera as coleções do sistema de SKUs/MDF.


## Central 3.0 — "Para resolver": casos do Duoke e devoluções (extensão 5.82.0+)

A Central ganhou a parte **Para resolver**, com:
- **Casos do atendimento** (Atendente Duoke): cliente, loja, motivo, pedido (SKU/variação/quantidade), conversa e o que o Atendente respondeu. Ações: IA escreve com a sua orientação (rascunho no chat), enviar exatamente o seu texto, sugerir resposta, já resolvi, enviar/ajustar/descartar rascunho.
- **Devoluções e reembolsos** (Shopee): valor, comprador, itens, motivo, situação, prazo, pendências, proposta, custo perdido sem devolução e mensagens do cliente no Duoke. Ações: aceitar reembolso, reembolso parcial (validado na tela), aguardar, aceitar proposta, desistir da disputa, depois. Contestar continua no chat (motivo e e-mail), com confirmação.

- **Vídeos com erro** (Shopee, extensão 5.83.0+): anúncio, SKU, arquivo e o motivo (ex.: resolução 1080 × 1920 acima do máximo de 1280 × 1280), com explicação de como resolver. Ações: tentar de novo (volta para a fila) e ignorar.
- **Cópias de hoje** (extensão 5.83.0+): cópias criadas hoje na Duplicação do Mercado Livre e no Duplicar Shopee, inclusive as que deram erro (com o motivo). Tocar abre o anúncio da cópia.

## Central 3.2 — os 9 itens (extensão 5.84.0+)

A parte **Para resolver** agora tem, nesta ordem:
1. **Atendimento aguardando sua aprovação** — casos do Atendente Duoke, dúvidas do Atendente (você responde e fica salvo no banco dele), respostas de avaliações da Shopee (edita, aprova ou descarta) e perguntas/conversas do Mercado Livre que o robô deixou para você (só aviso: responda no ML).
2. **Alterações de preço aguardando aprovação** — comandos do Gerente que mudam preço (aprovar e executar / cancelar) e os ajustes da análise diária de preços do Mercado Livre (aplicar todos, sempre preservando a Entrada).
3. **Campanhas e anúncios aguardando aprovação** — comandos de desconto, impulso, duplicação e expansão; lotes da Pulverização (aprovar / recusar) e propostas de título e descrição da Shopee (aprovar / rejeitar).
4. **Plano de ação do gerente** — tarefas do motor de estratégia de cada conta (executar / deixar de lado 7 dias) e as estratégias planejadas do Plano Estratégico da Shopee (aprovar / rejeitar).
5. Devoluções e reembolsos · 6. Cópias criadas hoje · 7. Vídeos com erros (Shopee API Media).
8. **Notificações importantes** — a mesma lista do "O que fazer agora" do painel (desconexões, perguntas, reclamações, casos, médico, violações, rotina), com as urgentes marcadas.
9. **Resumo diário da operação** — vendas de hoje (ML e Shopee), 7 dias contra os 7 anteriores, atendimento, Shopee Ads, Bot Ads, rotina, médico e quanto está esperando você em cada item.

Comandos grandes (com confirmação reforçada) continuam só no computador; a Central mostra, mas não executa. Tudo continua passando pelas mesmas regras e travas da extensão.

## Central 3.4 — Últimos pedidos pendentes e etiquetas (extensão 5.86.0+)

O cartão **Últimos pedidos pendentes** mostra os 10 pedidos mais recentes da Shopee esperando envio, com SKUs, valor, prazo e se a etiqueta já foi impressa. A etiqueta de um pedido (ou de todos os processados da lista) chega em PDF no chat do robô, cortada em 10 × 15 cm e com o SKU no rodapé. A lista vem no link do botão, como os outros itens; o PDF é mandado pelo robô do próprio usuário.

## Central 3.3 — Meus anúncios pelo Firebase (extensão 5.85.0+)

O cartão **Meus anúncios** lista as lojas da Shopee e do Mercado Livre e os anúncios de cada uma (busca por título, SKU ou ID; preço, estoque, vendas, variações; abrir o anúncio). Os dados vêm do Firebase do próprio usuário (`usuarios/{uid}/anunciosLojas` e `usuarios/{uid}/anunciosCache`), que a extensão atualiza: busca completa 1 vez por dia e só as alterações a cada 2 horas. A Central não chama a Shopee nem o Mercado Livre.

Na primeira vez a pessoa entra com o e-mail e a senha do MLF Sistema. A senha não é guardada: só a chave de renovação do Firebase, no próprio celular. As regras do Firebase garantem que cada um só lê a própria cópia:

```
match /usuarios/{uid}/anunciosLojas/{doc} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /usuarios/{uid}/anunciosCache/{doc} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

### Como os dados chegam (sem servidor e sem misturar usuários)
1. A extensão de cada usuário monta um resumo dos SEUS casos e devoluções, compacta (deflate) e coloca no link do botão **🖥️ Abrir Central MLF**, depois do `#` (`.../central/#d=z…`).
2. O botão é mandado pelo robô do próprio usuário, só para o chat desse usuário (e dos convidados que ele autorizou).
3. O `#` não é enviado ao GitHub Pages: a página é a mesma para todos, mas o conteúdo só existe no celular de quem recebeu o botão.
4. Cada ação tocada volta por `Telegram.WebApp.sendData()` para a extensão dona do robô, que confere o chat autorizado, executa e responde no chat com o botão já atualizado.

Assim, **cada usuário do MLF_MATHEUS tem a sua própria Central**: os dados de A nunca passam pelo robô, pelo chat, pelo GitHub ou pelo Firebase de B. Nada é gravado no Firestore e as coleções de SKUs/MDF não são tocadas.

### Para cada usuário
- Extensão MLF BRASIL **5.84.0 ou mais nova** para os 9 itens (5.82.1+ já usa esta Central) (já usa esta Central por padrão; o campo do endereço ficou opcional).
- No próprio robô do Telegram, mandar **/central** para receber o botão novo.
- O botão se atualiza sozinho quando chegam os casos do fim do dia e as devoluções do dia, depois de cada ação feita na Central e ao tocar em **↻ Atualizar dados**.

### Limites
- Cada ação fecha a Central (é assim que o Telegram entrega `sendData`); o resultado chega na conversa.
- Até 30 casos e 20 devoluções; em dias muito cheios a extensão resume as conversas para o link caber no botão.
- Extensões antigas continuam funcionando com a Central (comandos e cartões); a parte "Para resolver" fica "Sem dados" (ou pede "Atualize a extensão (5.84.0+)" nos itens novos) até atualizar a extensão.

Arquivos: `central/index.html` (página) e `central/app.js` (lógica). A mesma cópia vai dentro da extensão em `miniapp/`.
