# Bisca 61 — Guia de Instalação e Execução
<p align="center">
  <img src="foto/bisca61ADJ.png" alt="Tela de login" width="900">
</p>
## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|---------------|
| Node.js    | 20+           |
| XAMPP      | MySQL na porta 3306 |
| Expo Go    | Última versão (Android / iOS) |

---

## Estrutura do projeto

```
bisca61/
├── packages/
│   ├── shared/     — Tipos, engine do jogo, schemas (biblioteca partilhada)
│   ├── server/     — API Fastify + Socket.IO + Prisma/MySQL
│   └── mobile/     — App React Native (Expo SDK 51)
└── readme.md
```

---

## 1. Instalar dependências

```bash
# Na raiz bisca61/ — instala shared + server (npm workspaces)
npm install

# Mobile é standalone — instalar separadamente
cd packages/mobile
npm install
```

---

## 2. Variáveis de ambiente

### Servidor — `packages/server/.env`

```env
PORT=3001
DATABASE_URL="mysql://root:@localhost:3306/bisca61_node"
NODE_ENV=development
```

### Mobile — `packages/mobile/.env.local`

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3001
EXPO_PUBLIC_WS_URL=http://SEU_IP_LOCAL:3001
REACT_NATIVE_PACKAGER_HOSTNAME=SEU_IP_LOCAL
```

> **Encontrar o IP local:** `ipconfig` no Windows → "Endereço IPv4" do adaptador Wi-Fi.
> Usar `localhost` **não funciona** em dispositivos físicos — usa sempre o IP da máquina.

---

## 3. Base de dados MySQL

No phpMyAdmin (`http://localhost/phpmyadmin`):
1. Criar base de dados `bisca61_node` (charset: `utf8mb4`, collation: `utf8mb4_unicode_ci`)

No terminal:

```bash
cd packages/server
npx prisma db push
```

> Se a base de dados já existir com dados e der erro de schema, usar `npx prisma db push --force-reset` (apaga e recria todos os dados).

---

## 4. Executar o projeto

**Terminal 1 — Servidor:**
```bash
# Na raiz bisca61/
npm run dev:server
```

Confirma: abrir `http://SEU_IP_LOCAL:3001/health` no browser → deve responder `{"ok":true}`.

**Terminal 2 — App mobile:**
```bash
cd packages/mobile
npx expo start
```

Lê o QR code com o **Expo Go** no telemóvel (mesma rede Wi-Fi).

---

## 5. Depois de modificar código partilhado

Se alterares ficheiros em `packages/shared/src/`:

```bash
# Na raiz bisca61/
npm run build:shared
```

Reinicia também o servidor (Ctrl+C + `npm run dev:server`).

---

## 6. Regras do Jogo (resumo)

As regras completas estão dentro da app no botão **? Regras** no Lobby.

- **Objetivo:** chegar a 61+ pontos antes do adversário
- **Baralho:** 40 cartas, 4 naipes (Espadas, Paus, Copas, Ouros)
- **Força pretos (♠♣):** A · 5 · K · J · Q · 7 · 6 · 4 · 3 · 2
- **Força vermelhos (♥♦):** A · 5 · K · J · Q · 2 · 3 · 4 · 6 · 7
- **5 = Nova Manilha** (2ª carta mais forte, vale 10 pts)
- **Trunfo:** muda a cada onda seguindo a rotação Espadas → Copas → Ouros → Paus
- **Trocar 7:** se tiveres o 7 do naipe de trunfo atual, podes trocar pela carta de trunfo visível antes de jogar

---

## 7. Segurança

- Passwords com `bcryptjs` (10 rounds de salt)
- Sessões por token hex de 64 chars armazenado em memória no servidor
- Validação de input com `zod` em todas as rotas HTTP e eventos Socket.IO
- `viewFor()` envia apenas as cartas do próprio jogador — mãos alheias nunca são expostas
- `lastDrawn` revela a carta comprada brevemente (animação client-side) e é limpo na próxima jogada

---

## Resolução de problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| "O servidor demorou demasiado" | IP errado no `.env.local` | Verificar IP com `ipconfig`, atualizar `.env.local` e `.env.local` de PACKAGER_HOSTNAME |
| `java.io.IOException: failed to download` | Metro anuncia IP errado | Adicionar `REACT_NATIVE_PACKAGER_HOSTNAME=SEU_IP` ao `.env.local` e reiniciar Expo |
| `prisma db push` falha | Schema mudou com dados existentes | Usar `--force-reset` (atenção: apaga todos os dados) |
| `EPERM` no `prisma generate` | Servidor bloqueou o ficheiro DLL | Parar o servidor, correr `prisma generate`, reiniciar |
| Swap 7 não aparece | A carta de trunfo visível já foi comprada | Normal — o botão só aparece quando `trumpCard` está visível no monte |
| TS warning `ignoreDeprecations` | VS Code usa TS mais recente que o projeto | Ctrl+Shift+P → "TypeScript: Select TypeScript Version" → "Use Workspace Version" |
