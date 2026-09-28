// 5. Sincronizar entrevista e áudios com o Supabase
export async function syncInterview(interview, audios = []) {
  const client = getClient();
  if (!client) throw new Error('Cliente Supabase não configurado.');

  const session = await getSession();
  if (!session) throw new Error('Usuário não autenticado.');

  // Extrai a data no formato YYYY-MM-DD para a coluna DATE do Postgres
  const dataColeta = interview.meta?.data || new Date(interview.createdAt).toISOString().slice(0, 10);

  // a) Upload/Upsert dos dados da entrevista na tabela interviews
  const { error: intError } = await client
    .from('interviews')
    .upsert({
      id: interview.id,
      user_id: session.user.id,
      data: dataColeta, // Envia a string no formato 'YYYY-MM-DD' exigido pelo tipo DATE
      payload: interview, // Envia o objeto JSON completo (caso sua coluna se chame payload ou jsonb)
      updated_at: new Date().toISOString()
    });

  if (intError) {
    // Tenta fallback sem a coluna extra caso só existam id, user_id, data e updated_at
    const { error: fallbackError } = await client
      .from('interviews')
      .upsert({
        id: interview.id,
        user_id: session.user.id,
        data: dataColeta,
        updated_at: new Date().toISOString()
      });
      
    if (fallbackError) throw new Error('Erro ao salvar entrevista: ' + fallbackError.message);
  }

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