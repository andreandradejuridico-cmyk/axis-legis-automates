
-- Função para listar todos os usuários (apenas admins)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, email text, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    COALESCE(
      (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = u.id ORDER BY ur.created_at DESC LIMIT 1),
      'user'
    ) as role,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Função para alterar o papel de um usuário (apenas admins)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores';
  END IF;

  IF new_role NOT IN ('admin','user') THEN
    RAISE EXCEPTION 'Papel inválido: %', new_role;
  END IF;

  -- Remove papéis existentes
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Insere o novo papel
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role::app_role);
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users() FROM public, anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
