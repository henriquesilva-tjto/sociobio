# Entrevista Sociobiodiversidade — PWA + Supabase

Aplicativo web/PWA para Chrome Android, com coleta offline e sincronização com banco central Supabase.

## Recursos
- coleta offline após primeira abertura em HTTPS;
- IndexedDB local para entrevistas e áudios;
- painel de entrevistas;
- salvamento automático e retomada;
- backup/restauração;
- CSV geral;
- gravação de áudio por pergunta;
- TTS e reconhecimento de fala quando disponíveis no Chrome;
- GPS opcional;
- regras condicionais A–G;
- autenticação Supabase por e-mail e senha;
- sincronização das entrevistas pendentes;
- upload dos áudios para Storage;
- RLS para restringir os dados ao usuário autenticado.

## Publicação
O endereço do aplicativo pode continuar sendo:

`https://henriquesilva-tjto.github.io/sociobio/`

O GitHub Pages serve apenas a aplicação. O banco central é o Supabase.

Consulte `SUPABASE_CONFIG.md` e execute `supabase_schema.sql` no projeto Supabase antes de sincronizar.

## Segurança
Use somente a Publishable key no navegador. Nunca exponha Secret/service_role key. As tabelas usam Row Level Security e cada usuário acessa apenas suas próprias entrevistas. O bucket de áudio deve ser privado.
