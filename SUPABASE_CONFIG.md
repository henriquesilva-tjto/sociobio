# Configuração do banco central Supabase

## 1. Criar o projeto
No Supabase, crie um projeto novo.

## 2. Executar o banco
Abra **SQL Editor** e execute o arquivo `supabase_schema.sql`.

Ele cria:
- `public.interviews`
- `public.interview_audios`
- índices
- RLS e políticas por usuário

## 3. Criar o armazenamento de áudio
No Supabase, abra **Storage** e crie um bucket chamado:

`interview-audios`

Deixe o bucket **privado**.

Crie políticas de Storage que permitam ao usuário autenticado inserir/ler/atualizar/excluir somente objetos cuja primeira pasta seja o próprio `auth.uid()`.

Exemplo de expressão para a pasta:

`(storage.foldername(name))[1] = (select auth.uid()::text)`

## 4. Obter as credenciais
Na página **Connect** do projeto, copie:
- Project URL
- Publishable key (`sb_publishable_...`)

Nunca coloque uma Secret key / service role key no navegador.

## 5. Configurar a aplicação
Abra no Chrome:

`https://henriquesilva-tjto.github.io/sociobio/`

Entre em **Configurações** e informe os dois valores.

Depois use **Criar acesso** para cadastrar o entrevistador ou crie os usuários diretamente no Supabase Auth.

## 6. Fluxo
1. O entrevistador faz login uma vez quando houver internet.
2. A coleta pode continuar offline.
3. Cada entrevista fica no IndexedDB do aparelho com status `Pendente`.
4. Ao voltar a internet, pressione **Sincronizar pendentes**.
5. O aplicativo envia a entrevista para `interviews` e os áudios para o Storage.
6. Somente depois de todos os envios concluírem, a entrevista local passa para `Sincronizada`.

## Observação
O GitHub Pages continua sendo apenas o local da aplicação. Ele não é o banco e não recebe as entrevistas.
