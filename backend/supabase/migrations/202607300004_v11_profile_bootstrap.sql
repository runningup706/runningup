-- V11 신규 계정에 최소 프로필과 My Runner를 안전하게 생성한다.
create or replace function private.bootstrap_new_runner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', '새 러너'), 24)
  )
  on conflict (user_id) do nothing;

  insert into public.my_runners (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.bootstrap_new_runner() from public, anon, authenticated;

create trigger on_auth_user_created_v11
after insert on auth.users
for each row execute function private.bootstrap_new_runner();

