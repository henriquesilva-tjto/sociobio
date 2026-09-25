# Entrevista Sociobiodiversidade — PWA offline

PWA para Chrome Android baseada no QUESTIONÁRIO DE CARACTERIZAÇÃO SOCIOECONÔMICA — Instrumento I1.

## Recursos
- coleta offline após a primeira abertura em HTTPS;
- IndexedDB local para entrevistas e áudios;
- painel de entrevistas em andamento/concluídas;
- salvamento automático e retomada;
- exclusão controlada de entrevistas;
- backup completo em JSON, incluindo áudios em Base64;
- restauração de backup;
- CSV geral de todas as entrevistas;
- exportação individual de JSON/CSV/áudios;
- contador de pendências de sincronização;
- endpoint opcional HTTPS para sincronização posterior;
- TTS em português;
- reconhecimento de fala quando disponibilizado pelo Chrome;
- gravação de áudio por pergunta;
- regras condicionais A–G;
- GPS opcional;
- interface responsiva para celular.

## Uso local
1. Abra a pasta no VS Code.
2. Use Live Server para testar no computador.
3. Para uso no celular, publique em HTTPS.
4. Abra o endereço no Chrome Android uma primeira vez com internet.
5. Depois disso, o aplicativo e os dados já armazenados podem continuar sendo usados sem conexão.

## Backup
Na tela inicial:
- **Backup completo** cria um JSON com entrevistas + áudios.
- **Restaurar backup** importa esse JSON.
- **CSV geral** exporta todas as respostas em uma única planilha CSV.

O backup pode ficar grande porque os áudios são incorporados ao JSON em Base64. Para coletas extensas, recomenda-se fazer backups por período ou implementar um servidor de sincronização.

## Sincronização
Em Configurações pode ser informado um endpoint HTTPS. O aplicativo enviará cada entrevista pendente por POST JSON. O servidor deve devolver HTTP 2xx para que a entrevista seja marcada como sincronizada.

O aplicativo **não exige servidor para coletar**. Sem endpoint ou sem internet, as entrevistas permanecem locais e aparecem como pendentes.

## Segurança
Para uso institucional, publique somente em HTTPS e defina uma política de backup/retention. O armazenamento local do navegador não deve ser tratado como único mecanismo de preservação de dados.

## Versão corrigida
Esta versão foi revisada para corrigir a inicialização da pesquisa, navegação, carregamento das perguntas e conclusão da entrevista.
