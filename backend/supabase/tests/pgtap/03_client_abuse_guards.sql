-- V11 클라이언트가 성장과 친구 관계를 위조하지 못하는지 실제 권한으로 검증한다.
begin;
select plan(8);

insert into auth.users (id, raw_user_meta_data)
values
  (
    '22222222-2222-4222-8222-222222222222',
    '{"display_name":"요청 러너"}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '{"display_name":"수신 러너"}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '{"display_name":"위조 시도 러너"}'::jsonb
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

insert into public.friendships (requester_id, addressee_id, status)
values (
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'pending'
);

select is(
  (select count(*)::integer from public.friendships),
  1,
  'requester can create one pending request'
);
select throws_ok(
  $$update public.friendships set status = 'accepted'
    where requester_id = '22222222-2222-4222-8222-222222222222'
      and addressee_id = '33333333-3333-4333-8333-333333333333'$$,
  '42501',
  'FRIENDSHIP_TRANSITION_DENIED',
  'requester cannot accept own request'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select lives_ok(
  $$update public.friendships set status = 'accepted'
    where requester_id = '22222222-2222-4222-8222-222222222222'
      and addressee_id = '33333333-3333-4333-8333-333333333333'$$,
  'addressee can accept pending request'
);
select is(
  (
    select status
    from public.friendships
    where requester_id = '22222222-2222-4222-8222-222222222222'
      and addressee_id = '33333333-3333-4333-8333-333333333333'
  ),
  'accepted',
  'accepted friendship is stored'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select throws_ok(
  $$update public.friendships set status = 'pending'
    where requester_id = '22222222-2222-4222-8222-222222222222'
      and addressee_id = '33333333-3333-4333-8333-333333333333'$$,
  '42501',
  'FRIENDSHIP_TRANSITION_DENIED',
  'participant cannot reopen an accepted request'
);

reset role;
delete from public.my_runners
where user_id = '44444444-4444-4444-8444-444444444444';
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);
select throws_like(
  $$insert into public.my_runners (
      user_id, lifetime_verified_m, runner_growth_points
    ) values (
      '44444444-4444-4444-8444-444444444444', 1000000, 999999
    )$$,
  '%permission denied%',
  'client cannot recreate My Runner with forged growth'
);
select throws_like(
  $$update public.profiles
    set created_at = '2000-01-01 00:00:00+00'
    where user_id = '44444444-4444-4444-8444-444444444444'$$,
  '%permission denied%',
  'client cannot rewrite profile creation time'
);
select lives_ok(
  $$update public.profiles
    set display_name = '정상 변경'
    where user_id = '44444444-4444-4444-8444-444444444444'$$,
  'client can update allowed profile field'
);

select * from finish();
rollback;
