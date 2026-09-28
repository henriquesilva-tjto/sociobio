import { getSetting, saveSetting } from './db.js';

// Função auxiliar para obter a instância do cliente Supabase
function getClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase) {
    // Tenta pegar do localStorage ou usa o padrão
    const url = localStorage.getItem('supabase_url') || 'https://gyxrmasketpbwrftmfuc.supabase.co';
    const key = localStorage.getItem('supabase_key') || 'sb_publishable_D_vIJkjBQ4-Ozo1-xpeulw_9PSBV3VM';
    window.supabaseClient = window.supabase.createClient(url, key);
    return window.supabaseClient;
  }
  return null;
}

export async function saveSupabaseConfig(url, key) {
  if (url) localStorage.setItem('supabase_url', url);
  if (key) localStorage.setItem('supabase_key', key);
  await saveSetting('supabaseUrl', url);
  await saveSetting('supabasePublishableKey', key);
  if (window.supabase && url && key) {
    window.supabaseClient = window.supabase.createClient(url, key);
  }
}

// 1. Fazer login com e-mail e senha
export async function signIn(email, password) {
  const client = getClient();
  if (!client) throw new Error('Cliente Supabase não inicializado.');
  
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// 2. Criar novo usuário/acesso
export async function signUp(email, password) {
  const client = getClient();
  if (!client) throw new Error('Cliente Supabase não inicializado.');
  
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// 3. Encerrar sessão (Logout)
export async function signOut() {
  const client = getClient();
  if (client) {
    await client.auth.signOut();
  }
}

// 4. Obter sessão atual
export async function getSession() {
  const client = getClient();
  if (!client) return null;
  
  const { data: { session } } = await client.auth.getSession();
  return session;
}

// 5. Sincronizar entrevista e áudios com o Supabase
export async function syncInterview(interview, audios = []) {
  const client = getClient();
  if (!client) throw new Error('Cliente Supabase não configurado.');

  const session = await getSession();
  if (!session) throw new Error('Usuário não autenticado.');

  // a) Upload/Upsert dos dados da entrevista na tabela interviews
  const { error: intError } = await client
    .from('interviews')
    .upsert({
      id: interview.id,
      user_id: session.user.id,
      data: interview,
      updated_at: new Date().toISOString()
    });

  if (intError) throw new Error('Erro ao salvar entrevista: ' + intError.message);

  // b) Upload dos arquivos de áudio para o Bucket Storage (interview-audios)
  for (const item of audios) {
    if (item.blob) {
      const filePath = `${session.user.id}/${interview.id}/${item.questionId}_${item.id}.webm`;
      
      const { error: uploadError } = await client.storage
        .from('interview-audios')
        .upload(filePath, item.blob, {
          contentType: item.mime || 'audio/webm',
          upsert: true
        });

      if (uploadError) {
        console.warn('Aviso no upload do áudio:', uploadError.message);
      }
    }
  }
}