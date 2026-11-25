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
