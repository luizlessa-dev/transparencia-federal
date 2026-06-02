// eslint.config.js — ESLint flat config (v9+)
//
// Propósito único: guard-rail do paywall (Passo 4).
// Não ativa regras de estilo nem impede o build — só falha quando uma página em
// app/ importa supabase-server diretamente em vez de passar pelo DAL (dal.ts).
//
// Regra: todo acesso ao banco sensível deve fluir por src/lib/dal.ts.
// - dal.ts importa supabase-server → ok (é o portão)
// - src/services/* importam supabase-server → ok (services são internos ao DAL)
// - app/**  importam supabase-server → PROIBIDO (viola defesa-em-profundidade)
//
// Para adicionar um import proibido no futuro: inclua em `paths` abaixo.

import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    // Carrega o plugin Next para que @next/next/no-img-element seja reconhecido
    // (sem ele o ESLint reporta "Definition for rule X was not found" como erro).
    // A regra fica desabilitada: queremos apenas o guard-rail de supabase-server.
    plugins: { "@next/next": nextPlugin },
    rules: { "@next/next/no-img-element": "off" },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  {
    // Fluxos de auth/conta importam supabase-server por design — excluir da regra.
    // São: login, cadastro, logout, ativar, conta, auth/confirm.
    ignores: [
      // Fluxos de auth/conta — importam supabase-server por design (são a camada de auth).
      "app/ativar/**",
      "app/conta/**",
      "app/login/**",
      "app/cadastro/**",
      "app/logout/**",
      "app/auth/**",
      // Páginas já 100% corretas pelo DAL + opengraph — não precisam desta regra.
      "app/dossie/**",
      "app/parlamentares/**",
    ],
  },
  {
    // Aplica SOMENTE a arquivos em app/ — services e lib ficam livres.
    files: ["app/**/*.ts", "app/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      // Suprime regras @next/next/* que só estão disponíveis quando o plugin Next
      // está carregado (não faz parte desta config mínima de guard-rail).
      "@next/next/no-img-element": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "~/lib/supabase-server",
              message:
                "app/ não deve importar supabase-server diretamente. " +
                "Use funções do DAL (~/lib/dal.ts) que já aplicam o corte de paywall. " +
                "Ver: packages/web/src/lib/dal.ts",
            },
          ],
          // Padrão que capta tanto '~/lib/supabase-server' quanto caminhos relativos
          // que levem ao mesmo arquivo (ex: ../../src/lib/supabase-server).
          patterns: [
            {
              regex: "(\\.\\.[\\/])*src[\\/]lib[\\/]supabase-server",
              message:
                "app/ não deve importar supabase-server diretamente. " +
                "Use o DAL (~/lib/dal.ts).",
            },
          ],
        },
      ],
    },
  },
];
