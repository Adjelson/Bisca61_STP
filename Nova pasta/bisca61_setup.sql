-- =============================================
--  BISCA 61 - Base de Dados v2
--  Execute no phpMyAdmin → base "bisca61"
-- =============================================
CREATE DATABASE IF NOT EXISTS bisca61 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bisca61;

CREATE TABLE IF NOT EXISTS utilizadores (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(24) NOT NULL UNIQUE,
  avatar     INT NOT NULL DEFAULT 1,
  match_pts  INT NOT NULL DEFAULT 0,
  vitorias   INT NOT NULL DEFAULT 0,
  derrotas   INT NOT NULL DEFAULT 0,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessoes (
  token     VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id   INT NOT NULL,
  username  VARCHAR(24) NOT NULL,
  avatar    INT NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS salas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(6) NOT NULL UNIQUE,
  num_jogadores INT NOT NULL DEFAULT 4,
  estado        ENUM('aguardando','jogando','fim') NOT NULL DEFAULT 'aguardando',
  host_id       INT NOT NULL DEFAULT 0,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jogadores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sala_codigo VARCHAR(6) NOT NULL,
  user_id     INT NOT NULL,
  username    VARCHAR(24) NOT NULL,
  avatar      INT NOT NULL DEFAULT 1,
  slot        INT NOT NULL,
  UNIQUE KEY uniq_slot (sala_codigo, slot),
  INDEX idx_sala (sala_codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estado_jogo (
  sala_codigo VARCHAR(6) NOT NULL PRIMARY KEY,
  estado_json MEDIUMTEXT NOT NULL,
  atualizado  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
