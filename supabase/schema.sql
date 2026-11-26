-- Schema da lista de presentes da Amazon (projeto Supabase: casamento-bruno-bianca)
-- Já aplicado via migration "create_presentes". Mantido aqui como referência.

create table public.presentes (
  id            bigint generated always as identity primary key,
  nome          text not null,
  preco         numeric(10,2),
  asin          text unique,
  link_amazon   text not null,
  imagem        text,
  reservado     boolean not null default false,
  reservado_por text,
  reservado_em  timestamptz,
  criado_em     timestamptz not null default now()
);

alter table public.presentes enable row level security;

-- Visitantes só leem; nenhuma policy de insert/update/delete.
create policy "presentes visiveis para todos"
  on public.presentes for select
  to anon, authenticated
  using (true);

-- Esconde quem reservou: só colunas públicas podem ser lidas.
revoke all on public.presentes from anon, authenticated;
grant select (id, nome, preco, asin, link_amazon, imagem, reservado)
  on public.presentes to anon, authenticated;

-- Reserva atômica: só marca se ainda estiver livre. Retorna false se já reservado.
create or replace function public.reservar_presente(p_id bigint, p_nome text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := btrim(coalesce(p_nome, ''));
begin
  if length(v_nome) < 2 or length(v_nome) > 80 then
    raise exception 'Informe um nome entre 2 e 80 caracteres';
  end if;

  update public.presentes
     set reservado = true,
         reservado_por = v_nome,
         reservado_em = now()
   where id = p_id
     and reservado = false;

  return found;
end;
$$;

revoke execute on function public.reservar_presente(bigint, text) from public;
grant execute on function public.reservar_presente(bigint, text) to anon, authenticated;

-- Para liberar uma reserva (no SQL Editor do Supabase):
-- update public.presentes set reservado = false, reservado_por = null, reservado_em = null where id = <ID>;
