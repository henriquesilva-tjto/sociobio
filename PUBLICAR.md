# Publicação para uso no Chrome Android

## Opção recomendada: hospedagem HTTPS

Publique **todos os arquivos desta pasta** em um servidor HTTPS. Não altere a estrutura das pastas.

Depois, no Chrome do celular:

1. Abra o endereço HTTPS.
2. Aguarde o aplicativo carregar completamente.
3. Faça uma abertura de teste com internet.
4. Inicie uma entrevista de teste.
5. Ative o modo avião.
6. Feche e reabra a página/aplicativo.
7. Confirme que a coleta continua disponível.

A aplicação usa IndexedDB para dados e Service Worker para o cache dos arquivos.

## GitHub Pages

1. Crie um repositório no GitHub.
2. Envie o conteúdo desta pasta para a raiz do repositório.
3. Ative Pages nas configurações do repositório.
4. Abra a URL HTTPS fornecida pelo GitHub no Chrome Android.

## Execução local no computador

No Windows, execute `serve_windows.bat`. Isso serve a aplicação em HTTP na porta 8000.

Para desenvolvimento, `localhost` permite testar Service Worker. Para uso no celular, prefira hospedagem HTTPS.

## Atenção ao reconhecimento de voz

A gravação do áudio é local e não depende da transcrição.

O reconhecimento de fala do Chrome pode depender do serviço de voz disponível no aparelho e não deve ser considerado um mecanismo universalmente offline. Se o reconhecimento não funcionar, a resposta continua podendo ser gravada em áudio e preenchida manualmente.
