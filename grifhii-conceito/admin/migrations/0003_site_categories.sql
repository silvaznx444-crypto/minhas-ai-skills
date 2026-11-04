-- Categorias iguais às do site público (o "tipo de produto" na Shopify define a categoria no site).
-- Só acrescenta; as existentes não mudam. "Bonés" aparece no site em Acessórios; "Jeans" em Calças; "Shorts" em Bermudas.
INSERT OR IGNORE INTO categories (slug,label,shopify_product_type,sort_order,created_at) VALUES
  ('calcas','Calças','Calças',8,0),
  ('conjuntos','Conjuntos','Conjuntos',9,0),
  ('moletons','Moletons','Moletons',10,0),
  ('esportivo','Esportivo','Esportivo',11,0),
  ('calcados','Calçados','Calçados',12,0),
  ('cintos','Cintos','Cintos',13,0),
  ('acessorios','Acessórios','Acessórios',14,0);
