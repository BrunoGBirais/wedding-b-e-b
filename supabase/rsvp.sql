-- Wizard de confirmação de presença (projeto Supabase: casamento-bruno-bianca)
-- Já aplicado via migrations "rsvp_wizard" e "rsvp_nao_vazar_nome". Mantido aqui como referência.
--
-- Resumo:
--   presentes      -> ganhou tipo ('amazon' | 'pix'), categoria, emoji, codigo_pix (= id do item em js/script.js)
--   confirmacoes   -> uma linha por confirmação (presente escolhido, consentimento)
--   convidados     -> uma linha por pessoa (nome, RG, titular), RG normalizado único
--   confirmar_presenca(p_titular, p_acompanhantes, p_presente_id, p_consentimento)
--       grava tudo e reserva o presente numa única transação; devolve {ok, erro, pessoa}
--   vw_lista_convidados -> lista para os noivos (sem acesso pelo site)
--
-- confirmacoes e convidados têm RLS ligado e nenhum acesso para anon/authenticated:
-- o site só consegue gravar pela função, nunca ler.

-- ============ Consultas úteis (SQL Editor do Supabase) ============

-- Lista completa de convidados (dá para exportar em CSV pelo painel):
-- select * from public.vw_lista_convidados;

-- Total de pessoas confirmadas:
-- select count(*) from public.convidados;

-- Cancelar uma confirmação (apaga as pessoas e libera o presente):
-- with c as (
--   delete from public.confirmacoes where id = '<UUID>' returning presente_id
-- )
-- update public.presentes set reservado = false, reservado_por = null, reservado_em = null
-- where id in (select presente_id from c);

-- Depois do casamento (LGPD): apagar todos os dados pessoais
-- delete from public.confirmacoes;   -- apaga convidados em cascata
-- update public.presentes set reservado_por = null;
