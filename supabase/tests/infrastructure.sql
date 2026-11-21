do $$begin
  if not saais_private.valid('{"name":"Faculty"}', '{"$ref":"#/components/schemas/FacultyInsert"}') then raise exception 'valid faculty rejected'; end if;
  if saais_private.valid('{"name":"Faculty","actor_id":"spoof"}', '{"$ref":"#/components/schemas/FacultyInsert"}') then raise exception 'unknown property accepted'; end if;
  if saais_private.valid('{}', '{"$ref":"#/components/schemas/FacultyInsert"}') then raise exception 'missing name accepted'; end if;
  if saais_private.valid('{"decision":"rejected"}', '{"$ref":"#/components/schemas/CurriculumTransferDecisionRequest"}') then raise exception 'reasonless rejection accepted'; end if;
  if not saais_private.valid('{"decision":"approved"}', '{"$ref":"#/components/schemas/CurriculumTransferDecisionRequest"}') then raise exception 'approval rejected'; end if;
  if saais_private.valid('"2026-02-30"', '{"type":"string","format":"date"}') then raise exception 'invalid date accepted'; end if;
  if saais_private.valid('"2026-11-12T24:00:00Z"', '{"type":"string","format":"date-time"}') then raise exception 'invalid RFC3339 clock accepted'; end if;
  if not saais_private.valid('0', '{"type":"number","minimum":0,"multipleOf":0.25}') then raise exception 'zero unit slot rejected'; end if;
  if saais_private.valid('0.3', '{"type":"number","minimum":0,"multipleOf":0.25}') then raise exception 'fractional unit accepted'; end if;
  begin perform saais_private.actor(); raise exception 'anonymous allowed'; exception when sqlstate 'PT401' then null; end;
end$$;
