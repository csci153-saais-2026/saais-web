create function saais_private.referenced(entity text, entity_id uuid, ignored text[] default '{}') returns boolean
language plpgsql stable set search_path=pg_catalog,public as $$
declare fk record; hit boolean;
begin
  for fk in select c.conrelid::regclass as child,a.attname as column_name
    from pg_constraint c cross join lateral unnest(c.conkey,c.confkey) keys(child_key,parent_key)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=keys.child_key
    join pg_attribute p on p.attrelid=c.confrelid and p.attnum=keys.parent_key
    where c.contype='f' and c.confrelid=to_regclass('public.'||entity) and p.attname='id'
      and not c.conrelid=any(select to_regclass('public.'||i) from unnest(ignored) i)
  loop
    execute format('select exists(select 1 from %s where %I=$1)',fk.child,fk.column_name) into hit using entity_id;
    if hit then return true; end if;
  end loop;
  return false;
end $$;
create function saais_private.department_of(entity text, row_data jsonb) returns uuid
language plpgsql stable set search_path=pg_catalog,public as $$
declare department uuid;
begin
  if entity in ('course','program') then return (row_data->>'department_id')::uuid;
  elsif entity='curriculum_version' then select p.department_id into department from public.program p where p.id=(row_data->>'program_id')::uuid;
  elsif entity='curriculum_term' then select p.department_id into department from public.curriculum_version v join public.program p on p.id=v.program_id where v.id=(row_data->>'curriculum_version_id')::uuid;
  elsif entity='curriculum_term_course' then select p.department_id into department from public.curriculum_term t join public.curriculum_version v on v.id=t.curriculum_version_id join public.program p on p.id=v.program_id where t.id=(row_data->>'curriculum_term_id')::uuid;
  elsif entity='prerequisite' or entity='course_offering' then select c.department_id into department from public.course c where c.id=(row_data->>'course_id')::uuid;
  end if;
  if department is null then perform saais_private.fail(409,'The parent academic record does not exist.'); end if;
  return department;
end $$;
create function saais_private.write_row(entity text, entity_id uuid, payload jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare columns text; expressions text; result jsonb;
begin
  -- Entity names originate only in the catalog dispatch allowlist below.
  select string_agg(format('%I',key),',' order by key),string_agg(format('r.%I',key),',' order by key)
    into columns,expressions from jsonb_object_keys(payload) key;
  if entity_id is null then
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning to_jsonb(%I.*)',entity,columns,expressions,entity,entity) into result using payload;
  else
    execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1) r) where t.id=$2 returning to_jsonb(t.*)',entity,columns,expressions,entity) into result using payload,entity_id;
  end if;
  return result;
end $$;
create function saais_private.total(version uuid) returns void language plpgsql set search_path=pg_catalog,public as $$
begin
  update public.curriculum_version v set total_units=(select coalesce(sum(s.nominal_units),0)
    from public.curriculum_term t join public.curriculum_term_course s on s.curriculum_term_id=t.id where t.curriculum_version_id=version) where v.id=version;
end $$;
create function saais_private.slot(term uuid, payload jsonb) returns jsonb language plpgsql set search_path=pg_catalog,public as $$
declare result jsonb;
begin
  if coalesce((payload->>'is_elective_slot')::boolean,false) then
    if payload->>'slot_type' is not null and payload->>'slot_type' not in ('elective','ge') then perform saais_private.fail(400,'An elective slot must have elective or GE type.'); end if;
    payload:=jsonb_build_object('slot_type','elective')||payload;
  elsif payload->>'slot_type'='elective' then perform saais_private.fail(400,'A fixed slot cannot have elective type.'); end if;
  result:=saais_private.write_row('curriculum_term_course',null,payload||jsonb_build_object('curriculum_term_id',term));
  return result;
end $$;
create function saais_private.definition(program uuid, payload jsonb) returns jsonb language plpgsql set search_path=pg_catalog,public as $$
declare version jsonb; term jsonb; t jsonb; slot jsonb;
begin
  version:=saais_private.write_row('curriculum_version',null,(payload-'terms')||jsonb_build_object('program_id',program));
  for t in select * from jsonb_array_elements(coalesce(payload->'terms','[]')) loop
    term:=saais_private.write_row('curriculum_term',null,(t-'slots')||jsonb_build_object('curriculum_version_id',version->>'id'));
    for slot in select * from jsonb_array_elements(t->'slots') loop perform saais_private.slot((term->>'id')::uuid,slot); end loop;
  end loop;
  perform saais_private.total((version->>'id')::uuid);
  select to_jsonb(v) into version from public.curriculum_version v where v.id=(version->>'id')::uuid;
  return version;
end $$;

create function saais_private.catalog(operation text, params jsonb, body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
#variable_conflict use_variable
declare entity text; verb text; id uuid:=(params->>'id')::uuid; before_row jsonb; after_row jsonb;
  data jsonb:=body; parent uuid; version uuid; child record; t jsonb; s jsonb; term jsonb; source uuid; department uuid;
begin
  select case operation
    when 'createFaculty' then 'faculty' when 'updateFaculty' then 'faculty' when 'deleteFaculty' then 'faculty'
    when 'createDepartment' then 'department' when 'updateDepartment' then 'department' when 'deleteDepartment' then 'department'
    when 'createProgram' then 'program' when 'updateProgram' then 'program' when 'deleteProgram' then 'program'
    when 'createCurriculumVersion' then 'curriculum_version' when 'updateCurriculumVersion' then 'curriculum_version' when 'deleteCurriculumVersion' then 'curriculum_version'
    when 'createCurriculumTerm' then 'curriculum_term' when 'updateCurriculumTerm' then 'curriculum_term' when 'deleteCurriculumTerm' then 'curriculum_term'
    when 'createCurriculumTermCourse' then 'curriculum_term_course' when 'updateCurriculumTermCourse' then 'curriculum_term_course' when 'deleteCurriculumTermCourse' then 'curriculum_term_course'
    when 'createCourse' then 'course' when 'updateCourse' then 'course' when 'deleteCourse' then 'course'
    when 'createPrerequisite' then 'prerequisite' when 'deletePrerequisite' then 'prerequisite'
    when 'createSchoolTerm' then 'school_term' when 'updateSchoolTerm' then 'school_term'
    when 'createCourseOffering' then 'course_offering' when 'updateCourseOffering' then 'course_offering' when 'deleteCourseOffering' then 'course_offering'
    when 'createCurriculumPairEquivalence' then 'curriculum_pair_equivalence' when 'deleteCurriculumPairEquivalence' then 'curriculum_pair_equivalence'
    end into entity;
  if entity is null then perform saais_private.fail(404,'Catalog operation not found.'); end if;
  verb:=case when operation like 'create%' then 'create' when operation like 'update%' then 'update' else 'delete' end;
  if id is not null then
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',entity) into before_row using id;
    if before_row is null then perform saais_private.fail(404,'Catalog record not found.'); end if;
    data:=before_row||body;
  end if;
  if entity in ('faculty','department','program') then
    perform saais_private.require_scope(array['admin']);
  elsif entity='school_term' then
    perform saais_private.require_scope(array['admin','department_head','department_staff']);
    if body ? 'is_locked' and not saais_private.has_role('admin') and
      ((verb='create' and (body->>'is_locked')::boolean) or (verb='update' and body->'is_locked' is distinct from before_row->'is_locked')) then
      perform saais_private.fail(403,'Only Admin may change the institution lock.'); end if;
  elsif entity='curriculum_pair_equivalence' then
    for child in select v.id,p.department_id from public.curriculum_version v join public.program p on p.id=v.program_id
      where v.id in ((data->>'from_curriculum_version_id')::uuid,(data->>'to_curriculum_version_id')::uuid) order by v.id for update of v
    loop perform saais_private.require_scope(array['admin','department_head'],child.department_id); end loop;
    if (select count(*) from public.curriculum_version cv where cv.id in ((data->>'from_curriculum_version_id')::uuid,(data->>'to_curriculum_version_id')::uuid))<>2 then
      perform saais_private.fail(409,'Two distinct curriculum versions are required.'); end if;
    if not exists(select 1 from public.curriculum_term t join public.curriculum_term_course s on s.curriculum_term_id=t.id where t.curriculum_version_id=(data->>'from_curriculum_version_id')::uuid and s.course_id=(data->>'source_course_id')::uuid)
      or not exists(select 1 from public.curriculum_term t join public.curriculum_term_course s on s.curriculum_term_id=t.id where t.curriculum_version_id=(data->>'to_curriculum_version_id')::uuid and s.course_id=(data->>'target_course_id')::uuid) then
      perform saais_private.fail(409,'Pair-rule courses must belong to the specified curricula.'); end if;
  else
    department:=saais_private.department_of(entity,data);
    perform saais_private.require_scope(array['admin','department_head','department_staff'],department);
    if before_row is not null then perform saais_private.require_scope(array['admin','department_head','department_staff'],saais_private.department_of(entity,before_row)); end if;
  end if;
  -- Prevent changing organizational identity underneath referenced history.
  if verb='update' and entity in ('department','program','course') and
    ((body ? 'department_id' and body->'department_id' is distinct from before_row->'department_id') or
     (body ? 'faculty_id' and body->'faculty_id' is distinct from before_row->'faculty_id')) and saais_private.referenced(entity,id) then
    perform saais_private.fail(409,'Referenced organization identity cannot be moved.'); end if;
  if entity='school_term' and verb='update' and saais_private.referenced(entity,id) and
    exists(select 1 from unnest(array['start_year','end_year','term_type']) k where body ? k and body->k is distinct from before_row->k) then
    perform saais_private.fail(409,'Referenced term calendar identity cannot be changed.'); end if;
  if entity='curriculum_term' then version:=(data->>'curriculum_version_id')::uuid;
  elsif entity='curriculum_term_course' then select ct.curriculum_version_id into version from public.curriculum_term ct where ct.id=(data->>'curriculum_term_id')::uuid; end if;
  if version is not null then perform 1 from public.curriculum_version cv where cv.id=version for update; end if;
  if verb='delete' then
    if entity='curriculum_version' then
      if saais_private.referenced(entity,id,array['curriculum_term']) then perform saais_private.fail(409,'Referenced curriculum versions must be closed instead.'); end if;
      for child in select s.id from public.curriculum_term t join public.curriculum_term_course s on s.curriculum_term_id=t.id where t.curriculum_version_id=id loop
        if saais_private.referenced('curriculum_term_course',child.id) then perform saais_private.fail(409,'Curriculum slot history must be preserved.'); end if;
      end loop;
      -- Empty, unreferenced drafts are permitted by the 0.3.0 contract.
      delete from public.curriculum_term_course where curriculum_term_id in (select ct.id from public.curriculum_term ct where ct.curriculum_version_id=id);
      delete from public.curriculum_term where curriculum_version_id=id;
    elsif entity='curriculum_term' then
      if exists(select 1 from public.student_curriculum_assignment where curriculum_version_id=version) and
        (select count(*) from public.curriculum_term where curriculum_version_id=version)<=1 then perform saais_private.fail(409,'The last term of a referenced curriculum must be retained.'); end if;
      for child in select c.id from public.curriculum_term_course c where c.curriculum_term_id=id loop
        if saais_private.referenced('curriculum_term_course',child.id) then perform saais_private.fail(409,'Referenced curriculum slots must be retained.'); end if;
      end loop;
      delete from public.curriculum_term_course where curriculum_term_id=id;
    elsif entity='curriculum_term_course' then
      if exists(select 1 from public.student_curriculum_assignment where curriculum_version_id=version) and
        (select count(*) from public.curriculum_term_course where curriculum_term_id=(before_row->>'curriculum_term_id')::uuid)<=1 then perform saais_private.fail(409,'The last slot of a referenced curriculum term must be retained.'); end if;
    end if;
    if saais_private.referenced(entity,id) then perform saais_private.fail(409,'Referenced academic records cannot be deleted.'); end if;
    execute format('delete from public.%I where id=$1',entity) using id;
  elsif entity='curriculum_version' and verb='create' then
    source:=(body->>'clone_from_version_id')::uuid;
    if source is not null then
      select p.department_id into department from public.curriculum_version v join public.program p on p.id=v.program_id where v.id=source for update of v;
      if department is null then perform saais_private.fail(409,'Clone source not found.'); end if;
      perform saais_private.require_scope(array['admin','department_head','department_staff'],department);
      select coalesce(jsonb_agg(jsonb_build_object('year_level',ct.year_level,'term_sequence',ct.term_sequence,'slots',
        (select coalesce(jsonb_agg(to_jsonb(cs)-'id'-'curriculum_term_id'),'[]') from public.curriculum_term_course cs where cs.curriculum_term_id=ct.id)) order by ct.year_level,ct.term_sequence),'[]') into t
        from public.curriculum_term ct where ct.curriculum_version_id=source;
      data:=coalesce(body->'curriculum',body-'clone_from_version_id'-'program_id')||jsonb_build_object('terms',t);
    else data:=coalesce(body->'curriculum',body-'program_id'-'clone_from_version_id')||jsonb_build_object('terms',coalesce(body->'curriculum'->'terms','[]')); end if;
    after_row:=saais_private.definition((body->>'program_id')::uuid,data);
  elsif entity='curriculum_term' and verb='create' then
    after_row:=saais_private.write_row(entity,null,body-'slots');
    for s in select * from jsonb_array_elements(coalesce(body->'slots','[]')) loop perform saais_private.slot((after_row->>'id')::uuid,s); end loop;
  elsif entity='curriculum_term_course' and verb='create' then
    after_row:=saais_private.slot((body->>'curriculum_term_id')::uuid,body-'curriculum_term_id');
  else
    if verb='update' and entity in ('curriculum_term','curriculum_term_course') and
      (saais_private.referenced(entity,id,case when entity='curriculum_term' then array['curriculum_term_course'] else '{}'::text[] end) or
       (entity='curriculum_term' and exists(select 1 from public.curriculum_term_course cs where cs.curriculum_term_id=id and saais_private.referenced('curriculum_term_course',cs.id)))) then
      perform saais_private.fail(409,'Referenced curriculum requirements cannot be edited.'); end if;
    if entity='curriculum_term_course' and verb='update' then
      if ((data->>'is_elective_slot')::boolean and data->>'slot_type' not in ('elective','ge')) or
        (not (data->>'is_elective_slot')::boolean and data->>'slot_type'='elective') then perform saais_private.fail(400,'Slot type and elective state do not agree.'); end if;
    end if;
    if entity='curriculum_pair_equivalence' then body:=body||jsonb_build_object('created_by',auth.uid()); end if;
    after_row:=saais_private.write_row(entity,id,body-'initial_curriculum'-'initial_curriculum_slot');
    if entity='program' and jsonb_typeof(body->'initial_curriculum')='object' then
      perform saais_private.definition((after_row->>'id')::uuid,body->'initial_curriculum'); end if;
    if entity='course' and jsonb_typeof(body->'initial_curriculum_slot')='object' then
      t:=body->'initial_curriculum_slot';
      perform saais_private.require_scope(array['admin','department_head','department_staff'],saais_private.department_of('curriculum_term',t));
      perform 1 from public.curriculum_version where public.curriculum_version.id=(t->>'curriculum_version_id')::uuid for update;
      select to_jsonb(ct) into term from public.curriculum_term ct where ct.curriculum_version_id=(t->>'curriculum_version_id')::uuid and ct.year_level=(t->>'year_level')::int and ct.term_sequence=(t->>'term_sequence')::int;
      if term is null then term:=saais_private.write_row('curriculum_term',null,t-'slot_type'-'slot_label'); end if;
      perform saais_private.slot((term->>'id')::uuid,jsonb_build_object('course_id',after_row->>'id','is_elective_slot',false,'nominal_units',after_row->'units','slot_type',coalesce(t->>'slot_type','required')));
      perform saais_private.total((t->>'curriculum_version_id')::uuid);
    end if;
  end if;
  if version is not null then perform saais_private.total(version); end if;
  if entity='curriculum_version' and verb='update' then
    perform saais_private.total(id);
    select to_jsonb(v) into after_row from public.curriculum_version v where v.id=id;
  end if;
  perform saais_private.audit(operation,entity,coalesce(id,(after_row->>'id')::uuid),before_row,after_row);
  if operation in ('createCourse','updateCourse','createCurriculumVersion','updateCurriculumVersion') then
    perform saais_private.notify('catalog_updated','report',saais_private.recipients(saais_private.department_of(entity,after_row),array['department_head','dean']),entity,(after_row->>'id')::uuid); end if;
  return after_row;
end $$;
