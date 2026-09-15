insert into public.user_roles (user_id, role)
values ('51656db5-a512-441b-ac7b-dd7165b92523', 'admin')
on conflict (user_id, role) do nothing;