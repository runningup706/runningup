-- 클라이언트의 성장 위조와 친구 상태 위조를 막고 공개 쓰기를 최소 열로 제한한다.
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists my_runners_insert_own on public.my_runners;
drop policy if exists friendships_update_participant on public.friendships;

revoke insert on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, visibility) on public.profiles to authenticated;

revoke insert on public.my_runners from authenticated;
revoke update on public.my_runners from authenticated;
grant update (appearance) on public.my_runners to authenticated;

revoke insert, update on public.friendships from authenticated;
grant insert (requester_id, addressee_id, status)
  on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

revoke insert, update on public.crews from authenticated;
grant insert (owner_id, name) on public.crews to authenticated;
grant update (name) on public.crews to authenticated;

create policy friendships_update_status_participant
on public.friendships for update to authenticated
using ((select auth.uid()) in (requester_id, addressee_id))
with check (
  (
    (select auth.uid()) = addressee_id
    and status in ('accepted', 'blocked')
  )
  or
  (
    (select auth.uid()) = requester_id
    and status = 'blocked'
  )
);

create or replace function private.validate_friendship_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if current_user = 'service_role' then
    return new;
  end if;

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if new.requester_id is distinct from old.requester_id
    or new.addressee_id is distinct from old.addressee_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'FRIENDSHIP_IDENTIFIERS_IMMUTABLE' using errcode = '42501';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status = 'pending'
    and new.status = 'accepted'
    and v_user_id = old.addressee_id
  then
    return new;
  end if;

  if old.status in ('pending', 'accepted')
    and new.status = 'blocked'
    and v_user_id in (old.requester_id, old.addressee_id)
  then
    return new;
  end if;

  raise exception 'FRIENDSHIP_TRANSITION_DENIED' using errcode = '42501';
end;
$$;

revoke all on function private.validate_friendship_transition()
  from public, anon, authenticated;

create trigger friendship_transition_guard
before update on public.friendships
for each row execute function private.validate_friendship_transition();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at()
  from public, anon, authenticated;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger my_runners_touch_updated_at
before update on public.my_runners
for each row execute function private.touch_updated_at();
