// Mapa de códigos de erro → mensagens em Português
const ERROR_MAP: Record<string, string> = {
  // Auth
  USERNAME_TAKEN:       'Este nome de utilizador já está em uso.',
  INVALID_CREDENTIALS:  'Nome ou password incorretos.',
  UNAUTHORIZED:         'Sessão expirada. Por favor, entra novamente.',

  // Sala
  ROOM_NOT_FOUND:       'Sala não encontrada. Verifica o código.',
  ROOM_FULL:            'Esta sala já está cheia.',
  ALREADY_STARTED:      'O jogo já começou nesta sala.',
  NOT_HOST:             'Só o anfitrião pode iniciar o jogo.',
  NOT_ENOUGH_PLAYERS:   'Não há jogadores suficientes para iniciar.',

  // Jogo
  NOT_YOUR_TURN:        'Não é a tua vez de jogar.',
  CARD_NOT_IN_HAND:     'Não tens essa carta na mão.',
  WRONG_PHASE:          'Ação inválida nesta fase do jogo.',
  NO_TRUMP_CARD:        'Não há carta de trunfo visível para trocar.',
  NO_SEVEN_OF_TRUMP:    'Não tens o 7 do trunfo atual.',
  TRUMP_SUIT_MISMATCH:  'O 7 só pode trocar por uma carta do mesmo naipe de trunfo.',

  // Socket / ligação
  AUTH_REQUIRED:        'Sessão inválida. Por favor, entra novamente.',
  INVALID_SESSION:      'Sessão expirada. Por favor, entra novamente.',
  NETWORK_ERROR:        'Não foi possível ligar ao servidor. Verifica a ligação.',
  TIMEOUT:              'O servidor não respondeu. Tenta de novo.',
}

export function mapError(code: string): string {
  return ERROR_MAP[code] ?? code
}
