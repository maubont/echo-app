-- 1. Permitir a los usuarios ver SIEMPRE su propia ubicación (incluso si está oculta)
-- Esto es CRÍTICO para que el "UPSERT" funcione correctamente.
create policy "Users can view own location"
  on user_locations for select
  using ( auth.uid() = user_id );

-- 2. Asegurar que la restricción de unicidad existe (por si acaso falló antes)
-- Si ya existe, esto dará error, pero es seguro ignorarlo.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_locations_user_id_key') then
    alter table user_locations add constraint user_locations_user_id_key unique (user_id);
  end if;
end $$;
