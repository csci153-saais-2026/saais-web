-- Deferred constraints can run after the calling SECURITY DEFINER RPC returns.
-- Validate under the trigger owner's privileges when PostgREST commits as the caller.
alter function saais_private.matt_check_adviser_continuity() security definer;
