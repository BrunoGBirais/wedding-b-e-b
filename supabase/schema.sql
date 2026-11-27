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


-- 1. Remove os 2 itens que saíram da lista (desde que não tenham sido reservados)
DELETE FROM presentes 
WHERE tipo = 'amazon' 
  AND reservado = false 
  AND (
    nome ILIKE '%Conjunto de 6 Taças em Vidro%'
    OR nome ILIKE '%Porta Chaves de Parede com Prateleira 3 Pinos%'
  );

-- 2. Atualiza os preços que mudaram nos itens antigos que já estavam no banco
UPDATE presentes SET preco = NULL WHERE tipo = 'amazon' AND nome ILIKE '%Porto Brasil Conjunto com 6 Pratos de Sobremesa%';
UPDATE presentes SET preco = NULL WHERE tipo = 'amazon' AND nome ILIKE '%BEM CASA Jogo de Lençol%';
UPDATE presentes SET preco = 84.61 WHERE tipo = 'amazon' AND nome ILIKE '%Jogo de 6 Copos Altos Libélula%';
UPDATE presentes SET preco = 121.05 WHERE tipo = 'amazon' AND nome ILIKE '%Coberdrom Sherpa%';
UPDATE presentes SET preco = 25.67 WHERE tipo = 'amazon' AND nome ILIKE '%Appel Home Toalha de Rosto%';
UPDATE presentes SET preco = 156.41 WHERE tipo = 'amazon' AND nome ILIKE '%Tramontina Panela de Pressão Vancouver%';

-- 3. Insere os 33 novos itens com links oficiais e fotos em alta resolução (500px)
INSERT INTO presentes (nome, preco, link_amazon, imagem, reservado, tipo) VALUES
('Kit Duo Mantas Piquet Favinho 60% Algodão com Franja de Algodão Kit 2 Mantas, Kaki Escuro', 126.90, 'https://www.amazon.com.br/dp/B0H7K6CJXP/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/31QBo3bdR3L._SL500_.jpg', false, 'amazon'),
('PJLZJFBY Capas felpudas de sofá para cães, antiderrapante, grossa, para sofá, lavável, macia, compatível com animais de estimação (1 peça, verde, 70 x 150 cm)', 172.91, 'https://www.amazon.com.br/dp/B0GWGS8GSK/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51gkOnFSVqL._SL500_.jpg', false, 'amazon'),
('Capa de Almofada Jacquard 45x45 cm Kit 4 Peças Relevo Decorativo Cinza | Tecido 100% Poliéster, Fechamento Transpasse Estilo Envelope sem Zíper, Acabamento Sofisticado para sua Decoração', 34.49, 'https://www.amazon.com.br/dp/B0HK16JSDB/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41Rvs8YO4WL._SL500_.jpg', false, 'amazon'),
('Kit 4 Capas de Almofadas Decorativas Para Sofá Folhagens Boho Zíper Invisível 40x40', 49.90, 'https://www.amazon.com.br/dp/B0HFBF6YB7/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/514LHXfvViL._SL500_.jpg', false, 'amazon'),
('Armário Multiuso com Rodinhas 2 Portas para Lavanderia | Armário compacto com 2 portas, prateleira interna e rodinhas, ideal para lavanderia, quarto ou escritório.', 219.66, 'https://www.amazon.com.br/dp/B0HND69MX5/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41CYnflAVfL._SL500_.jpg', false, 'amazon'),
('BEMMY 24 Kit Jogo de Talheres, Talheres de aço inoxidável，Caixa de Presente Luxuosa para Talheres, Faca, Garfo e Colher,Jogo Faqueiro Conjunto Aço Inox Luxo Jogo (Prata)', 80.18, 'https://www.amazon.com.br/dp/B0DSFYNB4X/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51nIDpw0PqL._SL500_.jpg', false, 'amazon'),
('Estante para Livros com Base com gavetas, Estante Livreiro Giratória 360 Graus, Estánte Giratória com 5 Andares, Estanté Livros com Destacável Nichós, Livreiro Estánte Livrós', 999.99, 'https://www.amazon.com.br/dp/B0H1H58VVD/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51rKK3CH-GL._SL500_.jpg', false, 'amazon'),
('Carrinho Organizador 5 Andares Multiuso De Canto Com Rodinhas Para Cozinha Banheiro 5 Prateleiras Z Zess', 78.99, 'https://www.amazon.com.br/dp/B0HHBZ6ZJV/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/4172lckPoML._SL500_.jpg', false, 'amazon'),
('Carrinho Utilitário TOOLF, 3 Níveis, de Metal com Rodízios, Preto | 3 ganchos, montagem sem parafusos, organizador de carrinho para banheiro, cozinha, escritório, berçário, dormitório', 189.90, 'https://www.amazon.com.br/dp/B0B8FZBP9R/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/516kKe9yh-L._SL500_.jpg', false, 'amazon'),
('Jogo de Panelas 8 Peças Titanium Exclusive Antiaderente Ceramic Bkza by MTA - Conjunto de Panelas Fundo Triplo - 5mm de Espessura - Com Caçarolas Panela Frigideiras - Ideal para Grandes Famílias', 1849.00, 'https://www.amazon.com.br/dp/B0CG2M69ZN/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41xWcmtOLcL._SL500_.jpg', false, 'amazon'),
('Ducha Chuveiro 20x20 Slim Inox Com Braço 40cm Solar Gás', 109.90, 'https://www.amazon.com.br/dp/B0GTZWG3X5/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/21diJdhKb4L._SL500_.jpg', false, 'amazon'),
('Chuveiro Ducha Gás Solar Inox 20x20 cm Com Desviador e Ducha Quadrado Preto Fosco', 184.00, 'https://www.amazon.com.br/dp/B0H2JD7VMW/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/31FKK1Oe+gL._SL500_.jpg', false, 'amazon'),
('Jogo de Toalhas 4 peças Luxo Confort 100% Algodão Banhão 500g/m² Grossa Macias, Felpudas e Alta Absorção Sarah Enxovais - 2 Banhão + 2 Rosto (Branca)', 134.86, 'https://www.amazon.com.br/dp/B0GG4TSC1J/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/313usLoHF3L._SL500_.jpg', false, 'amazon'),
('Echo Dot Smart speaker com Alexa, som vibrante e potente, Wi-Fi e Bluetooth | Cor Branca, com Acesso Antecipado à Alexa+', 289.00, 'https://www.amazon.com.br/dp/B09B8XVSDP/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51OiVQzj4HL._SL500_.jpg', false, 'amazon'),
('Sapateira com porta, sapateira de 9 prateleiras para 36 pares de sapatos | organizador alto para sapatos, design compacto para economizar espaço, para entrada, corredor', 239.99, 'https://www.amazon.com.br/dp/B0GVRSBQGH/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41eseT-qyuL._SL500_.jpg', false, 'amazon'),
('Varal de Parede Retratil Aluminio Reforçado 20 metros Cabo De Aço Com Kit Instalação (Suporta 80kg)', 69.90, 'https://www.amazon.com.br/dp/B0FZ6G98X8/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51b9kUDFXrL._SL500_.jpg', false, 'amazon'),
('Varal de Chão Dobrável em Aço com Abas Retrátil Suporta 30kg Branco', 99.90, 'https://www.amazon.com.br/dp/B0GW9M3X8C/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41leKncWfXL._SL500_.jpg', false, 'amazon'),
('Ariete Torradeira 155 estilo vintage 750 Watt 2 fatias com bagel de degelo e reaquecimento, laterais de toque legais, pés antiderrapantes, 6 níveis de marrom, verde', 469.00, 'https://www.amazon.com.br/dp/B01MQIXEUP/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41LlbT-aXLL._SL500_.jpg', false, 'amazon'),
('Ariete 583, Liquidificador Vintage Verde, Copo de Vidro 1.5 L, 4 Lâminas de Aço Inoxidável, 4 Velocidades + Pulso, 1000 Wats - 220V', 584.00, 'https://www.amazon.com.br/dp/B092DV7365/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/31ATPFtDLSL._SL500_.jpg', false, 'amazon'),
('AROMA Mini panela de arroz, 2 xícaras (não cozidas) / 4 xícaras (cozidas), panela de feijão, sopa, panela de aveia, mantém aquecido automaticamente, 1 litro, verde claro', 314.60, 'https://www.amazon.com.br/dp/B0CZGNLJZB/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/315v5pmj-5L._SL500_.jpg', false, 'amazon'),
('Escorredor de Louças Cromado 13 Pratos com Suporte para Copos – Resistente, Antiferrugem e Prático - Premium', 39.89, 'https://www.amazon.com.br/dp/B0G4F9D4YB/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51ZkZEp7CtL._SL500_.jpg', false, 'amazon'),
('Kit 5 Potes Para Mantimentos Café Açucar Sal Sal Grosso Leite em Pó Chocolate em Pó 1,15 Litros Porta Mantimentos Hermético com Tampa', 69.90, 'https://www.amazon.com.br/dp/B0HJ6HH7HY/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51gxmSeHwfL._SL500_.jpg', false, 'amazon'),
('Potes Herméticos de Vidro com Tampa de Bambu 1200ml Conjunto com 2 Unidades para Café e Açúcar Transparente', 56.90, 'https://www.amazon.com.br/dp/B0FM6FQG5N/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41wY6Ej0fDL._SL500_.jpg', false, 'amazon'),
('Kit Latas Café e Açúcar Classic Metal Preto e Dourado 13x11cm Premium', 54.80, 'https://www.amazon.com.br/dp/B0H4DJV4QS/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41AG6cHFj8L._SL500_.jpg', false, 'amazon'),
('Tramontina Aparelho de Jantar Floralis em Porcelana Decorada 20 Peças', 218.49, 'https://www.amazon.com.br/dp/B0DJDR74JX/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41H6yi8gw8L._SL500_.jpg', false, 'amazon'),
('Aparelho De Jantar 16 Peças Opaline Atlantis Pratos Tigelas Branco Azul | Conjunto completo para 4 pessoas, Jogo com 4 pratos rasos, 4 fundos, 4 sobremesa e 4 bowls. Elegante para mesa posta', 194.90, 'https://www.amazon.com.br/dp/B0HFTDL85C/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51pwxl6IXcL._SL500_.jpg', false, 'amazon'),
('Conjunto de 7 Facas Profissionais em Aço Inoxidável 3CR13, Ultra Afiadas (V-Sharp 15°), Lâminas Inteiriças, Antiferrugem, Design Ergonômico – Inclui Chef, Pão e Churrasco – Garantia de 10 Anos', 107.09, 'https://www.amazon.com.br/dp/B0GXP3YGLT/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51SqhjPRACL._SL500_.jpg', false, 'amazon'),
('Kit 8 Peças Tábua de Corte Bambu e Utensílios Cozinha com Pilão Socador | Conjunto para Cozinha com Tábua 32x22x1,5cm, Suporte e Utensílios em Bambu + Pilão com Socador em Madeira', 65.90, 'https://www.amazon.com.br/dp/B0HK1Z99Z8/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41Ci3hHc8AL._SL500_.jpg', false, 'amazon'),
('Kit 2 Tábuas de Corte em Bambu 33x24cm Resistentes Ecológicas e Antibacterianas Ideal para Carnes Legumes e Cozinha Doméstica', 46.90, 'https://www.amazon.com.br/dp/B0FVQK7N5P/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/31UwQMhzuJL._SL500_.jpg', false, 'amazon'),
('Jogo de Panelas com 5 Peças Cor Esmeralda em Alumínio e Tampa de Vidro | Tampa de Vidro, 5 Peças, Alumínio', 379.05, 'https://www.amazon.com.br/dp/B0HM9GQB1C/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/51BY9J3UdRL._SL500_.jpg', false, 'amazon'),
('Porta Chaves Cabideiro C/Prateleira Pendurador De Parede', 103.97, 'https://www.amazon.com.br/dp/B0HKSLMNCM/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/411mVyQQXnL._SL500_.jpg', false, 'amazon'),
('Kit 2 Travesseiros King 90x50 Cm Toque De Pluma Firme E Macio – Alto, Antialérgico, Antiácaro, Lavável, Ideal Para Dormir De Lado Ou Costas, Conforto Premium Casa Paulinha', 80.15, 'https://www.amazon.com.br/dp/B0F7JTLC19/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/41UKFKuMvVL._SL500_.jpg', false, 'amazon'),
('Porto Brasil Conjunto com 6 Xícaras de Café com Pires Bio Stoneware Campestre 120ml', 148.90, 'https://www.amazon.com.br/dp/B09WNM26JC/', 'https://m.media-amazon.com/images/W/BW_MEDIAX_AVIF_MEASUREMENT_1306696-T4/images/I/31I80JjqGAL._SL500_.jpg', false, 'amazon');