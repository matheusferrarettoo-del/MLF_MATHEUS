# Arquitetura Multiusuário — Central Remota MLF BRASIL

## Decisões confirmadas
- Cada pessoa possui seu próprio login no MLF_MATHEUS (Firebase Authentication).
- Cada pessoa utiliza sua própria instalação da extensão MLF BRASIL.
- Cada pessoa utiliza seu próprio bot do Telegram (token individual).
- Acesso administrativo definido como **self**: cada conta acessa somente os próprios dados. Não existe visão cruzada de administrador nesta configuração.

## Objetivo
Conectar a identidade Firebase de cada usuário à sua extensão e ao seu bot Telegram, mantendo o assistente local da própria extensão. A Central hospedada em GitHub Pages continua sendo uma interface estática compartilhada; a identidade e a autorização são individuais.

## Arquitetura-alvo
1. **MLF_MATHEUS / Firebase Authentication**: fonte de identidade; o UID é a chave primária de isolamento.
2. **Vínculo Telegram**: cada usuário autentica-se no MLF_MATHEUS e solicita um código de uso único, curto prazo e uso único. O código associa UID + instalação da extensão + bot/chat Telegram.
3. **Extensão individual**: mantém o próprio token do bot e o próprio chat pareado no armazenamento local. O token não é enviado ao GitHub Pages nem armazenado em documentos públicos.
4. **Mini App**: aberta pelo bot individual. Telegram.WebApp.initData deve ser validado no servidor antes de ser considerado identidade; initDataUnsafe serve somente para apresentação.
5. **Autorização**: cada operação deve ser autorizada por UID, instalação e escopo. O servidor nunca aceita UID informado livremente pelo cliente como prova de identidade.
6. **Dados**: as consultas Firestore devem respeitar as regras de acesso existentes e o UID autenticado. Nenhuma coleção global pode ser consultada sem filtro e autorização.
7. **Assistente**: o comando chega à extensão daquele usuário e chama o assist() local, preservando as confirmações de risco já existentes.
8. **Histórico/telemetria**: quando habilitados, devem ser particionados por UID e instalação, com regras que impeçam leitura cruzada.

## Por que bots individuais
Cada instalação usa seu próprio token de bot. Isso evita que várias extensões concorram pelo getUpdates do mesmo bot e reduz o risco de erro 409 entre usuários diferentes. Ainda assim, o mesmo token não deve ser configurado em duas instalações simultâneas, pois elas podem disputar updates.

## Fluxo de vínculo proposto
1. Usuário entra no MLF_MATHEUS com Firebase Authentication.
2. A página solicita ao backend um código aleatório de vínculo.
3. O backend armazena somente o hash do código, UID, expiração, escopo e estado de uso.
4. Usuário envia o código ao próprio bot Telegram.
5. A extensão individual valida/resgata o código por um endpoint autenticado.
6. O backend associa o chat Telegram e a instalação ao UID e marca o código como consumido.
7. O usuário abre a Mini App pelo próprio bot. A identidade é conferida com initData validado e com o vínculo já registrado.

## Requisitos obrigatórios de segurança
- Não confiar em initDataUnsafe para autenticação.
- Não aceitar uid, chat_id ou installation_id enviados pelo cliente como prova isolada de identidade.
- Validar Telegram.WebApp.initData no backend, incluindo hash e auth_date recente.
- Códigos de vínculo com alta entropia, expiração curta, uso único, hash em repouso e rate limit.
- Guardar tokens de bot apenas na extensão local ou em armazenamento de segredos do backend, nunca em HTML público, Firestore legível pelo cliente ou repositório.
- Firestore Security Rules devem negar acesso por padrão e autorizar somente o UID autenticado.
- Nunca permitir que uma conta troque o UID-alvo de uma consulta ou comando.
- Confirmações de ações sensíveis permanecem obrigatórias e pertencem à sessão/usuário que iniciou a ação.
- Revogação deve invalidar vínculo Telegram e instalação sem apagar os dados de SKU.

## Observação sobre a arquitetura atual
A Central atual usa uma página estática e envia comandos por Telegram.WebApp.sendData(). A extensão atual recebe web_app_data e chama o assist() local. O código atual valida o chat privado pareado, mas esse pareamento por chat não comprova, por si só, a identidade Firebase. Portanto, a experiência atual funciona para uma instalação pareada, mas ainda não implementa o isolamento completo UID ↔ Telegram ↔ extensão.

## Etapas de implementação
### Fase 0 — auditoria (obrigatória)
- Mapear o login Firebase e a forma como o UID é mantido no MLF_MATHEUS.
- Mapear as regras atuais do Firestore e confirmar quais coleções já são particionadas por UID.
- Identificar como a extensão recebe/usa a identidade Firebase e quais dados de SKU ela consulta.
- Confirmar disponibilidade de Firebase Functions/Cloud Run e política de cobrança do projeto.

### Fase 1 — vínculo seguro
- Criar endpoint de emissão/resgate de código de vínculo.
- Criar interface de configuração de Central Remota no MLF_MATHEUS.
- Adicionar na extensão o fluxo de resgate e estado de vínculo.
- Manter compatibilidade com o pareamento atual até a migração concluída.

### Fase 2 — autenticação Mini App
- Validar initData no backend.
- Associar cada abertura da Mini App ao UID vinculado.
- Aplicar sessão curta e revogável para chamadas de dados.

### Fase 3 — isolamento de dados e assistente
- Passar contexto de identidade validado para cada consulta.
- Garantir que a extensão só execute comandos da própria conta.
- Particionar histórico, telemetria e resultados por UID.
- Testar tentativas de acesso cruzado com duas contas reais.

### Fase 4 — rollout
- Migrar primeiro duas contas de teste.
- Verificar ausência de vazamento entre contas.
- Migrar os demais usuários individualmente.
- Remover caminhos antigos somente após confirmação de estabilidade.

## Critérios de aceite
- Usuário A não consegue consultar SKUs, histórico, telemetria ou comandos de B.
- Usuário A não consegue abrir a Central vinculada ao bot/chat de B.
- Token de bot de A não aparece no código-fonte público nem nos dados acessíveis a B.
- Revogar vínculo de A bloqueia novas operações sem afetar B.
- Ações sensíveis continuam exigindo confirmação.
- O sistema principal de SKUs/MDF continua funcionando sem alterações indevidas.
