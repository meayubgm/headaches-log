-- 頭痛ログ 初期スキーマ

-- updated_at 自動更新トリガー関数
-- クライアントからの偽装更新を防ぎ、LWW（Last Write Wins）比較の信頼性を確保する
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- headache_types: 頭痛の種類マスタ（片頭痛/緊張型/群発/その他）。全ユーザーread-only
create table headache_types (
  id serial primary key,
  name text not null unique
);

insert into headache_types (name) values
  ('片頭痛'),
  ('緊張型'),
  ('群発'),
  ('その他');

alter table headache_types enable row level security;

create policy "headache_types are readable by everyone"
  on headache_types for select
  using (true);

-- headaches: 頭痛記録本体
create table headaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  pain_level smallint not null check (pain_level between 1 and 4),
  memo text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index headaches_user_id_updated_at_idx on headaches (user_id, updated_at);

alter table headaches enable row level security;

create trigger headaches_set_updated_at
  before update on headaches
  for each row execute function set_updated_at();

create policy "users can select own headaches"
  on headaches for select
  using (auth.uid() = user_id);

create policy "users can insert own headaches"
  on headaches for insert
  with check (auth.uid() = user_id);

create policy "users can update own headaches"
  on headaches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own headaches"
  on headaches for delete
  using (auth.uid() = user_id);

-- headache_headache_types: 頭痛記録と種類の中間テーブル（複数選択対応）
create table headache_headache_types (
  headache_id uuid not null references headaches(id) on delete cascade,
  headache_type_id int not null references headache_types(id) on delete cascade,
  primary key (headache_id, headache_type_id)
);

alter table headache_headache_types enable row level security;

create policy "users can select own headache_headache_types"
  on headache_headache_types for select
  using (exists (
    select 1 from headaches
    where headaches.id = headache_headache_types.headache_id
      and headaches.user_id = auth.uid()
  ));

create policy "users can insert own headache_headache_types"
  on headache_headache_types for insert
  with check (exists (
    select 1 from headaches
    where headaches.id = headache_headache_types.headache_id
      and headaches.user_id = auth.uid()
  ));

create policy "users can delete own headache_headache_types"
  on headache_headache_types for delete
  using (exists (
    select 1 from headaches
    where headaches.id = headache_headache_types.headache_id
      and headaches.user_id = auth.uid()
  ));

-- tags: 原因タグ・服薬タグ共通
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cause', 'medication')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tags enable row level security;

create trigger tags_set_updated_at
  before update on tags
  for each row execute function set_updated_at();

create policy "users can select own tags"
  on tags for select
  using (auth.uid() = user_id);

create policy "users can insert own tags"
  on tags for insert
  with check (auth.uid() = user_id);

create policy "users can update own tags"
  on tags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own tags"
  on tags for delete
  using (auth.uid() = user_id);

-- headache_tags: 頭痛記録とタグの中間テーブル
create table headache_tags (
  headache_id uuid not null references headaches(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (headache_id, tag_id)
);

alter table headache_tags enable row level security;

create policy "users can select own headache_tags"
  on headache_tags for select
  using (exists (
    select 1 from headaches
    where headaches.id = headache_tags.headache_id
      and headaches.user_id = auth.uid()
  ));

create policy "users can insert own headache_tags"
  on headache_tags for insert
  with check (exists (
    select 1 from headaches
    where headaches.id = headache_tags.headache_id
      and headaches.user_id = auth.uid()
  ));

create policy "users can delete own headache_tags"
  on headache_tags for delete
  using (exists (
    select 1 from headaches
    where headaches.id = headache_tags.headache_id
      and headaches.user_id = auth.uid()
  ));
