-- V11 공개 스키마의 행 접근과 클라이언트 쓰기 범위를 최소 권한으로 잠근다.
create or replace function private.can_view_runner(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles as profile
      where profile.user_id = target_user_id
        and (
          profile.visibility = 'public'
          or (
            profile.visibility = 'friends'
            and exists (
              select 1
              from public.friendships as friendship
              where friendship.status = 'accepted'
                and (
                  (friendship.requester_id = target_user_id
                    and friendship.addressee_id = (select auth.uid()))
                  or
                  (friendship.addressee_id = target_user_id
                    and friendship.requester_id = (select auth.uid()))
                )
            )
          )
          or (
            profile.visibility = 'crew'
            and exists (
              select 1
              from public.crew_memberships as target_membership
              join public.crew_memberships as viewer_membership
                on viewer_membership.crew_id = target_membership.crew_id
              where target_membership.user_id = target_user_id
                and viewer_membership.user_id = (select auth.uid())
            )
          )
        )
    );
$$;

revoke all on function private.can_view_runner(uuid) from public;
grant execute on function private.can_view_runner(uuid) to authenticated;

create policy profiles_select_visible
on public.profiles for select to authenticated
using ((select private.can_view_runner(user_id)));

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy my_runners_select_visible
on public.my_runners for select to authenticated
using ((select private.can_view_runner(user_id)));

create policy my_runners_insert_own
on public.my_runners for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy my_runners_update_own
on public.my_runners for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy friendships_select_participant
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_insert_requester
on public.friendships for insert to authenticated
with check (
  (select auth.uid()) = requester_id
  and status = 'pending'
);

create policy friendships_update_participant
on public.friendships for update to authenticated
using ((select auth.uid()) in (requester_id, addressee_id))
with check ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_delete_participant
on public.friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy crews_select_member
on public.crews for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.crew_memberships as membership
    where membership.crew_id = id
      and membership.user_id = (select auth.uid())
  )
);

create policy crews_insert_owner
on public.crews for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy crews_update_owner
on public.crews for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy crews_delete_owner
on public.crews for delete to authenticated
using (owner_id = (select auth.uid()));

create policy crew_memberships_select_member
on public.crew_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.crew_memberships as viewer
    where viewer.crew_id = crew_id
      and viewer.user_id = (select auth.uid())
  )
);

create policy world_progress_select_visible
on public.world_progress for select to authenticated
using ((select private.can_view_runner(user_id)));

create policy monthly_apex_select_visible
on public.monthly_apex for select to authenticated
using ((select private.can_view_runner(user_id)));

create policy daily_contracts_select_own
on public.daily_run_contracts for select to authenticated
using (user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.my_runners, public.friendships,
  public.crews, public.crew_memberships, public.world_progress,
  public.monthly_apex, public.daily_run_contracts,
  public.my_verified_run_summary to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert on public.my_runners to authenticated;
grant update (appearance, updated_at) on public.my_runners to authenticated;
grant insert, update, delete on public.friendships to authenticated;
grant insert, update, delete on public.crews to authenticated;

revoke insert, update, delete on public.world_progress,
  public.monthly_apex, public.daily_run_contracts from anon, authenticated;
revoke insert, update, delete on public.my_verified_run_summary
  from anon, authenticated;

