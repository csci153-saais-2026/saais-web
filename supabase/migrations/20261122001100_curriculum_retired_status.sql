-- The frozen contract includes retired alongside draft, active, teach-out and closed.
alter type public.curriculum_version_status add value if not exists 'retired';
