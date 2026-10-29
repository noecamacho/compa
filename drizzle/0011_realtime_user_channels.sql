-- T-081: Realtime Authorization for private user channels. A signed-in person may join only `user:<own users.id>`;
-- the server broadcasts with the service role, which bypasses RLS. Skipped on a Postgres without Supabase Realtime.
-- `users` has RLS with no policies, so the topic is resolved by a security definer function owned by the migrator.
DO $migration$
BEGIN
	IF to_regclass('realtime.messages') IS NULL OR to_regprocedure('auth.uid()') IS NULL OR to_regrole('authenticated') IS NULL THEN
		RETURN;
	END IF;
	EXECUTE $sql$
		CREATE OR REPLACE FUNCTION public.compa_own_user_topic() RETURNS text
		LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
		AS $fn$ SELECT 'user:' || u.id::text FROM public.users u WHERE u.auth_user_id = auth.uid() $fn$
	$sql$;
	REVOKE ALL ON FUNCTION public.compa_own_user_topic() FROM PUBLIC;
	IF to_regrole('anon') IS NOT NULL THEN
		REVOKE ALL ON FUNCTION public.compa_own_user_topic() FROM anon;
	END IF;
	GRANT EXECUTE ON FUNCTION public.compa_own_user_topic() TO authenticated;
	DROP POLICY IF EXISTS "compa: join own user channel" ON realtime.messages;
	CREATE POLICY "compa: join own user channel" ON realtime.messages FOR SELECT TO authenticated
		USING (realtime.messages.extension = 'broadcast' AND (SELECT realtime.topic()) = (SELECT public.compa_own_user_topic()));
END
$migration$;
