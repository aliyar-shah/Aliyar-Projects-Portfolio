-- This event-trigger function is intended to run only through its
-- database event trigger, never as a client-callable RPC.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
