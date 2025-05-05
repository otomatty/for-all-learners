```sql
create or replace function public.search_suggestions(query text)
returns table(type text, id uuid, suggestion text) as $$
with card_cte as (
  select
    'card'::text AS type,
    id,
    left(front_content::text, 100) AS suggestion
  from public.cards
  where front_content::text ilike '%'||query||'%'
     or back_content::text ilike '%'||query||'%'
  limit 5
),
page_cte as (
  select
    'page'::text AS type,
    id,
    title AS suggestion
  from public.pages
  where title ilike '%'||query||'%'
     or content_tiptap::text ilike '%'||query||'%'
  limit 5
)
select * from card_cte
union all
select * from page_cte;
$$ language sql stable;
```