(function () {
        "use strict";
        const M = window.SAAIS,
          $ = (s) => document.querySelector(s),
          $$ = (s) => [...document.querySelectorAll(s)];
        const esc = (v) =>
          String(v ?? "").replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        const labels = {
          currently_enrolled: "Enrolled",
          passed: "Passed",
          failed: "Failed",
          inc: "INC",
          dr: "Dropped",
          na: "No attendance",
          suggested: "Suggested",
          active: "Active",
          archived: "Archived",
          invited: "Invited",
          disabled: "Disabled",
          strict: "Strict",
          co_requisite: "Co-requisite",
          recommended: "Recommended",
        };
        const badge = (s, label) =>
          `<span class="badge ${esc(s)}">${esc(label || labels[s] || s)}</span>`;
        const icons = {
          grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
          check: '<path d="M4 12.5l5 5L20 6.5"/>',
          list: '<path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
          chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
          clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
          user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
          users:
            '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5.2a3.6 3.6 0 010 5.6M17.5 20a6.6 6.6 0 00-2.2-4.9"/>',
          note: '<path d="M6 3.5h9l4 4V20a.5.5 0 01-.5.5h-12A.5.5 0 016 20V4a.5.5 0 010-.5z"/><path d="M14.5 3.8V8h4.2M9 13h6M9 16.5h4"/>',
          swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
          plus: '<path d="M12 5v14M5 12h14"/>',
          book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h13"/>',
          cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
          shield:
            '<path d="M12 3l7.5 3v6c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
          cog: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4"/>',
          search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
          bell: '<path d="M18 15V10a6 6 0 10-12 0v5l-1.8 3h15.6z"/><path d="M9.8 21h4.4"/>',
          alert:
            '<path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5M12 17h.01"/>',
          flag: '<path d="M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12"/>',
          right: '<path d="M9 5l7 7-7 7"/>',
          logout:
            '<path d="M9 21H5a1 1 0 01-1-1V4a1 1 0 011-1h4"/><path d="M15.5 16.5L20 12l-4.5-4.5M20 12H9"/>',
          layers:
            '<path d="M12 3l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.4l9 4.8 9-4.8M3 16.9l9 4.8 9-4.8"/>',
          mail: '<rect x="3" y="5" width="18" height="14" rx="1.6"/><path d="M3.6 6l8.4 6.6L20.4 6"/>',
          building:
            '<path d="M4 21V4.5A1.5 1.5 0 015.5 3h8A1.5 1.5 0 0115 4.5V21M15 9h3.5A1.5 1.5 0 0120 10.5V21M2.5 21h19M8 7.5h3M8 11.5h3M8 15.5h3"/>',
          file: '<path d="M13.5 3H7a1.5 1.5 0 00-1.5 1.5v15A1.5 1.5 0 007 21h10a1.5 1.5 0 001.5-1.5V8z"/><path d="M13.5 3v5H18.5"/>',
          out: '<path d="M15 3h6v6M21 3l-9 9"/><path d="M18 13.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h6.5"/>',
          trash:
            '<path d="M4 7h16M9 7V4.5a1 1 0 011-1h4a1 1 0 011 1V7M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/><path d="M10 11v6M14 11v6"/>',
        };
        const icon = (n, size = 18) =>
          `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.book}</svg>`;
        const button = (text, action = "", primary = false, extra = "") =>
          `<button type="button" ${action ? `data-action="${action}"` : ""} class="${primary ? "primary" : ""}" ${extra}>${esc(text)}</button>`;
        const link = (text, to, primary = false) =>
          `<a class="button ${primary ? "primary" : ""}" href="#/${to}">${esc(text)}</a>`;
        const table = (heads, rows, cards = true, rowAttrs = []) =>
          `<div class="table-scroll"><table class="data ${cards ? "cards" : ""}"><thead><tr>${heads.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r, ri) => `<tr ${rowAttrs[ri] || ""}>${r.map((c, i) => `<td data-label="${esc(heads[i])}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>${rows.length ? "" : '<div class="empty">No records match. Try another filter.</div>'}</div>`;
        const panel = (title, sub, body, action = "", cls = "") =>
          `<section class="panel ${cls}"><header class="panel-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${action}</header>${body}</section>`;
        const field = (
          name,
          label,
          value = "",
          type = "text",
          required = true,
          extra = "",
        ) =>
          `<label class="field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} ${extra}></label>`;
        const select = (name, label, opts, value, required = true) =>
          `<label class="field">${esc(label)}<select name="${name}" ${required ? "required" : ""}>${opts
            .map((o) => {
              const [v, t] = Array.isArray(o) ? o : [o, o];
              return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
            })
            .join("")}</select></label>`;
        const textarea = (name, label, value = "", required = true) =>
          `<label class="field wide">${esc(label)}<textarea name="${name}" ${required ? "required" : ""}>${esc(value)}</textarea></label>`;
        const form = (id, body, submit = "Save", extra = "") =>
          `<form data-form="${id}" ${extra}><div class="form-grid">${body}</div><div class="form-footer"><div class="error" role="alert"></div>${button("Cancel", "close")}<button type="submit" class="${submit === "Continue with override" ? "gold" : "primary"}">${esc(submit)}</button></div></form>`;
        const date = (d) =>
          d
            ? new Date(
                d.length === 10 ? d + "T12:00:00" : d,
              ).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Current";
        const initials = (n) =>
          n
            .replace("Prof. ", "")
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("");
        const termName = (id) => {
          const t = M.find("terms", id);
          return t ? `${t.school_year} · ${t.term_type}` : "—";
        };
        const courseName = (id) => {
          const c = M.find("courses", id);
          return c ? `${c.code} — ${c.title}` : "Elective slot";
        };
        const slotName = (id) => {
          const s = M.find("slots", id);
          return s
            ? s.slot_label || M.find("courses", s.course_id)?.code
            : "No direct slot";
        };
        const who = (id) => M.find("profiles", id)?.full_name || "System";
        const facultyName = (id) => M.find("faculties", id)?.name || "—";
        const deptName = (id) => M.find("departments", id)?.name || "—";
        const deptFaculty = (id) =>
          facultyName(M.find("departments", id)?.faculty_id);
        let session;
        try {
          session = JSON.parse(sessionStorage.getItem("saais-session"));
        } catch {}
        let route = "",
          student = "s1",
          courseFaculty = "all",
          courseDept = "all",
          enrollmentTerm = "t1",
          recordTerm = "t1",
          notesTerm = "all",
          offerFilter = "all",
          offerFilterValue = "",
          rosterView = "current",
          rosterSearch = "",
          rosterStanding = "all",
          adminSearch = "",
          adminFilter = "all",
          selectedCurriculum = "cv1",
          selectedTerm = "t1",
          checklistFilter = "all",
          advisingTermFilter = "2nd Semester";
        let dialogContext = {},
          lastFocus,
          toastTimer,
          advisingSelected = new Set(),
          advisingChats = {},
          studentPlans = M.db.plans;
        let accountCollege="all",accountDepartment="all",shiftTarget="cv2";
        const current = () => M.find("profiles", session?.profile) || null;
        const role = () => current()?.role;
        const canEdit = () =>
          role() === "admin" ||
          (role() === "adviser" &&
            M.db.assignments.some(
              (a) =>
                a.student_id === student &&
                a.adviser_id === current().id &&
                !a.end_date,
            ));
 function programCollege(p){return M.find('departments',p.department_id)?.faculty_id;}
 function profileCollege(p){return p.role==='student'?programCollege(M.find('programs',p.program_id)||{}):p.faculty_id||M.find('departments',p.department_id)?.faculty_id;}
 function studentProgram(){const ca=M.db.curriculumAssignments.find(a=>a.student_id===student&&!a.end_date);return M.find('programs',M.find('curricula',ca?.curriculum_version_id)?.program_id);}
 function courseCleared(courseId){return M.db.attempts.some(a=>a.student_id===student&&M.course(a)?.id===courseId&&M.passed(a));}
 function advisingSchoolTerm(type){return M.db.terms.filter(t=>t.term_type===type).sort((a,b)=>M.termKey(b)-M.termKey(a))[0];}
 function attemptOrder(a,b){return M.termKey(M.find('terms',M.find('offerings',a.course_offering_id).school_term_id))-M.termKey(M.find('terms',M.find('offerings',b.course_offering_id).school_term_id))||a.created_at.localeCompare(b.created_at);}
 function shiftPreview(target){
  const cv=M.find('curricula',target);if(!cv)return '';
  const termIds=M.db.curriculumTerms.filter(t=>t.curriculum_version_id===target).map(t=>t.id),used=new Set();
  let carried=0,weighted=0,matchedUnits=0;
  for(const slot of M.db.slots.filter(s=>termIds.includes(s.curriculum_term_id))){
   const a=M.db.attempts.filter(a=>a.student_id===student&&M.passed(a)&&!used.has(a.id)&&M.course(a).id===slot.course_id).sort(attemptOrder).at(-1);
   if(a){used.add(a.id);carried+=M.course(a).units;weighted+=M.grade(a)*M.course(a).units;matchedUnits+=M.course(a).units;}
  }
  return stats([['Carried units',carried,'Passed courses with matching course identities'],['Lost units',Math.max(0,M.metrics(student).earned-carried),'Passed units without an automatic match'],['Projected GWA',matchedUnits?(weighted/matchedUnits).toFixed(2):'â€”','On automatically carried courses']])+'<p class="muted">Read-only simulation. Elective mappings and equivalencies need adviser review; no course-code equivalence is assumed and no assignment is changed.</p>';
 }
 function shiftPanel(){return panel('Curriculum Shift Preview','Explore another curriculum without changing the record.',`<div class="panel-body">${select('shift-curriculum','Target curriculum',M.db.curricula.map(c=>[c.id,(M.find('programs',c.program_id)?.code||'')+' Â· '+c.version_label]),shiftTarget)}<div id="shift-results">${shiftPreview(shiftTarget)}</div></div>`);}
 function saveRecordEntry(d){
  const existing=M.db.attempts.find(a=>a.student_id===student&&a.course_offering_id===d.course_offering_id);
  if(existing){const old=structuredClone(existing);if(d.midterm_grade!=='')existing.midterm_grade=Number(d.midterm_grade);if(d.final_grade!==''){existing.final_grade=Number(d.final_grade);existing.status=existing.final_grade<=3?'passed':'failed';}existing.updated_at=new Date().toISOString();audit('grade.recorded','Attempt',existing.id,old,existing);persist('Missing grades recorded.');}
  else enrollSave(d);
 }


        function setSession(id) {
          session = {
            session: "local-demo",
            profile: id,
            role: M.find("profiles", id).role,
            status: "active",
          };
          try {
            sessionStorage.setItem("saais-session", JSON.stringify(session));
          } catch {}
        }
        function go(to) {
          if (location.hash === "#/" + to) render();
          else location.hash = "#/" + to;
        }
        function notify(t) {
          let el = $(".toast");
          if (!el) {
            el = document.createElement("div");
            el.className = "toast";
            el.setAttribute("role", "status");
            document.body.append(el);
          }
          el.textContent = t;
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => el.remove(), 4200);
        }
        function persist(message) {
          const saved = M.save();
          render();
          notify(
            message +
              (saved ? "" : " Changes are kept only until this page closes."),
          );
        }
        function close() {
          const d = $("#app-dialog");
          if (d?.open) d.close();
          lastFocus?.focus();
        }
        function modal(title, content, context = {}, opts = {}) {
          let d = $("#app-dialog");
          if (!d) {
            d = document.createElement("dialog");
            d.id = "app-dialog";
            d.className = "dialog";
            document.body.append(d);
            d.addEventListener("click", (e) => {
              if (e.target === d) close();
            });
            d.addEventListener("close", () => lastFocus?.focus());
          }
          lastFocus = document.activeElement;
          dialogContext = context;
          d.innerHTML = `<header class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${opts.closeButton === false ? "" : button("Close", "close")}</header><div class="dialog-content">${content}</div>`;
          d.setAttribute("aria-labelledby", "dialog-title");
          d.showModal();
        }
        function audit(action, entity, id, oldv, newv, reason) {
          M.audit(
            current()?.id || null,
            action,
            entity,
            id,
            oldv,
            newv,
            reason,
          );
        }
        const navs = {
          student: [
            ["grid", "Dashboard", "dashboard"],
            ["check", "Curriculum checklist", "checklist"],
            ["chart", "Grades & GWA", "grades"],
            ["clock", "Enrollment history", "history"],
            ["user", "My profile", "profile"],
          ],
          adviser: [
            ["grid", "Dashboard", "dashboard"],
            ["users", "Advisees", "advisees"],
            ["swap", "Reassignment", "reassignment"],
          ],
          admin: [
            ["grid", "Dashboard", "dashboard"],
            ["users", "Accounts", "accounts"],
            ["building", "Faculty & departments", "faculties"],
            ["layers", "Programs", "programs"],
            ["book", "Curricula", "curricula"],
            ["list", "Course catalog", "courses"],
            ["cal", "Terms & offerings", "course-offerings"],
            ["shield", "Audit log", "audit-log"],
          ],
        };
        function shell(content, title, crumbs) {
          const u = current(),
            r = role(),
            base = {
              admin: "Administration",
              adviser: "Advising workspace",
              student: "My academic journey",
            }[r],
            trail = crumbs || [
              [base, r + "/dashboard"],
              [title, null],
            ];
          return `<div class="app"><aside class="side" id="app-navigation"><button class="mobile-menu drawer-close" data-action="menu">Close navigation</button><a class="brand" href="#/${r}/dashboard"><img src="logo-mark.png" alt=""><span><b class="dsp">SAAIS</b><small>${r === "admin" ? "Administrator" : r === "adviser" ? "Adviser" : "Student"} portal</small></span></a><nav aria-label="Main navigation">${navs[r].map(([ic, t, p]) => `<a href="#/${r}/${p}" class="nav-link ${route === r + "/" + p || (p === "advisees" && route.startsWith("adviser/advisees/")) ? "active" : ""}" ${route === r + "/" + p ? 'aria-current="page"' : ""}>${icon(ic)}${t}</a>`).join("")}</nav><div class="side-bottom"><a class="nav-link" href="#/docs">${icon("book")}Help & documentation</a><div class="user-menu"><div class="user-menu-list" id="user-menu-list" role="menu" hidden><a href="#/settings" role="menuitem">${icon("cog", 16)}Settings</a><a href="#/login" role="menuitem" data-action="signout">${icon("logout", 16)}Sign out</a></div><button type="button" class="user-trigger" data-action="user-menu" aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu-list"><span class="avatar">${initials(u.full_name)}</span><span class="user-name"><b>${esc(u.full_name)}</b><small>${esc(u.student_number || facultyName(profileCollege(u)))}</small></span></button></div></div></aside><div class="workspace"><header class="app-top"><div class="actions"><button type="button" data-action="menu" class="mobile-menu top-menu" aria-controls="app-navigation" aria-expanded="false">Menu</button><nav class="breadcrumb" aria-label="Breadcrumb">${trail.map(([label, to], i) => (i === trail.length - 1 ? `<b aria-current="page">${esc(label)}</b>` : `<a href="#/${to}">${esc(label)}</a>${icon("right", 13)}`)).join("")}</nav></div></header><main id="main-content">${content}<p class="sample-caption">Sample records for presentation · Reference date: 19 September 2026</p></main></div></div>`;
        }
        function heading(t, sub, actions = "") {
          return `<div class="page-heading"><div><h1>${esc(t)}</h1><p>${esc(sub)}</p></div>${actions ? `<div class="actions">${actions}</div>` : ""}</div>`;
        }
        const stats = (items) =>
          `<div class="stats">${items.map(([t, v, s]) => `<div class="stat"><div class="stat-label">${esc(t)}</div><div class="stat-value">${esc(v)}</div><div class="stat-note">${esc(s)}</div></div>`).join("")}</div>`;
        function quick(r) {
          const lists = {
            student: [
              ["Open checklist", "student/checklist"],
              ["Review grades", "student/grades"],
              ["Enrollment history", "student/history"],
            ],
            adviser: [
              ["Find an advisee", "adviser/advisees"],
              ["Record enrollment", "adviser/advisees/record-grades"],
              ["Write an advising note", "adviser/advisees/advising"],
            ],
            admin: [
              ["Manage accounts", "admin/accounts"],
              ["Course offerings", "admin/course-offerings"],
              ["Review audit log", "admin/audit-log"],
            ],
          };
          return `<section class="quick-access" aria-label="Quick Access"><h2>Quick Access</h2>${lists[r].map(([t, p]) => `<a href="#/${p}">${esc(t)}${icon("right", 16)}</a>`).join("")}</section>`;
        }
        function activities(all = false) {
          const rows = [...M.db.audit].sort((a, b) =>
            b.created_at.localeCompare(a.created_at),
          );
          const list = all ? rows : rows.slice(0, 3);
          return (
            list
              .map(
                (a) =>
                  `<div class="activity-row"><div><strong>${esc(a.action.replaceAll(".", " ").replaceAll("_", " "))}</strong><p>${esc(who(a.actor_id))} · ${esc(a.entity_type)} ${esc(a.entity_id)}</p></div><small>${date(a.created_at)}</small></div>`,
              )
              .join("") || '<div class="empty">No activity yet.</div>'
          );
        }
        function enrollmentPanel() {
          const mine = M.db.attempts.filter((a) => a.student_id === student),
            termOf = (a) =>
              M.find("offerings", a.course_offering_id).school_term_id,
            ids = [...new Set(mine.map(termOf))].sort(
              (a, b) =>
                M.termKey(M.find("terms", b)) - M.termKey(M.find("terms", a)),
            ),
            sel = ids.includes(enrollmentTerm)
              ? enrollmentTerm
              : ids.includes("t1")
                ? "t1"
                : ids[0] || "t1",
            rows = mine
              .filter((a) => termOf(a) === sel)
              .map((a) => [
                `<strong>${esc(M.course(a).code)}</strong><span class="course-title">${esc(M.course(a).title)}</span>`,
                M.course(a).units,
                badge(M.displayStatus(a)),
              ]);
          return panel(
            "Current Enrollment",
            termName(sel),
            table(["Course", "Units", "Status"], rows) +
              `<div class="panel-body"><p class="muted" style="margin-top:18px">Recorded course enrollments for this term. Your adviser maintains these records.</p></div>`,
            ids.length
              ? `<div class="field term-select"><select name="enrollment-term" aria-label="School year and semester">${ids.map((id) => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(termName(id))}</option>`).join("")}</select></div>`
              : "",
          );
        }
        function courseRecommendationsPanel(){
 const picks=(M.db.plans[student]||[]).filter(p=>M.find('courses',p.courseId)&&M.find('terms',p.school_term_id));
 return panel('Course Recommendations','Suggested by your adviser; recorded enrollment is separate.',
 picks.length?table(['Course','Units','School term','Status'],picks.map(p=>{const c=M.find('courses',p.courseId);return [`<strong>${esc(c.code)}</strong><span class="course-title">${esc(c.title)}</span>`,c.units,esc(termName(p.school_term_id)),badge('suggested','Planned')];})):'<div class="empty">No recommendations yet.</div>');
}
        function studentDashboard() {
          const m = M.metrics(student),
            a = M.db.assignments.find(
              (a) => a.student_id === student && !a.end_date,
            ),
            ad = M.find("profiles", a.adviser_id),
            inc = M.db.attempts.filter(
              (a) =>
                a.student_id === student &&
                a.status === "inc" &&
                !M.db.resolutions.some((r) => r.attempt_id === a.id),
            );
          return (
            heading(
              `A clearer path forward, ${who(student).split(" ")[0]}.`,
              "Your progress, your next courses, and the support to keep moving.",
              link("View my checklist", "student/checklist", true),
            ) +
            stats([
              ["Cumulative GWA", m.gwa, `${m.units} counted units`],
              ["Units earned", m.earned, `of ${m.total} required units`],
              [
                "Academic standing",
                m.delinquent ? "Flagged" : "Good",
                `${m.threshold} failed units per term triggers a flag`,
              ],
              ["Open INC", inc.length, "Review completion deadlines"],
            ]) +
            quick("student") +
            `<div class="columns"><div class="stack">${courseRecommendationsPanel()}${panel("Your degree, in view", "BS Computer Science · Curriculum 2023–2024", `<div class="panel-body"><div class="progress-row"><div class="progress-label"><span>${m.earned} units earned</span><span>${Math.round((m.earned / m.total) * 100)}% of ${m.total} units</span></div><div class="progress-track"><span style="width:${(m.earned / m.total) * 100}%"></span></div></div><p class="muted" style="margin-top:16px">View the checklist to see direct credit, elective mappings and equivalency decisions. This demo contains a curriculum excerpt.</p></div>`, link("Open checklist", "student/checklist"))}</div><div class="stack">${panel("Your academic adviser", "Here to help you plan your next step.", `<div class="adviser-contact"><div class="avatar">${initials(ad.full_name)}</div><div><strong>${esc(ad.full_name)}</strong><p class="muted">${esc(facultyName(profileCollege(ad)))}</p></div></div><div class="contact-detail"><a href="mailto:${esc(ad.email)}">${esc(ad.email)}</a><br>Assigned since ${date(a.start_date)}<br>${button("View assignment history", "assignment-history")}</div>`)}${panel("Keep on your radar", `${inc.length} incomplete course${inc.length === 1 ? "" : "s"} to review`, inc.map((a) => `<div class="activity-row"><div><strong>${esc(M.course(a).code)} · ${M.today > a.inc_deadline ? "INC deadline passed" : "Completion due"}</strong><p>${date(a.inc_deadline)} · ${M.today > a.inc_deadline ? "Status stays INC; 5.00 counts for GWA." : "Coordinate requirements with your instructor."}</p></div>${badge("inc")}</div>`).join("") || '<div class="panel-body muted">No open INC requirements.</div>')}</div></div>`
          );
        }
        function adviserDashboard() {
          const ids = M.db.assignments
              .filter((a) => a.adviser_id === current().id && !a.end_date)
              .map((a) => a.student_id),
            incs = M.db.attempts.filter(
              (a) =>
                ids.includes(a.student_id) &&
                a.status === "inc" &&
                !M.db.resolutions.some((r) => r.attempt_id === a.id),
            );
          return (
            heading(
              "Make room for meaningful advising.",
              "Start with the students who need your attention.",
            ) +
            stats([
              ["Current advisees", ids.length, "Assigned to you"],
              [
                "Delinquency flags",
                ids.filter((id) => M.metrics(id).delinquent).length,
                "Review failed units and course load",
              ],
              [
                "Open INC records",
                incs.length,
                "Upcoming and lapsed deadlines",
              ],
              [
                "Recorded exceptions",
                M.db.mappings.length + M.db.equivalencies.length,
                "Mappings and equivalencies",
              ],
            ]) +
            quick("adviser") +
            `<div class="columns"><div class="stack">${panel(
              "Students to follow up",
              "A focused view of academic standing and incomplete grades.",
              table(
                ["Student", "Reason", ""],
                ids.map((id) => {
                  const m = M.metrics(id),
                    inc = incs.filter((a) => a.student_id === id);
                  return [
                    `<strong>${esc(who(id))}</strong><span class="course-title">${esc(M.find("profiles", id).student_number)}</span>`,
                    m.delinquent
                      ? badge("delinquent", "Delinquency flag")
                      : inc.length
                        ? badge("inc", `${inc.length} open INC`)
                        : badge("passed", "Good standing"),
                    button("Review", "student", false, `data-id="${id}"`),
                  ];
                }),
              ),
              link("View All", "adviser/advisees"),
            )}${panel("Recent Activity", "Your latest three recorded changes.", activities(), button("View All", "activity"))}</div><div class="stack">${panel(
              "Upcoming INC deadlines",
              "Arrange follow-ups before the compliance date.",
              incs
                .sort((a, b) => a.inc_deadline.localeCompare(b.inc_deadline))
                .map(
                  (a) =>
                    `<div class="activity-row"><div><strong>${esc(who(a.student_id))}</strong><p>${esc(M.course(a).code)} · ${date(a.inc_deadline)}</p>${button("Review INC", "review-inc", false, `data-id="${a.id}"`)}</div>${badge("inc", a.inc_deadline < M.today ? "Lapsed INC" : "INC")}</div>`,
                )
                .join(""),
            )}${panel("What does “Record enrollment” do?", "A clearer name for an enrollment attempt.", `<div class="panel-body"><p class="muted">Records that a student is taking a specific course offering. Each retake is a separate record, preserving grades and advising history.</p><p class="muted" style="margin-top:12px">This is an advising record. Registrar enrollment happens outside SAAIS.</p></div>`)}</div></div>`
          );
        }
        function studentTabs(active) {
          return `<div class="student-summary"><div class="avatar">${initials(who(student))}</div><div><h1 class="dsp">${esc(who(student))}</h1><p class="muted">${esc(M.find("profiles", student).student_number)} · ${active === "detail" ? `<a href="mailto:${esc(M.find("profiles", student).email)}">${esc(M.find("profiles", student).email)}</a> · ` : ""}${esc(studentProgram()?.name||"Program not assigned")} · ${badge(M.metrics(student).delinquent ? "delinquent" : "passed", M.metrics(student).delinquent ? "Delinquency flag" : "Good standing")}</p></div></div><nav class="tabs" aria-label="Student record">${[
            ["Overview", "detail"],
            ["Advising", "advising"],
            ["Checklist", "checklist"],
            ["Grades", "grades"],
            ["Record grades", "record-grades"],
            ["History", "history"],
            
          ]
            .map(
              ([t, p]) =>
                `<a class="${active === p ? "active" : ""}" href="#/adviser/advisees/${student}/${p}" ${active === p ? 'aria-current="page"' : ""}>${t}</a>`,
            )
            .join(
              "",
            )}</nav>${canEdit() ? "" : '<div class="read-only">Historical advisee · You can review these records, but only the current adviser can change them.</div>'}`;
        }
        function roster() {
          let ids = M.db.assignments
            .filter(
              (a) =>
                a.adviser_id === current().id &&
                (rosterView === "current" ? !a.end_date : !!a.end_date),
            )
            .map((a) => a.student_id);
          ids = [...new Set(ids)];
          const rowIds = ids.filter((id) => {
              const u = M.find("profiles", id),
                m = M.metrics(id);
              return (
                `${u.full_name} ${u.student_number}`
                  .toLowerCase()
                  .includes(rosterSearch.toLowerCase()) &&
                (rosterStanding === "all" ||
                  (rosterStanding === "flagged" ? m.delinquent : !m.delinquent))
              );
            }),
            rows = rowIds.map((id) => {
              const u = M.find("profiles", id),
                m = M.metrics(id);
              return [
                `<button type="button" class="row-link" data-action="student" data-id="${id}"><strong>${esc(u.full_name)}</strong><span class="course-title">${esc(u.student_number)}</span></button>`,
                esc(M.find('programs',u.program_id)?.name||'—'),
                m.gwa,
                m.earned,
                badge(
                  m.delinquent ? "delinquent" : "passed",
                  m.delinquent ? "Flagged" : "Good standing",
                ),
              ];
            });
          return (
            heading(
              "Know your students.",
              "Search current and past advisees. Historical records remain read-only.",
              link("Reassign advisees", "adviser/reassignment"),
            ) +
            `<div class="toolbar"><label class="field search">Search advisees<input type="search" data-filter="roster" value="${esc(rosterSearch)}" placeholder="Name or student number"></label>${select(
              "roster-standing",
              "Standing",
              [
                ["all", "All standings"],
                ["flagged", "Delinquency flags"],
                ["good", "Good standing"],
              ],
              rosterStanding,
            )}<div class="segmented" role="group" aria-label="Assignment period">${button("Current", "roster-current", false, `aria-pressed="${rosterView === "current"}"`)}${button("Past", "roster-past", false, `aria-pressed="${rosterView === "past"}"`)}</div></div>` +
            panel(
              "Advisees",
              `${rows.length} matching sample records`,
              table(
                ["Student", "Program", "GWA", "Earned units", "Standing"],
                rows,
                true,
                rowIds.map(
                  (id) =>
                    `class="row-click" data-action="student" data-id="${id}"`,
                ),
              ),
            )
          );
        }
        function overview() {
          const m = M.metrics(student);
          return (
            studentTabs("detail") +
            stats([
              ["Cumulative GWA", m.gwa, `${m.units} counted units`],
              ["Units earned", m.earned, `of ${m.total} required`],
              ["Threshold", m.threshold, "Failed units per school term"],
              [
                "Open INC",
                M.db.attempts.filter(
                  (a) =>
                    a.student_id === student &&
                    a.status === "inc" &&
                    !M.db.resolutions.some((r) => r.attempt_id === a.id),
                ).length,
                "Includes lapsed records",
              ],
            ]) +
            `<div class="columns"><div class="stack">${enrollmentPanel()}${assignmentPanel()}</div><div class="stack">${panel("Advising actions", "Keep the student record up to date.", `<div class="panel-body actions">${canEdit() ? link("Record enrollment", "adviser/advisees/record-grades", true) + link("Write a note", "adviser/advisees/advising") : '<p class="muted">Read-only historical access.</p>'}${button("Curriculum assignment history", "curriculum-history")}${role() === "admin" ? button("Change curriculum", "assign-curriculum") : ""}</div>`)}${panel("Latest advising note", "Staff-only information.", `<div class="panel-body"><p class="muted">${esc(M.db.notes.find((n) => n.student_id === student)?.body_text || "No notes yet.")}</p></div>`)}</div></div>`
          );
        }
        function assignmentPanel() {
          return panel(
            "Adviser assignment history",
            "Continuous support, with every transition preserved.",
            table(
              ["Adviser", "Start", "End"],
              M.db.assignments
                .filter((a) => a.student_id === student)
                .map((a) => [
                  esc(who(a.adviser_id)),
                  date(a.start_date),
                  date(a.end_date),
                ]),
            ),
          );
        }
        function curriculumHorizon() {
          // Candidate slots span every curriculum term up to one term past the
          // furthest term the student has touched — not just a single "next"
          // term — so a course unlocks as soon as its prerequisite is passed,
          // even if earlier electives/GE slots in that same term are still open.
          const ca = M.db.curriculumAssignments.find(
            (a) => a.student_id === student && !a.end_date,
          );
          const terms = M.db.curriculumTerms
            .filter(
              (t) => t.curriculum_version_id === ca?.curriculum_version_id,
            )
            .sort(
              (a, b) =>
                a.year_level - b.year_level ||
                a.term_sequence - b.term_sequence,
            );
          let furthest = -1;
          terms.forEach((t, i) => {
            const touched = M.db.slots
              .filter((s) => s.curriculum_term_id === t.id)
              .some((s) => slotResult(s).a);
            if (touched) furthest = i;
          });
          return terms.slice(0, Math.min(terms.length, furthest + 2));
        }
        function advisingRecommendations(termType){
 const t=advisingSchoolTerm(termType), slots=curriculumHorizon().flatMap(t=>M.db.slots.filter(s=>s.curriculum_term_id===t.id));
 const eligible=[],excluded=[];
 if(!t)return {eligible,excluded};
 for(const s of slots){
  const r=slotResult(s);if(r.a&&(M.passed(r.a)||M.displayStatus(r.a)==='currently_enrolled'||(r.a.status==='inc'&&M.grade(r.a)===null)))continue;
  const c=M.find('courses',s.course_id);
  const candidates=c?[c]:M.db.courses.filter(c=>c.status==='active'&&c.is_demo_elective&&M.db.offerings.some(o=>o.course_id===c.id&&o.school_term_id===t.id));
  for(const course of candidates){
   const offering=M.db.offerings.find(o=>o.course_id===course.id&&o.school_term_id===t.id);
   if(!offering){excluded.push({course,reason:'Not offered in '+termType});continue;}
   if(!c&&M.db.attempts.some(a=>a.student_id===student&&M.course(a).id===course.id&&(M.passed(a)||M.displayStatus(a)==='currently_enrolled')))continue;
   const unmet=M.db.prerequisites.filter(p=>p.course_id===course.id&&p.type==='strict'&&!courseCleared(p.prerequisite_course_id));
   if(unmet.length){excluded.push({course,reason:'Needs '+unmet.map(p=>courseName(p.prerequisite_course_id)).join(', ')+' passed first'});continue;}
   const retake=!!r.a&&(M.displayStatus(r.a)==='failed'||(r.a.status==='inc'&&M.grade(r.a)===5));
   eligible.push({slot:s,course,key:s.id+':'+course.id,offering,retake,
    tags:[...(!c?['Elective']:[]),...(offering.is_by_request?['By request']:[]),...(retake?['Retake']:[])],
    reason:retake?'Required retake — choose when to take it':!c?'Fulfills an open elective slot':'Unfulfilled requirement; strict prerequisites cleared'});
  }
 }
 return {eligible,excluded};
}
        function advisingRecCard(){
 const {eligible,excluded}=advisingRecommendations(advisingTermFilter),t=advisingSchoolTerm(advisingTermFilter);
 const plans=M.db.plans[student]||[],already=new Set(plans.filter(p=>p.school_term_id===t?.id).map(p=>p.key));
 const rows=eligible.map(x=>[
  already.has(x.key)?badge('suggested','Planned'):canEdit()?`<input type="checkbox" aria-label="Select ${esc(x.course.code)}" data-action="toggle-rec" data-id="${x.key}" ${advisingSelected.has(x.key)?'checked':''}>`:'Read-only',
  `<strong>${esc(x.course.code)}</strong><span class="course-title">${esc(x.course.title)}</span>`,x.course.units,esc(x.reason),x.tags.map(t=>badge(t==='Retake'?'failed':'suggested',t)).join(' '),
  already.has(x.key)&&canEdit()?button('Remove','cancel-rec',false,`data-id="${x.key}"`):''
 ]);
 return panel('Course Recommendations',t?termName(t.id):'No offering term available',
 table(['','Course','Units','Why recommended','Type',''],rows)+
 (excluded.length?`<div class="notice">${excluded.length} requirements or options excluded because of availability or prerequisites.</div>`:'')+
 `<div class="panel-body"><p class="muted">Failed requirements must be retaken. The student chooses the timing; dependent courses remain unavailable until their prerequisites pass.</p>${canEdit()?`<div class="actions"><span>${advisingSelected.size} selected</span>${button('Add selected to plan','add-to-plan',true)}</div>`:''}</div>`,
 select('advising-term-filter','Term',[['1st Semester','1st Semester'],['2nd Semester','2nd Semester'],['Summer','Summer / Midyear']],advisingTermFilter),'rec-card');
}
        function advisingNotesCard(){
  const recent=studentNotes().slice(0,3);
  return panel('Advising Notes','Recent notes · staff-only',
    `<div class="notes-list">${recent.map(noteRow).join('')||'<div class="empty">No notes yet.</div>'}</div>`+
    (canEdit()?`<div class="panel-body">${form('note',textarea('body_text','Write an advising note'),'Save note')}</div>`:''),
    button('View all notes','notes-all'),'notes-card');
}
        function demoAnswer(text){
 const m=M.metrics(student),inc=M.db.attempts.filter(a=>a.student_id===student&&a.status==='inc'&&!M.db.resolutions.some(r=>r.attempt_id===a.id)),failed=M.db.attempts.filter(a=>a.student_id===student&&M.displayStatus(a)==='failed');
 if(/gwa|average|units/i.test(text))return `Demo preview: ${who(student)} has GWA ${m.gwa}, ${m.earned} earned units and ${m.delinquent?'a delinquency flag':'good standing'}. Final and completion grades determine these values; midterms do not.`;
 if(/inc|incomplete|deadline/i.test(text))return 'Demo preview: '+(inc.length?inc.map(a=>M.course(a).code+' — due '+date(a.inc_deadline)+(a.inc_deadline<M.today?' (lapsed)':'')).join('; '):'No unresolved INC records.')+' Verify completion requirements before acting.';
 if(/retake|failed/i.test(text))return 'Demo preview: '+(failed.length?failed.map(a=>M.course(a).code).join(', ')+' need retake or an authorized grade correction. The student chooses when to retake.':'No failed attempts in this record.');
 const courses=advisingRecommendations(advisingTermFilter).eligible.slice(0,6).map(x=>x.course.code);
 return `Demo preview: eligible offered courses for ${advisingTermFilter}: ${courses.join(', ')||'none'}. This uses the selected record, prerequisite results and curriculum horizon. Verify before recording enrollment; this chat does not save academic changes.`;
 }
        function chatFor(sid) {
          if (!advisingChats[sid]) {
            const first = who(sid).split(" ")[0];
            advisingChats[sid] = [
              { mine: true, text: `What should ${first} take next term?` },
              {
                mine: false,
                text: demoAnswer('next courses'),
              },
              {
                mine: true,
                text: "Good. Flag anything hidden because of a prerequisite.",
              },
              {
                mine: false,
                text: "Noted below the list — it names the course and which prerequisite is still outstanding.",
              },
            ];
          }
          return advisingChats[sid];
        }
        function advisingChatCard() {
          const msgs = chatFor(student);
          return panel(
            "Advising Assistant",
            "Drafts suggestions from this record — always verify before acting · Demo preview",
            `<div class="panel-body">${msgs.map((m) => `<div class="chat-msg ${m.mine ? "mine" : "ai"}"><p>${esc(m.text)}</p></div>`).join("")}</div><form data-form="advising-chat" class="chat-form"><input type="text" name="message" placeholder="Ask about this advisee…" autocomplete="off" required><button type="submit" class="primary" aria-label="Send">${icon("right", 16)}</button></form>`,
            "",
            "chat-card",
          );
        }
        function advising() {
          return `${studentTabs("advising")}<div class="columns">${advisingRecCard()}<div class="stack">${advisingNotesCard()}${advisingChatCard()}</div></div>`;
        }
        function slotResult(s) {
          const direct = M.db.attempts.filter(
            (a) =>
              a.student_id === student && a.curriculum_term_course_id === s.id,
          );
          direct.sort(attemptOrder);
          const best = direct.filter(M.passed).at(-1) || direct.at(-1);
          const map = M.db.mappings.find(
            (m) =>
              m.student_id === student && m.curriculum_term_course_id === s.id,
          );
          const eq = M.db.equivalencies.find(
            (e) =>
              e.student_id === student &&
              e.destination_curriculum_term_course_id === s.id,
          );
          const a = map
            ? M.find("attempts", map.attempt_id)
            : eq
              ? M.find("attempts", eq.attempt_id)
              : best;
          return {
            a,
            source: map
              ? "Elective mapping"
              : eq
                ? eq.decision_type === "transfer_equivalency"
                  ? "Transfer equivalency"
                  : "Discontinued equivalency"
                : a
                  ? "Direct"
                  : "Not yet taken",
            earned:
              a && M.passed(a)
                ? M.course(a).units
                : 0,
          };
        }
        function checklist(adviser = false) {
          const ca = M.db.curriculumAssignments.find(
              (a) => a.student_id === student && !a.end_date,
            ),
            terms = M.db.curriculumTerms.filter(
              (t) => t.curriculum_version_id === ca?.curriculum_version_id,
            );
          let body = adviser
            ? studentTabs("checklist")
            : heading(
                "Your curriculum, at a glance.",
                "Every requirement, with a clear record of how it is satisfied.",
                button("Print checklist", "print"),
              );
          body += `<div class="toolbar">${select(
            "checklist-filter",
            "Show requirements",
            [
              ["all", "All statuses"],
              ["open", "Not yet taken"],
              ["passed", "Passed / credited"],
              ["inc", "INC"],
              ["currently_enrolled", "Currently enrolled"],
            ],
            checklistFilter,
          )}${adviser && canEdit() ? `<div class="toolbar-actions">${button("Map elective", "map", true) + button("Add equivalency", "equivalency")}</div>` : ""}</div><div class="stack">`;
          for (const t of terms) {
            const slots = M.db.slots
              .filter((s) => s.curriculum_term_id === t.id)
              .filter((s) => {
                const r = slotResult(s);
                return (
                  checklistFilter === "all" ||
                  (checklistFilter === "open" && !r.a) ||
                  (checklistFilter === "passed" && r.a && M.passed(r.a)) ||
                  (r.a&&M.displayStatus(r.a)) === checklistFilter
                );
              });
            if (!slots.length) continue;
            body += panel(
              `Year ${t.year_level} · Semester ${t.term_sequence}`,
              "Curriculum position · course availability depends on the school term.",
              table(
                [
                  "Requirement",
                  "Units earned / required",
                  "Status",
                  "Satisfaction source",
                  ...(adviser ? ["Remarks"] : []),
                ],
                slots.map((s) => {
                  const r = slotResult(s),
                    c = M.find("courses", s.course_id);
                  return [
                    `<strong>${esc(s.slot_label || c?.code)}</strong><span class="course-title">${esc(c?.title || "Open elective slot")}</span>`,
                    `${r.earned} / ${s.nominal_units}`,
                    r.a
                      ? badge(M.displayStatus(r.a))
                      : badge("na", "Not taken"),
                    `${esc(r.source)}${r.a ? `<span class="course-title">${esc(M.course(r.a).code)} · grade ${M.grade(r.a)?.toFixed(2) || "—"}</span>` : ""}`,
                    ...(adviser
                      ? [
                          button(
                            "View remarks",
                            "remarks",
                            false,
                            `data-id="${s.id}"`,
                          ),
                        ]
                      : []),
                  ];
                }),
              ),
            );
          }
          body += "</div>";
          if (adviser)
            body += `<div style="margin-top:24px">${exceptions()}${shiftPanel()}</div>`;
          return body;
        }
        function exceptions() {
          const items = [
            ...M.db.mappings
              .filter((x) => x.student_id === student)
              .map((x) => ({ ...x, type: "mapping" })),
            ...M.db.equivalencies
              .filter((x) => x.student_id === student)
              .map((x) => ({ ...x, type: "equivalency" })),
          ];
          return panel(
            "Recorded Exceptions",
            "Scroll horizontally to review every decision. Edits and revocations are audited.",
            `<div class="exceptions" tabindex="0" role="region" aria-label="Recorded exceptions, horizontally scrollable">${
              items
                .map((x) => {
                  const a = M.find("attempts", x.attempt_id);
                  return `<article class="exception-card">${badge("suggested", x.type === "mapping" ? "Elective mapping" : x.decision_type === "transfer_equivalency" ? "Transfer equivalency" : "Discontinued equivalency")}<h3>${esc(M.course(a).code)} → ${esc(slotName(x.curriculum_term_course_id || x.destination_curriculum_term_course_id))}</h3><p>${esc(M.course(a).title)}<br>${x.units_credited} credited units · Original grade ${M.grade(a)?.toFixed(2)}<br>${esc(x.justification)}</p><p>${esc(who(x.mapped_by || x.decided_by))}<br>${date(x.created_at || x.decided_at)}</p>${canEdit() ? `<div class="actions">${button("Edit", "edit-exception", false, `data-id="${x.id}" data-kind="${x.type}"`)}${button("Revoke", "revoke-exception", false, `data-id="${x.id}" data-kind="${x.type}"`)}</div>` : ""}</article>`;
                })
                .join("") || '<div class="empty">No exceptions recorded.</div>'
            }</div>`,
          );
        }
        function grades(adviser = false) {
          let out = adviser
            ? studentTabs("grades")
            : heading(
                "Every grade has a story.",
                "Review your results and how they contribute to your GWA.",
                button("Print grade summary", "print"),
              );
          const m = M.metrics(student);
          out += stats([
            ["Cumulative GWA", m.gwa, "Unit-weighted counted attempts"],
            ["Counted units", m.units, "Excludes unresolved, unexpired INC"],
            [
              "Earned units",
              m.earned,
              "Passed attempts selected by repeat rules",
            ],
            [
              "Standing",
              m.delinquent ? "Flagged" : "Good",
              `Threshold: ${m.threshold} failed units per term`,
            ],
          ]);
          out += '<div class="stack">';
          for (const t of [...M.db.terms].sort((a,b)=>M.termKey(b)-M.termKey(a))) {
            const ats = M.db.attempts.filter(
              (a) =>
                a.student_id === student &&
                M.find("offerings", a.course_offering_id).school_term_id ===
                  t.id,
            );
            if (!ats.length) continue;
            const tm = M.metrics(student, t.id);
            out += panel(
              termName(t.id),
              `Term GWA ${tm.gwa} · ${tm.failed} failed units · ${t.is_locked ? "Locked term" : "Open term"}`,
              table(
                [
                  "Course",
                  "Units",
                  "Midterm",
                  "Final / completion",
                  "Status",
                  ...(adviser ? ["Action"] : []),
                ],
                ats.map((a) => {
                  const resolution = M.db.resolutions.find(
                    (r) => r.attempt_id === a.id,
                  );
                  return [
                    `<strong>${esc(M.course(a).code)}</strong><span class="course-title">${esc(M.course(a).title)}</span>`,
                    M.course(a).units,
                    a.midterm_grade?.toFixed(2) || "—",
                    resolution
                      ? `${Number(resolution.completion_grade).toFixed(2)} (completion)`
                      : a.final_grade?.toFixed(2) || "—",
                    badge(M.displayStatus(a)) +
                      (a.status === "inc" && !resolution ? `<span class="course-title">${a.inc_deadline < M.today ? "Lapsed · 5.00 for GWA" : `Due ${date(a.inc_deadline)}`}</span>` : ""),
                    ...(adviser
                      ? [
                          canEdit()
                            ? button(
                                a.status === "inc" && !resolution
                                  ? "Resolve INC"
                                  : "Correct grade",
                                a.status === "inc" && !resolution
                                  ? "resolve-inc"
                                  : "grade",
                                false,
                                `data-id="${a.id}"`,
                              ) + (M.displayStatus(a)==='failed'&&a.status!=='inc'&&M.db.prerequisites.some(p=>p.prerequisite_course_id===M.course(a).id)?button('Override prerequisite grade','override-grade',false,`data-id="${a.id}"`):'')
                            : "Read-only",
                        ]
                      : []),
                  ];
                }),
              ),
            );
          }
          return (
            out +
            '</div><p class="muted" style="margin-top:22px">Once passed, the most recent passing attempt counts for non-repeatable and grade-replacement courses. Additional-credit passes count independently. Lapsed INC remains INC and counts as 5.00 for GWA and failed units.</p>'
          );
        }
        function history(adviser = false) {
          return (
            (adviser
              ? studentTabs("history")
              : heading(
                  "Your enrollment history.",
                  "Every attempt stays on record, including retakes and withdrawals.",
                )) +
            panel(
              "All course enrollments",
              "An attempt is one student’s record for one course offering.",
              table(
                ["Course", "School term", "Status", "Grade", "Provenance"],
                M.db.attempts
                  .filter((a) => a.student_id === student)
                  .slice()
                  .reverse()
                  .map((a) => [
                    esc(courseName(M.course(a).id)),
                    esc(
                      termName(
                        M.find("offerings", a.course_offering_id)
                          .school_term_id,
                      ),
                    ),
                    badge(M.displayStatus(a)),
                    M.grade(a)?.toFixed(2) || "—",
                    a.prerequisite_override
                      ? badge("warning", "Prerequisite override") +
                        `<span class="course-title">${esc(a.prerequisite_override_reason)}</span>`
                      : esc(slotName(a.curriculum_term_course_id)),
                  ]),
              ),
            )
          );
        }
        const studentNotes = () =>
          M.db.notes
            .filter((n) => n.student_id === student)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const noteRow = (n) =>
          `<article class="note-row"><div class="note-meta"><strong>${esc(who(n.authored_by))}</strong><span>${date(n.created_at)}</span></div><p>${esc(n.body_text)}</p></article>`;
        function notesChecklist() {
          const ca = M.db.curriculumAssignments.find(
              (a) => a.student_id === student && !a.end_date,
            ),
            terms = M.db.curriculumTerms
              .filter(
                (t) => t.curriculum_version_id === ca?.curriculum_version_id,
              )
              .sort(
                (a, b) =>
                  a.year_level - b.year_level ||
                  a.term_sequence - b.term_sequence,
              ),
            sel = terms.some((t) => t.id === notesTerm) ? notesTerm : "all",
            rows = [];
          for (const t of terms.filter((t) => sel === "all" || t.id === sel))
            for (const sl of M.db.slots.filter(
              (x) => x.curriculum_term_id === t.id,
            )) {
              const r = slotResult(sl),
                c = M.find("courses", sl.course_id);
              rows.push([
                `Year ${t.year_level} · Sem ${t.term_sequence}`,
                `<strong>${esc(sl.slot_label || c?.code)}</strong><span class="course-title">${esc(c?.title || "Open elective slot")}</span>`,
                `${r.earned} / ${sl.nominal_units}`,
                r.a
                  ? badge(M.displayStatus(r.a))
                  : badge("na", "Not taken"),
                esc(r.source),
              ]);
            }
          return panel(
            "Curriculum checklist",
            "Read-only reference while you write.",
            table(
              ["Term", "Requirement", "Units", "Status", "Satisfaction source"],
              rows,
            ),
            `<div class="actions"><div class="field term-select"><select name="notes-checklist-term" aria-label="Filter checklist by year and term"><option value="all" ${sel === "all" ? "selected" : ""}>All</option>${terms.map((t) => `<option value="${t.id}" ${t.id === sel ? "selected" : ""}>Year ${t.year_level} · Semester ${t.term_sequence}</option>`).join("")}</select></div></div>`,
            "notes-checklist",
          );
        }
        function notes() {
          const all = studentNotes();
          return `<div class="notes-page">${studentTabs("notes")}<div class="notes-grid">${notesChecklist()}<div class="notes-side">${canEdit() ? panel("Add a note", "Save context for the next advising conversation.", `<div class="panel-body">${form("note", textarea("body_text", "Advising note"), "Save note")}</div>`) : ""}${panel("Advising notes", "Dated, append-only notes. Visible only to staff.", `<div class="notes-list">${all.slice(0, 12).map(noteRow).join("") || '<div class="empty">No advising notes yet.</div>'}</div>`, all.length ? button("View All", "notes-all") : "", "notes-card")}</div></div></div>`;
        }
        function recordedCoursesPanel() {
          const mine = M.db.attempts.filter((a) => a.student_id === student),
            termOf = (a) =>
              M.find("offerings", a.course_offering_id).school_term_id,
            ids = [...new Set(mine.map(termOf))].sort(
              (a, b) =>
                M.termKey(M.find("terms", b)) - M.termKey(M.find("terms", a)),
            ),
            sel = ids.includes(recordTerm)
              ? recordTerm
              : ids.includes("t1")
                ? "t1"
                : ids[0] || "t1",
            rows = mine
              .filter((a) => termOf(a) === sel)
              .slice()
              .reverse()
              .map((a) => {
                const resolution = M.db.resolutions.find(
                  (r) => r.attempt_id === a.id,
                );
                return [
                  `<strong>${esc(M.course(a).code)}</strong><span class="course-title">${esc(M.course(a).title)}</span>`,
                  badge(M.displayStatus(a)),
                  a.midterm_grade?.toFixed(2) || "—",
                  resolution
                    ? `${Number(resolution.completion_grade).toFixed(2)} (completion)`
                    : a.final_grade?.toFixed(2) || "—",
                ];
              });
          return panel(
            "Courses added and recorded",
            termName(sel),
            table(["Course", "Status", "Midterm", "Final / completion"], rows),
            ids.length
              ? `<div class="field term-select"><select name="record-term" aria-label="Filter by school year and semester">${ids.map((id) => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(termName(id))}</option>`).join("")}</select></div>`
              : "",
          );
        }
        function record() {
          return (
            studentTabs("record-grades") +
            `<div class="columns record-layout"><div class="stack">${recordedCoursesPanel()}</div><div class="stack">${panel(
              "Student and course offering",
              "Blank grades record enrollment. Fill missing grades here; use Grades to edit an existing value. Registrar enrollment remains separate.",
              `<div class="panel-body">${form(
                "enrollment",
                `<div class="wide">${select("school_term_id", "School term", M.db.terms.map(t => [t.id, termName(t.id) + (t.is_locked ? " · Locked" : "")]), "t1")}</div>` + offeringPicker() +
                  `<div class="field wide curriculum-reference"><span>Direct curriculum slot</span><p id="direct-slot" aria-live="polite">Choose a course offering to see its curriculum slot.</p></div>` +
                  field(
                    "midterm_grade",
                    "Midterm grade",
                    "",
                    "number",
                    false,
                    'min="1" max="5" step="0.25"',
                  ) +
                  field(
                    "final_grade",
                    "Final grade",
                    "",
                    "number",
                    false,
                    'min="1" max="5" step="0.25"',
                  ),
                "Review & record",
              )}</div>`,
            )}${panel("Prerequisite review", "Strict prerequisites must be passed; correct a failed prerequisite in Grades with a reason.", `<div id="prerequisite-preview">Choose a course offering to review its prerequisites.</div>`)}<div class="notice">A duplicate student + offering cannot be saved. Locked terms block adviser changes. Missing strict prerequisites direct you to Grades for a reasoned prerequisite-grade correction.</div></div></div>`
          );
        }
        function autoSlot(offeringId) {
          const o = M.find("offerings", offeringId);
          return o
            ? studentSlots().find(
                (s) => !s.is_elective_slot && s.course_id === o.course_id,
              )
            : undefined;
        }
        function slotText(offeringId) {
          const s = autoSlot(offeringId);
          if (!s) return "No direct slot";
          const t = M.find("curriculumTerms", s.curriculum_term_id);
          return `${slotName(s.id)} · Year ${t.year_level}, Semester ${t.term_sequence}`;
        }
        function studentSlots() {
          const ca = M.db.curriculumAssignments.find(
            (a) => a.student_id === student && !a.end_date,
          );
          const ts = M.db.curriculumTerms
            .filter(
              (t) => t.curriculum_version_id === ca?.curriculum_version_id,
            )
            .map((t) => t.id);
          return M.db.slots.filter((s) => ts.includes(s.curriculum_term_id));
        }
        function programCourseIds() {
          return new Set(
            [...studentSlots().filter(s=>s.course_id).map(s=>s.course_id),...M.db.courses.filter(c=>c.is_demo_elective&&c.department_id===studentProgram()?.department_id).map(c=>c.id)],
          );
        }
        function offeringLabel(o) {
          return courseName(o.course_id) + " · " + termName(o.school_term_id) +
            (o.is_by_request ? " · By request" : "") +
            (M.find('terms',o.school_term_id)?.is_locked ? " · Locked" : "");
        }
        function offeringOptions(query="",termId=$('[data-form="enrollment"] [name="school_term_id"]')?.value || "t1") {
          const ids=programCourseIds(), q=query.trim().toLowerCase();
          const offerings=M.db.offerings.filter(o=>o.school_term_id===termId&&offeringLabel(o).toLowerCase().includes(q));
          return [ ["Program courses",offerings.filter(o=>ids.has(o.course_id))],
            ["All courses / cross-program",offerings.filter(o=>!ids.has(o.course_id))] ]
            .filter(([,items])=>items.length).map(([label,items])=>
              `<div role="group" aria-label="${label}"><div class="offering-group">${label}</div>${items.map(o=>`<div role="option" aria-selected="false" id="offering-${esc(o.id)}" data-offering="${esc(o.id)}">${esc(offeringLabel(o))}</div>`).join('')}</div>`).join('') ||
            '<p class="offering-empty" role="status">No matching course offerings.</p>';
        }
        function offeringPicker() {
          return `<div class="field wide offering-picker"><label for="offering-search">Course offering</label><input type="hidden" name="course_offering_id" value=""><input id="offering-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="offering-options" autocomplete="off" placeholder="Search course code or title" required><div id="offering-options" role="listbox" aria-label="Course offerings" hidden>${offeringOptions()}</div></div>`;
        }
        function showOfferings(query="") {
          const list=$('#offering-options'),input=$('#offering-search');
          if(!list)return;
          list.innerHTML=offeringOptions(query);list.hidden=false;
          input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
        }
        function hideOfferings() {
          const list=$('#offering-options'),input=$('#offering-search');
          if(list)list.hidden=true;
          input?.setAttribute('aria-expanded','false');input?.removeAttribute('aria-activedescendant');
        }
        function chooseOffering(id) {
          const o=M.find('offerings',id),f=$('[data-form="enrollment"]');
          if(!o||!f||o.school_term_id!==f.elements.school_term_id.value)return;
          f.elements.course_offering_id.value=id;
          $('#offering-search').value=offeringLabel(o);
          $('#direct-slot').textContent=slotText(id);
          $('#prerequisite-preview').innerHTML=prereqTable(o.course_id);
          hideOfferings();$('#offering-search').focus();$('#offering-search').setSelectionRange(0,0);$('#offering-search').scrollLeft=0;hideOfferings();
        }
        document.addEventListener('focusin',e=>{
          if(e.target.id==='offering-search')showOfferings();
          else if(!e.target.closest?.('.offering-picker'))hideOfferings();
        });
        document.addEventListener('keydown',e=>{
          if(e.target.id!=='offering-search')return;
          const list=$('#offering-options');
          if(e.key==='Escape'||e.key==='Tab'){hideOfferings();return;}
          if(e.key==='ArrowDown'||e.key==='ArrowUp'){
            e.preventDefault();if(list.hidden)showOfferings(e.target.value);
            const options=[...list.querySelectorAll('[role="option"]')];
            if(!options.length)return;
            const current=options.findIndex(o=>o.id===e.target.getAttribute('aria-activedescendant'));
            const index=current<0?(e.key==='ArrowDown'?0:options.length-1):(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
            options.forEach((o,i)=>o.setAttribute('aria-selected',String(i===index)));
            e.target.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});
          } else if(e.key==='Enter'&&!list.hidden){
            e.preventDefault();const selected=list.querySelector('[aria-selected="true"]');
            if(selected)chooseOffering(selected.dataset.offering);
          }
        });
        function prereqTable(course) {
          return table(
            ["Prerequisite", "Type", "Result"],
            M.db.prerequisites
              .filter((p) => p.course_id === course)
              .map((p) => [
                esc(courseName(p.prerequisite_course_id)),
                badge(p.type),
                M.db.attempts.some(
                  (a) =>
                    a.student_id === student &&
                    M.course(a).id === p.prerequisite_course_id &&
                    M.passed(a),
                )
                  ? badge("passed", "Satisfied")
                  : badge(
                      "warning",
                      p.type === "strict"
                        ? "Confirmation needed"
                        : "Advisory only",
                    ),
              ]),
          );
        }
        function transferHistory() {
          const me = current().id,
            by = {},
            rows = [];
          M.db.assignments.forEach((a) =>
            (by[a.student_id] = by[a.student_id] || []).push(a),
          );
          for (const [sid, list] of Object.entries(by)) {
            list.sort((a, b) => a.start_date.localeCompare(b.start_date));
            for (let i = 1; i < list.length; i++)
              if (list[i - 1].adviser_id === me || list[i].adviser_id === me)
                rows.push({
                  sid,
                  from: list[i - 1].adviser_id,
                  to: list[i].adviser_id,
                  date: list[i].start_date,
                  reason: list[i].reason,
                });
          }
          return rows.sort((a, b) => b.date.localeCompare(a.date));
        }
        function reassign() {
          const assignments = M.db.assignments.filter(
            (a) => a.adviser_id === current().id && !a.end_date,
          );
          return (
            heading(
              "Keep support continuous.",
              "A reassignment preserves history and uses the same end and start date.",
            ) +
            panel(
              "Reassign advisees",
              "Select the students and their next academic adviser.",
              `<div class="panel-body">${form(
                "reassign",
                `<div class="wide">${assignments.map((a) => `<label style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)"><input type="checkbox" name="students" value="${a.student_id}"> ${esc(who(a.student_id))} <span class="muted">${esc(M.find("profiles", a.student_id).student_number)}</span></label>`).join("")}</div>` +
                  select(
                    "adviser_id",
                    "Incoming adviser",
                    M.db.profiles
                      .filter(
                        (p) =>
                          p.role === "adviser" &&
                          p.status === "active" &&
                          p.id !== current().id,
                      )
                      .map((p) => [p.id, p.full_name]),
                  ) +
                  field(
                    "start_date",
                    "Transition date",
                    M.today,
                    "date",
                    true,
                    `max="${M.today}"`,
                  ) +
                  textarea("reason", "Reason for reassignment"),
                "Review reassignment",
              )}</div>`,
            ) +
            panel(
              "Transfer history",
              "Every reassignment involving your advisees, newest first.",
              table(
                ["Transition date", "Student", "From", "To", "Reason"],
                transferHistory().map((t) => [
                  date(t.date),
                  `<strong>${esc(who(t.sid))}</strong><span class="course-title">${esc(M.find("profiles", t.sid).student_number)}</span>`,
                  esc(who(t.from)) + (t.from === current().id ? " (you)" : ""),
                  esc(who(t.to)) + (t.to === current().id ? " (you)" : ""),
                  esc(t.reason || "—"),
                ]),
              ),
            )
          );
        }
        function profile() {
          const u = M.find("profiles", student);
          return (
            heading(
              "Your student profile.",
              "Your identity and academic assignments are maintained by an administrator.",
            ) +
            `<div class="columns"><div class="stack">${panel("Profile details", "Read-only. Ask your administrator to correct these details.", `<div class="panel-body"><div class="form-grid">${field("full_name", "Full name", u.full_name, "text", false, "disabled") + field("student_number", "Student number", u.student_number, "text", false, "disabled") + field("email", "Institutional email", u.email, "email", false, "disabled") + field("role", "Role", u.role, "text", false, "disabled")+field('program','Program',studentProgram()?.name,'text',false,'disabled')+field('department','Department',deptName(u.department_id),'text',false,'disabled')+field('college','College',facultyName(profileCollege(u)),'text',false,'disabled')}</div></div>`)}</div><div class="stack">${assignmentPanel()}${panel("Curriculum assignment", "One active curriculum at a time.", `<div class="panel-body">${button("View curriculum history", "curriculum-history")}</div>`)}</div></div>`
          );
        }
        function settings() {
          return (
            heading("Settings.", "Manage how you sign in to SAAIS.") +
            panel(
              "Change password",
              "Use at least 8 characters.",
              `<div class="panel-body">${form("change-password", field("current_password", "Current password", "", "password", true, 'autocomplete="current-password"') + field("new_password", "New password", "", "password", true, 'minlength="8" autocomplete="new-password"') + field("confirm_password", "Confirm new password", "", "password", true, 'minlength="8" autocomplete="new-password"'), "Change password", 'class="settings-form"')}</div>`,
              "",
              "settings-panel",
            )
          );
        }
        function adminDashboard() {
          return (
            heading(
              "A connected academic foundation.",
              "Manage the people, curricula and course offerings behind every advising journey.",
              button("Provision account", "new-account", true),
            ) +
            stats([
              [
                "Active students",
                M.db.profiles.filter(
                  (p) => p.role === "student" && p.status === "active",
                ).length,
                "Fictional demonstration accounts",
              ],
              [
                "Academic advisers",
                M.db.profiles.filter((p) => p.role === "adviser").length,
                "Current and historical assignments",
              ],
              [
                "Courses",
                M.db.courses.length,
                "Shared catalog across curricula",
              ],
              ["Audit entries", M.db.audit.length, "Read-only change history"],
            ]) +
            quick("admin") +
            `<div class="stack">${panel(
              "School terms",
              "Course availability is specific to each calendar term.",
              table(
                ["Term", "Years", "State"],
                M.db.terms.map((t) => [
                  esc(termName(t.id)),
                  `${t.start_year} — ${t.end_year}`,
                  badge(
                    t.is_locked ? "na" : "active",
                    t.is_locked ? "Locked" : "Open",
                  ),
                ]),
              ),
              link("Manage terms", "admin/course-offerings"),
            )}${panel("Recent Activity", "The latest three changes to sample records.", activities(), button("View All", "activity"))}${panel("Presentation controls", "Start again with the original fictional dataset.", `<div class="panel-body">${button("Reset demo data", "reset")}</div>`)}</div>`
          );
        }
        function adminToolbar(opts = [], extra = "", label = "Filter") {
          return `<div class="toolbar"><label class="field search">Search records<input type="search" data-filter="admin" value="${esc(adminSearch)}" placeholder="Search name, code, or details"></label>${opts.length ? select("admin-filter", label, [["all", "All records"], ...opts], adminFilter) : ""}${extra}</div>`;
        }
        const matches = (x) =>
          JSON.stringify(x).toLowerCase().includes(adminSearch.toLowerCase());
        const manage = (kind, id) =>
          `<div class="actions">${button("Edit", "edit-" + kind, false, `data-id="${id}"`)}${button("Delete", "delete-" + kind, false, `data-id="${id}"`)}</div>`;
        function accounts(){
 const rows=M.db.profiles.filter(p=>matches({...p,department:deptName(p.department_id),college:facultyName(profileCollege(p)),program:M.find('programs',p.program_id)?.name}))
 .filter(p=>(adminFilter==='all'||p.role===adminFilter)&&(accountCollege==='all'||profileCollege(p)===accountCollege)&&(accountDepartment==='all'||p.department_id===accountDepartment))
 .map(p=>[`<strong>${esc(p.full_name)}</strong><span class="course-title">${esc(p.email)}</span>`,esc(p.role),esc(facultyName(profileCollege(p))),esc(p.role==='student'?M.find('programs',p.program_id)?.name:deptName(p.department_id)),badge(p.status),`<div class="actions">${button('Edit','edit-account',false,`data-id="${p.id}"`)}${button('Invite','invite-account',false,`data-id="${p.id}"`)}${p.role==='student'?button('Curriculum','account-curriculum',false,`data-id="${p.id}"`):''}</div>`]);
 return heading('The right access for every role.','Administrators assign students to a program and adviser; advisers belong to a college.',button('Provision account','new-account',true))+
 adminToolbar(['student','adviser','admin'],select('account-college','College',[['all','All colleges'],...M.db.faculties.map(f=>[f.id,f.name])],accountCollege)+select('account-department','Department',[['all','All departments'],...M.db.departments.filter(d=>accountCollege==='all'||d.faculty_id===accountCollege).map(d=>[d.id,d.name])],accountDepartment),'Role')+
 panel('Accounts',`${rows.length} matching records`,table(['Name & email','Role','College','Program / department','Status','Actions'],rows));
}
        function programs(){
 const rows=M.db.programs.filter(p=>matches({...p,college:facultyName(programCollege(p)),department:deptName(p.department_id)}))
 .filter(p=>(adminFilter==='all'||p.status===adminFilter)&&(accountCollege==='all'||programCollege(p)===accountCollege)&&(accountDepartment==='all'||p.department_id===accountDepartment))
 .map(p=>[esc(p.code),esc(p.name),esc(deptName(p.department_id)),esc(facultyName(programCollege(p))),badge(p.status),manage('program',p.id)]);
 return heading('Programs with a clear structure.','Each program belongs to a department within a college.',button('New program','new-program',true))+
 adminToolbar(['active','archived'],select('account-college','College',[['all','All colleges'],...M.db.faculties.map(f=>[f.id,f.name])],accountCollege)+select('account-department','Department',[['all','All departments'],...M.db.departments.filter(d=>accountCollege==='all'||d.faculty_id===accountCollege).map(d=>[d.id,d.name])],accountDepartment),'Status')+
 panel('Degree programs','Unique codes and names.',table(['Code','Program','Department','College','Status','Actions'],rows));
}
        function curricula() {
          const cv =
            M.find("curricula", selectedCurriculum) || M.db.curricula[0];
          if (!cv)
            return heading(
              "No curricula yet.",
              "Create a curriculum version.",
              button("Add version", "new-curriculum", true),
            );
          selectedCurriculum = cv.id;
          return (
            heading(
              "Shape the path to graduation.",
              "Versioned requirements keep past and present curricula distinct.",
              button("Add version", "new-curriculum", true),
            ) +
            `<div class="toolbar">${select(
              "curriculum-version",
              "Curriculum version",
              M.db.curricula.map((c) => [
                c.id,
                `${M.find("programs", c.program_id)?.code} · ${c.version_label}`,
              ]),
              cv.id,
            )}${button("Edit version", "edit-curriculum", false, `data-id="${cv.id}"`)}${button("Delete version", "delete-curriculum", false, `data-id="${cv.id}"`)}</div>` +
            stats([
              ["Required units", cv.total_units, "Full degree requirement"],
              [
                "Delinquency threshold",
                cv.delinquency_threshold,
                "Failed units per term",
              ],
              [
                "Effective from",
                date(cv.effective_start),
                "Version effectivity",
              ],
              ["Status", cv.status, "Curriculum lifecycle"],
            ]) +
            `<div class="stack">${M.db.curriculumTerms
              .filter((t) => t.curriculum_version_id === cv.id)
              .map((t) =>
                panel(
                  `Year ${t.year_level} · Semester ${t.term_sequence}`,
                  "Positional curriculum term; not a calendar school term.",
                  table(
                    ["Course / slot", "Required units", "Type", "Actions"],
                    M.db.slots
                      .filter((s) => s.curriculum_term_id === t.id)
                      .map((s) => [
                        esc(s.slot_label || courseName(s.course_id)),
                        s.nominal_units,
                        s.is_elective_slot
                          ? "Elective slot"
                          : "Required course",
                        manage("slot", s.id),
                      ]),
                  ),
                  `<div class="actions">${button("Add course / slot", "new-slot", false, `data-id="${t.id}"`)}${button("Edit term", "edit-curriculum-term", false, `data-id="${t.id}"`)}${button("Delete term", "delete-curriculum-term", false, `data-id="${t.id}"`)}</div>`,
                ),
              )
              .join(
                "",
              )}</div><div class="actions" style="margin-top:22px">${button("Add curriculum term", "new-curriculum-term", true)}</div><p class="muted" style="margin-top:18px">The sample curriculum is an excerpt. Add terms and requirements to demonstrate curriculum management.</p>`
          );
        }
        function courses() {
          return (
            heading(
              "One catalog. Many academic paths.",
              "Maintain course definitions, repeat policies and prerequisites.",
              button("New course", "new-course", true),
            ) +
            adminToolbar(
              ["active", "discontinued"],
              select(
                "course-faculty",
                "Faculty",
                [
                  ["all", "All faculties"],
                  ...M.db.faculties.map((f) => [f.id, f.name]),
                ],
                courseFaculty,
              ) +
                select(
                  "course-dept",
                  "Department",
                  [
                    ["all", "All departments"],
                    ...M.db.departments
                      .filter(
                        (d) =>
                          courseFaculty === "all" ||
                          d.faculty_id === courseFaculty,
                      )
                      .map((d) => [d.id, d.name]),
                  ],
                  courseDept,
                ),
              "Status",
            ) +
            panel(
              "Course catalog",
              "Different course codes never imply equivalence.",
              table(
                [
                  "Course",
                  "Units",
                  "Lecture / lab hours",
                  "Repeat policy",
                  "Status",
                  "Actions",
                ],
                M.db.courses
                  .filter((c) =>
                    matches({ ...c, department: deptName(c.department_id) }),
                  )
                  .filter(
                    (c) => adminFilter === "all" || c.status === adminFilter,
                  )
                  .filter(
                    (c) =>
                      (courseFaculty === "all" ||
                        M.find("departments", c.department_id)?.faculty_id ===
                          courseFaculty) &&
                      (courseDept === "all" || c.department_id === courseDept),
                  )
                  .map((c) => [
                    `<strong>${esc(c.code)}</strong><span class="course-title">${esc(c.title)}</span>`,
                    c.units,
                    `${c.lecture_hours} / ${c.lab_hours}`,
                    esc(c.repeatable_type.replaceAll("_", " ")),
                    badge(c.status),
                    `<div class="actions">${button("Edit", "edit-course", false, `data-id="${c.id}"`)}${button("Prerequisites", "prerequisites", false, `data-id="${c.id}"`)}${button("Delete", "delete-course", false, `data-id="${c.id}"`)}</div>`,
                  ]),
              ),
            )
          );
        }
        function offerings() {
          const t = M.find("terms", selectedTerm) || M.db.terms[0];
          selectedTerm = t.id;
          const inFilter = (o) => {
              const c = M.find("courses", o.course_id);
              return offerFilter === "faculty"
                ? M.find("departments", c.department_id)?.faculty_id ===
                    offerFilterValue
                : offerFilter === "department"
                  ? c.department_id === offerFilterValue
                  : true;
            },
            valueOpts =
              offerFilter === "faculty"
                ? M.db.faculties.map((f) => [f.id, f.name])
                : M.db.departments.map((d) => [d.id, d.name]);
          return (
            heading(
              "Make course availability explicit.",
              "Offerings belong to a school term. Discontinued courses may be offered by request.",
              button("New offering", "new-offering") +
                button("New school term", "new-term", true),
            ) +
            `<div class="toolbar">${select(
              "selected-term",
              "School term",
              M.db.terms.map((t) => [t.id, termName(t.id)]),
              t.id,
            )}${select(
              "offer-filter",
              "Filter offerings",
              [
                ["all", "All"],
                ["faculty", "Faculty"],
                ["department", "Department"],
              ],
              offerFilter,
            )}${offerFilter === "all" ? "" : select("offer-filter-value", offerFilter === "faculty" ? "Faculty" : "Department", valueOpts, offerFilterValue)}<div class="toolbar-actions">${button("Term settings", "edit-term", false, `data-id="${t.id}"`)}</div></div><div class="notice ${t.is_locked ? "" : "green"}">${t.is_locked ? "This term is locked. Adviser enrollment and grade edits are blocked." : "This term is open for enrollment records and grade changes."}${t.override_flag ? ` Admin override is enabled by ${esc(who(t.override_actor_id))} on ${date(t.override_at)}.` : ""}</div>` +
            panel(
              "Course offerings",
              `Start year ${t.start_year} · End year ${t.end_year}`,
              table(
                ["Course", "Units", "Department", "Availability", "Actions"],
                M.db.offerings
                  .filter((o) => o.school_term_id === t.id)
                  .filter(inFilter)
                  .map((o) => {
                    const c = M.find("courses", o.course_id);
                    return [
                      esc(courseName(o.course_id)),
                      c.units,
                      `${esc(deptName(c.department_id))}<span class="course-title">${esc(deptFaculty(c.department_id))}</span>`,
                      badge(
                        o.is_by_request ? "warning" : "active",
                        o.is_by_request ? "By request" : "Regular offering",
                      ),
                      manage("offering", o.id),
                    ];
                  }),
              ),
            )
          );
        }
        function faculties() {
          const fRows = M.db.faculties.map((f) => [
              `<strong>${esc(f.name)}</strong>`,
              M.db.departments.filter((d) => d.faculty_id === f.id).length,
              M.db.programs.filter((p) => p.faculty_id === f.id).length,
              manage("faculty", f.id),
            ]),
            dRows = M.db.departments.map((d) => [
              `<strong>${esc(d.name)}</strong>`,
              esc(facultyName(d.faculty_id)),
              M.db.courses.filter((c) => c.department_id === d.id).length,
              M.db.profiles.filter((p) => p.department_id === d.id).length,
              manage("department", d.id),
            ]);
          return (
            heading(
              "Where every program and course belongs.",
              "Faculties and departments are chosen from dropdowns in programs, courses and accounts.",
              button("New department", "new-department") +
                button("New faculty", "new-faculty", true),
            ) +
            `<div class="stack">${panel("Faculties", `${fRows.length} faculties`, table(["Faculty", "Departments", "Programs", "Actions"], fRows))}${panel("Departments", `${dRows.length} departments`, table(["Department", "Faculty", "Courses", "Accounts", "Actions"], dRows))}</div>`
          );
        }
        function auditPage() {
          return (
            heading(
              "Every decision leaves a record.",
              "Inspect who changed what, when, and why. Audit entries are read-only.",
              button("Export CSV", "export", true),
            ) +
            adminToolbar() +
            panel(
              "Audit log",
              "Includes old and new values, the actor, entity and reason.",
              table(
                ["When", "Actor", "Action", "Entity", ""],
                M.db.audit
                  .filter(matches)
                  .map((a) => [
                    date(a.created_at),
                    esc(who(a.actor_id)),
                    esc(a.action),
                    `${esc(a.entity_type)}<span class="course-title">${esc(a.entity_id)}</span>`,
                    button(
                      "View details",
                      "audit-detail",
                      false,
                      `data-id="${a.id}"`,
                    ),
                  ]),
              ),
            )
          );
        }
        function docs() {
          return (
            heading(
              "A guide to this prototype.",
              "SAAIS · Student Academic Advising Information System",
              link("Open demo", "login", true),
            ) +
            `<div class="stack">${panel("Try a complete advising workflow", "All changes stay in this browser.", `<div class="panel-body"><ol style="line-height:2"><li>Choose Adviser in the presentation bar.</li><li>Open Maria’s record, review the checklist and recorded exceptions.</li><li>Record an approved enrollment and optional missing grades; confirm first-time midterm entry.</li><li>Open History to see the enrollment. Add a staff-only note.</li><li>Choose Admin and inspect the new audit entry.</li></ol><p class="muted">Demo sign-in uses the pre-provisioned accounts shown on the sign-in screen. No credentials are sent anywhere. A student view never displays advising notes or remarks.</p></div>`)}${panel(
              "API contract preview",
              "The real product uses an OpenAPI contract and Redoc.",
              `<div class="panel-body"><p class="muted">The production /docs route will render curated developer documentation and Redoc from repository docs/openapi. This browser mockup shows an operation preview; it does not run the production backend.</p>${table(
                ["Operation", "Purpose"],
                [
                  [
                    "POST /functions/v1/enrollment-attempts",
                    "Record enrollment or fill missing grades with atomic validation",
                  ],
                  [
                    "POST /functions/v1/adviser-reassignment",
                    "Preserve zero-gap assignment history",
                  ],
                  [
                    "POST /functions/v1/equivalency-decisions",
                    "Apply per-student equivalency",
                  ],
                  [
                    "POST /functions/v1/recompute-lapsed-inc",
                    "Server scheduler only; no browser action",
                  ],
                ],
              )}</div>`,
            )}${panel("Rules worth demonstrating", "Based on the supplied SRS.", `<div class="panel-body"><details open><summary>INC and GWA</summary><p class="muted">Grades use 0.25 increments from 1.00 through 5.00. Only the final/completion grade determines the result: ≤3.00 passes; >3.00 fails. A lapsed INC remains INC; it counts as 5.00 only in calculation. Completion records are separate from attempts; completed INC displays Passed/Failed and completion remains available before the deadline in locked terms.</p></details><details><summary>Mappings and equivalencies</summary><p class="muted">Both are per-student decisions and can be edited or revoked with an audit trail. Equivalencies use passed source attempts, do not create new attempts, and do not recompute GWA.</p></details><details><summary>Prototype boundary</summary><p class="muted">Local role guards illustrate behavior; they are not security. OAuth, email delivery, database transactions, RLS, immutable storage and daily jobs require the future backend. No server-side actions are performed.</p></details></div>`)}</div>`
          );
        }
        function auth(mode) {
          const recovery = mode === "forgot-password",
            reset = mode === "reset-password",
            invite = mode === "invite";
          return `<div class="auth-page"><section class="auth-story"><a class="brand" href="#/"><img src="logo-mark.png" alt=""><span><b class="dsp">SAAIS</b></span></a><div><h1>A clearer path.<br>A supported journey.</h1><p>Connect every course, conversation and academic decision in one advising workspace.</p></div><p>Student Academic Advising Information System<br>Forest, gold, and a future in view.</p></section><section class="auth-form"><h2>${recovery ? "Reset your password." : reset ? "Choose a new password." : invite ? "You’re invited." : "Welcome back."}</h2><p class="muted">${recovery ? "Enter your provisioned email to preview the recovery flow." : reset || invite ? "Set a password for your provisioned demo account." : "Sign in with your institution-provisioned account."}</p>${form(recovery ? "forgot" : reset || invite ? "password" : "login", field("email", "Institutional email", invite ? dialogContext.inviteEmail || "maria.bautista@example.edu.ph" : "", "email") + (!recovery ? field("password", "Password", "", "password", true, 'minlength="8" autocomplete="current-password"') : "") + (reset || invite ? field("confirm", "Confirm password", "", "password", true, 'minlength="8"') : ""), recovery ? "Preview recovery link" : reset || invite ? "Set password" : "Sign in")}${!recovery && !reset && !invite ? `<div class="actions">${button("Continue with Google", "google")}</div><p style="margin-top:20px"><a href="#/forgot-password">Forgot password?</a></p><div class="demo-accounts"><p class="muted">Presentation access · no real credentials needed.<br>Choose a provisioned account to fill the form. Demo password: <strong>Demo2026!</strong></p>${["student", "adviser", "admin"].map((r) => button(r[0].toUpperCase() + r.slice(1), "fill-login", false, `data-role="${r}"`)).join("")}</div>` : link("Back to sign in", "login")}<p class="muted" style="margin-top:24px">Accounts are created by an administrator. Contact your institution if you need access.</p></section></div>`;
        }
        function render() {
          let slug = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
          if (slug === "student/enrollment-history") slug = "student/history";
          if (slug.startsWith("invite/")) slug = "invite";
          const detailMatch=/^adviser\/advisees\/([^/]+)(?:\/(advising|checklist|grades|record-grades|history|notes))?$/.exec(slug);
          if(detailMatch&&M.find('profiles',detailMatch[1])?.role==='student'){if(student!==detailMatch[1])advisingSelected.clear();student=detailMatch[1];slug='adviser/advisees/'+(detailMatch[2]||'detail');}
          if(slug==='adviser/advisees/notes')slug='adviser/advisees/advising';
          if(slug==='adviser/enrollment/new')slug='adviser/advisees/record-grades';
          route = slug;
          const restricted = /^(student|adviser|admin)\//.exec(slug);
          if (restricted && (!current() || current().status !== "active")) {
            go("login");
            return;
          }
          if (slug === "settings" && !current()) {
            go("login");
            return;
          }
          if (restricted && restricted[1] !== role()) {
            go(role() + "/dashboard");
            notify(
              "This screen belongs to another role. Use the demo role switch to explore it.",
            );
            return;
          }
          if (role() === "student") student = current().id;
          if (
            slug.startsWith("adviser/advisees/") &&
            !M.db.assignments.some(
              (a) => a.student_id === student && a.adviser_id === current()?.id,
            )
          ) {
            student =
              M.db.assignments.find((a) => a.adviser_id === current()?.id)
                ?.student_id || "s1";
          }
          const legacy = $$(".view");
          legacy.forEach((v) => {
            v.hidden = true;
            v.classList.remove("active");
          });
          let root = $("#product-view");
          if (!root) {
            root = document.createElement("div");
            root.id = "product-view";
            document.body.insertBefore(root, $("#proto-bar"));
          }
          root.hidden = false;
          let content = "",
            title = "";
          const screens = {
            settings: [settings, "Settings"],
            "student/dashboard": [studentDashboard, "Dashboard"],
            "student/checklist": [() => checklist(false), "Checklist"],
            "student/grades": [() => grades(false), "Grades"],
            "student/history": [() => history(false), "History"],
            "student/profile": [profile, "Profile"],
            "adviser/dashboard": [adviserDashboard, "Dashboard"],
            "adviser/advisees": [roster, "Advisees"],
            "adviser/advisees/detail": [overview, "Student overview"],
            "adviser/advisees/advising": [advising, "Advising"],
            "adviser/advisees/checklist": [
              () => checklist(true),
              "Student checklist",
            ],
            "adviser/advisees/grades": [() => grades(true), "Student grades"],
            "adviser/advisees/record-grades": [record, "Record enrollment"],
            "adviser/advisees/history": [
              () => history(true),
              "Student history",
            ],
            
            "adviser/reassignment": [reassign, "Reassignment"],
            "admin/dashboard": [adminDashboard, "Dashboard"],
            "admin/accounts": [accounts, "Accounts"],
            "admin/faculties": [faculties, "Faculty & departments"],
            "admin/programs": [programs, "Programs"],
            "admin/curricula": [curricula, "Curricula"],
            "admin/courses": [courses, "Course catalog"],
            "admin/course-offerings": [offerings, "Terms & offerings"],
            "admin/audit-log": [auditPage, "Audit log"],
          };
          if (screens[slug]) {
            [content, title] = [screens[slug][0](), screens[slug][1]];
            root.innerHTML = shell(content, title, crumbsFor(slug, title));
          } else if (
            ["login", "forgot-password", "reset-password", "invite"].includes(
              slug,
            )
          ) {
            root.innerHTML = auth(slug);
            title = "Sign in";
          } else if (slug === "docs") {
            root.innerHTML = current()
              ? shell(docs(), "Documentation", [
                  [
                    {
                      admin: "Administration",
                      adviser: "Advising workspace",
                      student: "My academic journey",
                    }[role()],
                    role() + "/dashboard",
                  ],
                  ["Documentation", null],
                ])
              : `<div class="app"><main style="width:100%">${docs()}</main></div>`;
            title = "Documentation";
          } else {
            root.hidden = true;
            const v =
              legacy.find((v) => v.dataset.route === slug) ||
              legacy.find((v) => v.dataset.route === "");
            if (v) {
              v.hidden = false;
              v.classList.add("active");
            }
            title = "Academic advising";
            enhanceLanding();
          }
          document.title = `${title} · SAAIS`;
          $$("#proto-bar [data-role]").forEach((b) =>
            b.classList.toggle("active", b.dataset.role === role()),
          );
          const menu = $('[data-action="menu"]');
          if (menu) menu.classList.add("mobile-menu");
        }
        function crumbsFor(slug, title) {
          const r = role(),
            base = {
              admin: "Administration",
              adviser: "Advising workspace",
              student: "My academic journey",
            }[r],
            root = [base, r + "/dashboard"];
          if (slug === "adviser/advisees/detail")
            return [
              root,
              ["Advisees", "adviser/advisees"],
              [who(student), null],
            ];
          if (slug.startsWith("adviser/advisees/"))
            return [
              root,
              ["Advisees", "adviser/advisees"],
              [who(student), "adviser/advisees/detail"],
              [
                {
                  checklist: "Checklist",
                  grades: "Grades",
                  "record-grades": "Record enrollment",
                  advising: "Advising",
                  history: "History",
                  notes: "Notes",
                }[slug.split("/").pop()] || title,
                null,
              ],
            ];
          return [root, [title, null]];
        }
        function enhanceLanding() {
          const v = $(".view.active");
          if (!v) return;
          v.querySelectorAll(
            'a[href="#"],button,[style*="cursor: pointer"]',
          ).forEach((el) => {
            if (!el.matches("a,button")) {
              el.setAttribute("role", "button");
              el.tabIndex = 0;
            }
          });
        }
        function editDialog(kind, id) {
          const tables = {
            account: "profiles",
            faculty: "faculties",
            department: "departments",
            program: "programs",
            curriculum: "curricula",
            "curriculum-term": "curriculumTerms",
            slot: "slots",
            course: "courses",
            term: "terms",
            offering: "offerings",
            prerequisite: "prerequisites",
          };
          const existing = id ? M.find(tables[kind], id) : null;
          const x = existing || {};
          let fields = "";
          const opts = (table, label) =>
            M.db[table].map((x) => [x.id, label(x)]);
          if(kind==='account')fields=field('full_name','Full name',x.full_name)+field('email','Institutional email',x.email,'email')+
 select('role','Role',['student','adviser','admin'],x.role||'student')+select('status','Status',['active','invited','disabled'],x.status||'invited')+
 field('student_number','Student number (students only)',x.student_number,'text',false)+
 select('program_id','Program (students only)',[['','Not applicable'],...opts('programs',p=>p.name)],x.program_id||'',false)+
 select('faculty_id','College (advisers only)',[['','Not applicable'],...opts('faculties',f=>f.name)],x.role==='adviser'?x.faculty_id:'',false)+
 '<p class="muted wide">A student’s department and college come from their program. An adviser is assigned to a college.</p>'+
 (!existing?select('adviser_id','Initial adviser (students only)',opts('profiles',p=>p.full_name).filter(([id])=>M.find('profiles',id).role==='adviser'&&M.find('profiles',id).status==='active'),'a1')+
 select('curriculum_version_id','Initial curriculum (students only)',opts('curricula',c=>`${M.find('programs',c.program_id).code} · ${c.version_label}`),'cv1'):'');
              if (kind === "faculty")
            fields = field("name", "Faculty name", x.name);
          if (kind === "department")
            fields =
              field("name", "Department name", x.name) +
              select(
                "faculty_id",
                "Faculty",
                opts("faculties", (f) => f.name),
                x.faculty_id || M.db.faculties[0]?.id,
              );
          if(kind==='program')fields=field('code','Program code',x.code)+field('name','Program name',x.name)+select('department_id','Department',opts('departments',d=>d.name+' · '+facultyName(d.faculty_id)),x.department_id||M.db.departments[0]?.id)+field('nominal_duration','Nominal duration',x.nominal_duration||'4 years')+select('status','Status',['active','archived'],x.status||'active');
              if (kind === "curriculum")
            fields =
              select(
                "program_id",
                "Program",
                opts("programs", (p) => p.name),
                x.program_id || "p1",
              ) +
              field("version_label", "Version label", x.version_label) +
              field(
                "effective_start",
                "Effective start",
                x.effective_start || M.today,
                "date",
              ) +
              field(
                "effective_end",
                "Effective end (optional)",
                x.effective_end,
                "date",
                false,
              ) +
              field(
                "delinquency_threshold",
                "Delinquency threshold",
                x.delinquency_threshold || 12,
                "number",
                true,
                'min="0.25" step="0.25"',
              ) +
              field(
                "total_units",
                "Required total units",
                x.total_units || 156,
                "number",
                true,
                'min="1" step="0.25"',
              ) +
              select(
                "status",
                "Status",
                ["draft", "active", "teach_out", "closed"],
                x.status || "draft",
              );
          if (kind === "curriculum-term")
            fields =
              field(
                "year_level",
                "Year level",
                x.year_level || 1,
                "number",
                true,
                'min="1" max="8"',
              ) +
              field(
                "term_sequence",
                "Term sequence",
                x.term_sequence || 1,
                "number",
                true,
                'min="1" max="3"',
              );
          if (kind === "slot")
            fields =
              select(
                "course_id",
                "Course (blank for elective)",
                [
                  ["", "Elective slot"],
                  ...opts("courses", (c) => `${c.code} — ${c.title}`),
                ],
                x.course_id || "",
                false,
              ) +
              field(
                "nominal_units",
                "Required units",
                x.nominal_units || 3,
                "number",
                true,
                'min="0.25" step="0.25"',
              );
          if (kind === "course")
            fields =
              field("code", "Course code", x.code) +
              field("title", "Course title", x.title) +
              select(
                "department_id",
                "Department",
                opts("departments", (d) => d.name),
                x.department_id || M.db.departments[0]?.id,
              ) +
              field(
                "lecture_hours",
                "Lecture hours",
                x.lecture_hours ?? 3,
                "number",
                true,
                'min="0" step="0.25"',
              ) +
              field(
                "lab_hours",
                "Lab hours",
                x.lab_hours ?? 0,
                "number",
                true,
                'min="0" step="0.25"',
              ) +
              field(
                "units",
                "Units",
                x.units ?? 3,
                "number",
                true,
                'min="0.25" step="0.25"',
              ) +
              select(
                "status",
                "Status",
                ["active", "discontinued"],
                x.status || "active",
              ) +
              select(
                "repeatable_type",
                "Repeat policy",
                ["none", "grade_replacement", "additional_credit"],
                x.repeatable_type || "none",
              );
          if (kind === "term") {
            const sy = x.start_year || new Date(M.today).getFullYear(),
              ey = x.end_year || sy + 1,
              tt = x.term_type || "1st Semester",
              yr = 'min="2000" max="2100" step="1"';
            fields =
              field("start_year", "Start year", sy, "number", true, yr) +
              field("end_year", "End year", ey, "number", true, yr) +
              select(
                "term_type",
                "Term type",
                ["1st Semester", "2nd Semester", "Summer"],
                tt,
              ) +
              field(
                "school_year",
                "School year (auto-generated)",
                M.schoolYear(tt, sy, ey),
                "text",
                false,
                "readonly",
              ) +
              field("ends_on", "Actual term end date", x.ends_on || "", "date", true) +
              select(
                "is_locked",
                "Term lock",
                [
                  ["false", "Open"],
                  ["true", "Locked"],
                ],
                String(x.is_locked || false),
              ) +
              select(
                "override_flag",
                "Admin override",
                [
                  ["false", "Disabled"],
                  ["true", "Enabled"],
                ],
                String(x.override_flag || false),
              );
          }
          if (kind === "offering")
            fields =
              select(
                "school_term_id",
                "School term",
                opts("terms", (t) => termName(t.id)),
                x.school_term_id || selectedTerm,
              ) +
              select(
                "course_id",
                "Course",
                opts("courses", (c) => `${c.code} — ${c.title}`),
                x.course_id || "c1",
              ) +
              select(
                "is_by_request",
                "Availability",
                [
                  ["false", "Regular offering"],
                  ["true", "By request"],
                ],
                String(x.is_by_request || false),
              );
          if (kind === "prerequisite")
            fields =
              select(
                "prerequisite_course_id",
                "Prerequisite course",
                opts("courses", (c) => `${c.code} — ${c.title}`).filter(
                  ([cid]) => cid !== dialogContext.course,
                ),
                x.prerequisite_course_id,
              ) +
              select(
                "type",
                "Prerequisite type",
                ["strict", "co_requisite", "recommended"],
                x.type || "strict",
              );
          modal(
            `${existing ? "Edit" : "New"} ${kind.replaceAll("-", " ")}`,
            form("entity", fields, "Save record"),
            {
              kind,
              table: tables[kind],
              id: existing?.id,
              parent: dialogContext.parent,
              course: dialogContext.course,
            },
          );
        }
        function mappingDialog(kind, id) {
          if (!canEdit()) return notify("Historical records are read-only.");
          const x = id
            ? M.find(kind === "mapping" ? "mappings" : "equivalencies", id)
            : {};
          const ats = M.db.attempts.filter(
            (a) =>
              a.student_id === student && (kind === "mapping" || M.passed(a)),
          );
          const slots = studentSlots().filter(
            (s) => kind !== "mapping" || s.is_elective_slot,
          );
          modal(
            kind === "mapping"
              ? "Map an elective course"
              : "Record equivalency",
            `<p>${kind === "mapping" ? "Connect one enrollment record to an elective slot. Actual credited units will appear in the checklist." : "Use the original passed attempt to satisfy one requirement. This does not create a new attempt or change GWA."}</p>` +
              form(
                "exception",
                select(
                  "attempt_id",
                  "Source attempt",
                  ats.map((a) => [
                    a.id,
                    `${M.course(a).code} · ${termName(M.find("offerings", a.course_offering_id).school_term_id)} · ${labels[a.status]}`,
                  ]),
                  x?.attempt_id,
                ) +
                  select(
                    "slot_id",
                    "Destination slot",
                    slots.map((s) => [
                      s.id,
                      `${slotName(s.id)} · ${s.nominal_units} units`,
                    ]),
                    x?.curriculum_term_course_id ||
                      x?.destination_curriculum_term_course_id,
                  ) +
                  (kind === "equivalency"
                    ? select(
                        "decision_type",
                        "Decision type",
                        [
                          ["transfer_equivalency", "Transfer equivalency"],
                          [
                            "discontinued_course_equivalency",
                            "Discontinued-course equivalency",
                          ],
                        ],
                        x?.decision_type,
                      )
                    : "") +
                  textarea(
                    "justification",
                    "Justification / reason for change",
                    x?.justification || "",
                  ),
                "Save decision",
              ),
            { kind, id },
          );
        }
        function gradeDialog(id,inc=false,override=false){
 const a=M.find('attempts',id);if(!a||a.student_id!==student||!canEdit())return notify('Only the current adviser can change this record.');
 const t=M.find('terms',M.find('offerings',a.course_offering_id).school_term_id),r=M.db.resolutions.find(r=>r.attempt_id===id);
 if(inc&&a.inc_deadline<M.today)return modal('INC deadline has passed',`<p>${esc(M.course(a).code)} remains INC and counts as 5.00 for GWA.</p>`);
 if(!inc&&isLocked(t))return modal('This school term is locked','<p>Grade and status corrections are blocked. INC completion remains available before its deadline.</p>');
 if(override&&(!['failed'].includes(M.displayStatus(a))||r||a.status==='inc'))return notify('Choose a failed prerequisite attempt without an INC completion.');
 const fields=inc||r?field('completion_grade','Completion grade',r?.completion_grade??'','number',true,'min="1" max="5" step="0.25"'):
 override?field('final_grade','Corrected prerequisite final grade',a.final_grade,'number',true,'min="1" max="3" step="0.25"'):
 select('status','Status',['passed','failed','currently_enrolled','inc','dr','na'],a.status)+field('midterm_grade','Midterm grade',a.midterm_grade,'number',false,'min="1" max="5" step="0.25"')+field('final_grade','Final grade',a.final_grade,'number',false,'min="1" max="5" step="0.25"');
 modal(inc?'Resolve incomplete grade':override?'Override prerequisite grade':'Correct a grade',`<p>${esc(courseName(M.course(a).id))} · ${esc(who(student))}</p>`+
 (override?'<div class="notice">This corrects the original prerequisite grade, changes GWA, and clears this prerequisite for downstream courses. No admin approval is required.</div>':'')+
 form(inc?'resolve-inc':override?'prerequisite-grade':'grade',fields+textarea('reason',override?'Reason for prerequisite grade override':'Reason'),'Save grade'),{id});
}
        function curriculumHistory() {
          modal(
            "Curriculum assignment history",
            table(
              ["Curriculum", "Start", "End", "Reason"],
              M.db.curriculumAssignments
                .filter((a) => a.student_id === student)
                .map((a) => [
                  esc(
                    M.find("curricula", a.curriculum_version_id)?.version_label,
                  ),
                  date(a.start_date),
                  date(a.end_date),
                  esc(a.reason),
                ]),
            ),
          );
        }
        function enrollSave(data, override = false, reason = "") {
          const a = {
            id: M.uid(),
            student_id: data.student_id,
            course_offering_id: data.course_offering_id,
            curriculum_term_course_id: data.curriculum_term_course_id || null,
            status: data.status,
            midterm_grade:
              data.midterm_grade === "" ? null : Number(data.midterm_grade),
            final_grade:
              data.final_grade === "" ? null : Number(data.final_grade),
            inc_deadline: data.status === "inc" ? data.inc_deadline : null,
            prerequisite_override: override,
            prerequisite_override_reason: reason,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          M.db.attempts.push(a);
          audit(
            override ? "attempt.prerequisite_override" : "attempt.created",
            "Attempt",
            a.id,
            null,
            a,
            reason,
          );
          student = a.student_id;
          close();
          M.save();
          go("adviser/advisees/record-grades");
          notify("Enrollment recorded. History and audit log updated.");
        }
        function isLocked(term) {
          return term.is_locked && !(role() === "admin" && term.override_flag);
        }
        function requireStaff() {
          if (!["adviser", "admin"].includes(role()) || !canEdit())
            throw Error(
              "Only the current adviser can change this student record.",
            );
        }
        function validateGrade(v) {
          if (v === "" || v == null) return;
          const n = Number(v);
          if (
            !Number.isFinite(n) ||
            n < 1 ||
            n > 5 ||
            n * 4 !== Math.round(n * 4)
          )
            throw Error("Grades must be 1.00–5.00 in 0.25 increments.");
        }
        function validateResult(status, value) {
          validateGrade(value);
          if (["passed", "failed"].includes(status)) {
            if (value === "" || value == null)
              throw Error("Enter a final grade for Passed or Failed.");
            if (
              (status === "passed" && Number(value) > 3) ||
              (status === "failed" && Number(value) <= 3)
            )
              throw Error(
                "Passed requires a grade of 3.00 or better; Failed requires a grade above 3.00.",
              );
          } else if (value !== "" && value != null)
            throw Error(
              "Only Passed and Failed attempts have a final grade. Resolve INC using its completion record.",
            );
        }
        document.addEventListener(
          "submit",
          (e) => {
            const f = e.target.closest("[data-form]");
            if (!f) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!f.reportValidity()) return;
            const d = Object.fromEntries(new FormData(f));
            for (const k in d) if (typeof d[k] === "string") d[k] = d[k].trim();
            const kind = f.dataset.form;
            try {
              if (kind === "login") {
                const u = M.db.profiles.find((p) => p.email === d.email);
                if (
                  !u ||
                  u.status !== "active" ||
                  d.password !== (u.demo_password || "Demo2026!")
                )
                  throw Error(
                    "Account or demo password not recognized. Use a provisioned demo account or contact an administrator.",
                  );
                setSession(u.id);
                go(u.role + "/dashboard");
                return;
              }
              if (kind === "change-password") {
                const u = current();
                if (!u) throw Error("Sign in to change your password.");
                if (d.current_password !== (u.demo_password || "Demo2026!"))
                  throw Error("Your current password is incorrect.");
                if (d.new_password.length < 8)
                  throw Error(
                    "Use at least 8 characters for the new password.",
                  );
                if (d.new_password === d.current_password)
                  throw Error(
                    "Choose a password different from your current one.",
                  );
                if (d.new_password !== d.confirm_password)
                  throw Error(
                    "The new passwords do not match. Re-enter both fields.",
                  );
                u.demo_password = d.new_password;
                M.save();
                f.reset();
                f.querySelector(".error").textContent = "";
                notify("Password changed. Use it the next time you sign in.");
                return;
              }
              if (kind === "forgot") {
                modal(
                  "Recovery link preview",
                  `<p>If this email belongs to a provisioned account, the product would send a recovery email. No email is sent by this demo.</p>${link("Continue to reset password", "reset-password", true)}`,
                );
                return;
              }
              if (kind === "password") {
                const u = M.db.profiles.find((p) => p.email === d.email);
                if (!u || u.status === "disabled")
                  throw Error(
                    "No eligible invitation or recovery account. Contact an administrator.",
                  );
                if (d.password !== d.confirm)
                  throw Error("Passwords do not match. Re-enter both fields.");
                u.demo_password = d.password;
                u.status = "active";
                M.save();
                go("login");
                notify("Demo password saved. You can now sign in.");
                return;
              }
              if (kind === "google") {
                const u = M.db.profiles.find(
                  (p) => p.email === d.email && p.status === "active",
                );
                if (!u)
                  throw Error(
                    "Google email must exactly match a provisioned account. Please contact an administrator.",
                  );
                setSession(u.id);
                close();
                go(u.role + "/dashboard");
                return;
              }
              if (kind === "note" || kind === "remark") {
                requireStaff();
                if (!d.body_text) throw Error("Write a note before saving.");
                const item = {
                  id: M.uid(),
                  student_id: student,
                  authored_by: current().id,
                  body_text: d.body_text,
                  created_at: new Date().toISOString(),
                };
                if (kind === "remark") {
                  item.attempt_id = d.attempt_id || null;
                  item.curriculum_term_course_id = d.slot_id || null;
                  if (!item.attempt_id && !item.curriculum_term_course_id)
                    throw Error("Choose an attempt or checklist slot.");
                }
                M.db[kind === "note" ? "notes" : "remarks"].unshift(item);
                audit(
                  kind + ".created",
                  kind === "note" ? "AdvisingNote" : "AttemptRemark",
                  item.id,
                  null,
                  item,
                );
                close();
                persist("Staff-only " + kind + " saved.");
                return;
              }
              if (kind === "advising-chat") {
                const text = (d.message || "").trim();
                if (!text) return;
                const msgs = chatFor(student);
                msgs.push({ mine: true, text });
                msgs.push({
                  mine: false,
                  text: demoAnswer(text),
                });
                render();
                $('[data-form="advising-chat"] [name="message"]')?.focus();
                return;
              }
              if(kind==='enrollment'||kind==='confirm-enrollment'){
 const data=kind==='confirm-enrollment'?dialogContext.enrollment:d;
 data.student_id=student;requireStaff();
 const o=M.find('offerings',data.course_offering_id),t=M.find('terms',o?.school_term_id);
 if(!o||o.school_term_id!==data.school_term_id)throw Error('Choose a course offering in the selected school term.');
 if(isLocked(t))throw Error('This school term is locked. Grade entry and enrollment are blocked.');
 validateGrade(data.midterm_grade);validateGrade(data.final_grade);
 const existing=M.db.attempts.find(a=>a.student_id===student&&a.course_offering_id===o.id);
 if(existing){
  if(data.midterm_grade===''&&data.final_grade==='')throw Error('The student is already enrolled in this course offering.');
  const completion=M.db.resolutions.find(r=>r.attempt_id===existing.id);
  if((data.midterm_grade!==''&&existing.midterm_grade!=null)||(data.final_grade!==''&&(existing.final_grade!=null||completion))){throw Error('A submitted grade already exists, even if the value is identical. Nothing was saved. Go to the Grades tab to edit it.');}
  if(existing.status==='inc')throw Error('Use the Grades tab to resolve or correct an INC.');
 }else{
  const missing=M.db.prerequisites.filter(p=>p.course_id===o.course_id&&p.type==='strict'&&!courseCleared(p.prerequisite_course_id));
  if(missing.length){modal('Prerequisite not satisfied',`<p>${missing.map(p=>esc(courseName(p.prerequisite_course_id))).join(', ')} must pass before this enrollment is recorded.</p><p>To override a failed prerequisite, correct its final grade in Grades with a reason. The correction affects GWA and clears downstream courses. No admin approval is needed.</p><div class="actions">${button('Cancel','close')}${link('Review prerequisite grades','adviser/advisees/grades',true)}</div>`);return;}
  if(kind!=='confirm-enrollment'&&data.midterm_grade!==''){modal('Confirm enrollment and grades',`<p>Enroll ${esc(who(student))} in ${esc(courseName(o.course_id))} and record midterm ${Number(data.midterm_grade).toFixed(2)}${data.final_grade!==''?' and final '+Number(data.final_grade).toFixed(2):''}?</p>`+form('confirm-enrollment','','Confirm enrollment'),{enrollment:{...data}});return;}
 }
 Object.assign(data,{status:data.final_grade===''?'currently_enrolled':Number(data.final_grade)<=3?'passed':'failed',curriculum_term_course_id:autoSlot(o.id)?.id||''});
 close();saveRecordEntry(data);return;
}
              if(kind==='override'){throw Error('Use Grades to correct the failed prerequisite grade with a reason.');}
              if(['grade','resolve-inc','prerequisite-grade'].includes(kind)){
 requireStaff();const a=M.find('attempts',dialogContext.id);if(!a||a.student_id!==student)throw Error('Attempt not found for this student.');
 const old=structuredClone(a),t=M.find('terms',M.find('offerings',a.course_offering_id).school_term_id),r=M.db.resolutions.find(r=>r.attempt_id===a.id);
 if(!d.reason)throw Error('Enter a reason for this change.');
 if(kind==='resolve-inc'){
  if(a.status!=='inc'||r)throw Error('This attempt is not an unresolved INC.');
  if(a.inc_deadline<M.today)throw Error('The INC deadline has passed.');
  validateGrade(d.completion_grade);const x={id:M.uid(),attempt_id:a.id,completion_grade:Number(d.completion_grade),resolved_at:new Date().toISOString()};M.db.resolutions.push(x);audit('inc.completed','INCResolution',x.id,null,x,d.reason);
 }else{
  if(isLocked(t))throw Error('The school term is locked. Grade and status corrections are blocked.');
  if(kind==='prerequisite-grade'){
   validateGrade(d.final_grade);if(Number(d.final_grade)>3)throw Error('A prerequisite clearance requires a passing final grade of 3.00 or better.');
   if(M.displayStatus(a)!=='failed'||a.status==='inc'||r)throw Error('Choose an ordinary failed prerequisite attempt.');
   a.final_grade=Number(d.final_grade);a.status='passed';a.prerequisite_grade_override=true;a.prerequisite_override_reason=d.reason;
   audit('prerequisite.grade_overridden','Attempt',a.id,old,a,d.reason);
  }else if(r){validateGrade(d.completion_grade);const before=structuredClone(r);r.completion_grade=Number(d.completion_grade);audit('inc.completion_corrected','INCResolution',r.id,before,r,d.reason);}
  else{
   validateGrade(d.midterm_grade);validateGrade(d.final_grade);
   a.status=['passed','failed'].includes(d.status)?(d.final_grade!==''?(Number(d.final_grade)<=3?'passed':'failed'):(()=>{throw Error('Enter a final grade for Passed or Failed.');})()):d.status;
   a.midterm_grade=d.midterm_grade===''?null:Number(d.midterm_grade);a.final_grade=['passed','failed'].includes(a.status)?Number(d.final_grade):null;
   if(a.status==='inc'&&!a.inc_deadline)a.inc_deadline=M.defaultIncDeadline(t);
   audit('grade.corrected','Attempt',a.id,old,a,d.reason);
  }
 }
 a.updated_at=new Date().toISOString();close();persist('Grade saved. GWA, standing and prerequisites updated.');return;
}
              if (kind === "exception") {
                requireStaff();
                const { id, kind: k } = dialogContext,
                  tableName = k === "mapping" ? "mappings" : "equivalencies";
                const a = M.find("attempts", d.attempt_id),
                  s = M.find("slots", d.slot_id),
                  units = Number(M.course(a)?.units);
                if (
                  !a ||
                  a.student_id !== student ||
                  !studentSlots().some((x) => x.id === s?.id)
                )
                  throw Error(
                    "Choose this student’s attempt and curriculum slot.",
                  );
                if (k === "mapping" && !s.is_elective_slot)
                  throw Error("Mapping requires an elective slot.");
                if(d.decision_type==='discontinued_course_equivalency'){
 const currentCv=M.db.curriculumAssignments.find(x=>x.student_id===student&&!x.end_date)?.curriculum_version_id;
 const available=M.db.slots.some(slot=>slot.course_id===M.course(a).id&&M.db.curriculumTerms.some(term=>term.id===slot.curriculum_term_id&&term.curriculum_version_id!==currentCv&&M.db.curricula.some(cv=>cv.id===term.curriculum_version_id&&cv.status==='active'&&cv.effective_start<=M.today&&(!cv.effective_end||cv.effective_end>=M.today))));
 if(!available)throw Error('The source must belong to another current curriculum.');
 }
                if (k === "equivalency" && !M.passed(a))
                  throw Error("Equivalency requires a passed source attempt.");
                if (units > Number(M.course(a).units))
                  throw Error(
                    "Credited units cannot exceed the source course units.",
                  );
                if (k === "equivalency" && units !== Number(M.course(a).units))
                  throw Error(
                    "Equivalency must display the original attempt’s units.",
                  );
                if (
                  d.decision_type === "discontinued_course_equivalency" &&
                  units < Number(s.nominal_units)
                )
                  throw Error(
                    "A discontinued-course equivalent needs at least the required slot units.",
                  );
                if (
                  d.decision_type === "discontinued_course_equivalency" &&
                  M.find("courses", s.course_id)?.status !== "discontinued"
                )
                  throw Error(
                    "Choose a discontinued destination requirement for this decision type.",
                  );
                if (
                  [...M.db.mappings, ...M.db.equivalencies].some(
                    (x) =>
                      x.id !== id &&
                      x.student_id === student &&
                      (x.attempt_id === a.id ||
                        (x.curriculum_term_course_id ||
                          x.destination_curriculum_term_course_id) === s.id),
                  )
                )
                  throw Error(
                    "This source attempt or destination slot already has a decision. Edit or revoke that decision first.",
                  );
                if (
                  M.db.attempts.some(
                    (x) =>
                      x.student_id === student &&
                      x.curriculum_term_course_id === s.id &&
                      M.passed(x),
                  )
                )
                  throw Error(
                    "This destination already has a passed direct attempt.",
                  );
                const old = id ? structuredClone(M.find(tableName, id)) : null;
                const x = {
                  id: id || M.uid(),
                  student_id: student,
                  attempt_id: a.id,
                  units_credited: units,
                  justification: d.justification,
                };
                if (k === "mapping")
                  Object.assign(x, {
                    curriculum_term_course_id: s.id,
                    mapped_by: current().id,
                    created_at: old?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                else
                  Object.assign(x, {
                    destination_curriculum_term_course_id: s.id,
                    decision_type: d.decision_type,
                    decided_by: current().id,
                    decided_at: new Date().toISOString(),
                  });
                if (id) Object.assign(M.find(tableName, id), x);
                else M.db[tableName].push(x);
                audit(
                  k + (id ? ".updated" : ".created"),
                  k === "mapping" ? "ElectiveMapping" : "EquivalencyDecision",
                  x.id,
                  old,
                  x,
                  d.justification,
                );
                close();
                persist(
                  "Decision saved. Checklist updated; original attempts preserved.",
                );
                return;
              }
              if (kind === "revoke") {
                requireStaff();
                const t =
                    dialogContext.kind === "mapping"
                      ? "mappings"
                      : "equivalencies",
                  x = M.find(t, dialogContext.id);
                audit(
                  dialogContext.kind + ".revoked",
                  dialogContext.kind,
                  x.id,
                  x,
                  null,
                  d.reason,
                );
                M.db[t] = M.db[t].filter((i) => i.id !== x.id);
                close();
                persist("Decision revoked. Audit history preserved.");
                return;
              }
              if (kind === "reassign") {
                const ids = new FormData(f).getAll("students");
                if (!ids.length) throw Error("Select at least one student.");
                if (d.start_date > M.today)
                  throw Error(
                    "Choose today or a past date; scheduled reassignment is not modeled.",
                  );
                for (const id of ids) {
                  const a = M.db.assignments.find(
                    (a) => a.student_id === id && !a.end_date,
                  );
                  if (
                    a.adviser_id !== current().id ||
                    d.start_date < a.start_date
                  )
                    throw Error(
                      "The transition must follow the current assignment start.",
                    );
                }
                modal(
                  "Confirm adviser reassignment",
                  `<p>${ids.map((id) => esc(who(id))).join(", ")} will move to <strong>${esc(who(d.adviser_id))}</strong> on ${date(d.start_date)}. Your access becomes read-only. The prior end date and new start date are identical.</p>` +
                    form("confirm-reassign", "", "Confirm reassignment"),
                  { reassign: { ...d, ids } },
                );
                return;
              }
              if (kind === "confirm-reassign") {
                const d = dialogContext.reassign;
                for (const id of d.ids) {
                  const prev = M.db.assignments.find(
                      (a) => a.student_id === id && !a.end_date,
                    ),
                    old = structuredClone(prev);
                  prev.end_date = d.start_date;
                  const next = {
                    id: M.uid(),
                    student_id: id,
                    adviser_id: d.adviser_id,
                    start_date: d.start_date,
                    end_date: null,
                    reason: d.reason,
                  };
                  M.db.assignments.push(next);
                  audit(
                    "adviser.reassigned",
                    "AdviserAssignment",
                    next.id,
                    old,
                    next,
                    d.reason,
                  );
                }
                close();
                M.save();
                go("adviser/advisees");
                notify("Reassignment saved with continuous dated history.");
                return;
              }
              if (kind === "assign-curriculum") {
                if (role() !== "admin")
                  throw Error("Only an administrator can assign curricula.");
                const old = M.db.curriculumAssignments.find(
                  (a) => a.student_id === student && !a.end_date,
                );
                if (old.curriculum_version_id === d.curriculum_version_id)
                  throw Error("Choose a different curriculum.");
                if (d.start_date < old.start_date || d.start_date > M.today)
                  throw Error(
                    "Choose a date between the existing assignment start and today.",
                  );
                const prev = structuredClone(old);
                old.end_date = d.start_date;
                const next = {
                  id: M.uid(),
                  student_id: student,
                  ...d,
                  end_date: null,
                };
                M.db.curriculumAssignments.push(next);
                const assignedProgram=M.find('programs',M.find('curricula',d.curriculum_version_id).program_id);
                Object.assign(M.find('profiles',student),{program_id:assignedProgram.id,department_id:assignedProgram.department_id,faculty_id:programCollege(assignedProgram)});
                audit(
                  "curriculum.assigned",
                  "StudentCurriculumAssignment",
                  next.id,
                  prev,
                  next,
                  d.reason,
                );
                close();
                persist("Curriculum changed. Prior assignment retained.");
                return;
              }
              if (kind === "entity") {
                saveEntity(d);
                return;
              }
              if (kind === "delete") {
                deleteEntity(d.reason);
                return;
              }
              if (kind === "reset") {
                M.reset();studentPlans=M.db.plans;advisingSelected.clear();
                student = "s1";
                close();
                persist("Original demo records restored.");
                return;
              }
            } catch (err) {
              const area = f.querySelector(".error");
              if (area) {
                area.textContent = err.message;
                area.scrollIntoView({ block: "nearest" });
              } else notify(err.message);
            }
          },
          true,
        );
        function saveEntity(d) {
          if (role() !== "admin")
            throw Error("Administrator access is required.");
          const { kind, table: tn, id, parent, course } = dialogContext;
          const old = id ? structuredClone(M.find(tn, id)) : null;
          let x = { ...old, ...d, id: id || M.uid() };
          for (const k of [
            "units",
            "lecture_hours",
            "lab_hours",
            "nominal_units",
            "year_level",
            "term_sequence",
            "delinquency_threshold",
            "total_units",
            "start_year",
            "end_year",
          ])
            if (k in x) x[k] = Number(x[k]);
          for (const k of ["is_locked", "override_flag", "is_by_request"])
            if (k in x) x[k] = x[k] === "true" || x[k] === true;
          if (kind === "account") {
            if(x.role==='student'){
              const program=M.find('programs',x.program_id);if(!program)throw Error('Select a student program.');
              const cv=M.find('curricula',old?M.db.curriculumAssignments.find(a=>a.student_id===id&&!a.end_date)?.curriculum_version_id:d.curriculum_version_id);
              if(cv?.program_id!==program.id)throw Error(old?'Use Curriculum assignment to change the student’s program and preserve history.':'Choose an initial curriculum belonging to the selected program.');
              if(!old&&(!M.find('profiles',d.adviser_id)||M.find('profiles',d.adviser_id).role!=='adviser'))throw Error('Select an initial adviser.');
              x.department_id=program.department_id;x.faculty_id=programCollege(program);
            }else if(x.role==='adviser'){if(!M.find('faculties',x.faculty_id))throw Error('Select an adviser college.');x.program_id=null;x.department_id=null;}
            else{x.program_id=null;x.department_id=null;x.faculty_id=null;}
            if (M.db.profiles.some((p) => p.id !== id && p.email === x.email))
              throw Error("That institutional email is already provisioned.");
            if (x.role === "student" && !x.student_number)
              throw Error("A student number is required for student accounts.");
            if (
              x.student_number &&
              M.db.profiles.some(
                (p) => p.id !== id && p.student_number === x.student_number,
              )
            )
              throw Error("That student number already exists.");
            if (
              old &&
              old.role !== x.role &&
              M.db.assignments.some(
                (a) => a.student_id === id || a.adviser_id === id,
              )
            )
              throw Error(
                "This role has assignment history. Provision a separate account instead of changing its role.",
              );
            if (
              id === current().id &&
              (x.role !== "admin" || x.status !== "active")
            )
              throw Error("Keep your current administrator account active.");
            if (
              x.status === "disabled" &&
              x.role === "adviser" &&
              M.db.assignments.some((a) => a.adviser_id === id && !a.end_date)
            )
              throw Error(
                "Reassign current advisees before disabling their adviser.",
              );
          }
          if(kind==='program'){if(!M.find('departments',x.department_id))throw Error('Select a program department.');x.faculty_id=programCollege(x);}
          if (kind === "program" && !x.department_id)
            throw Error("Add a faculty first.");
          if (
            kind === "program" &&
            M.db.programs.some(
              (p) =>
                p.id !== id &&
                (p.code.toLowerCase() === x.code.toLowerCase() ||
                  p.name.toLowerCase() === x.name.toLowerCase()),
            )
          )
            throw Error("Program code and name must both be unique.");
          if (
            kind === "course" &&
            M.db.courses.some(
              (p) =>
                p.id !== id && p.code.toLowerCase() === x.code.toLowerCase(),
            )
          )
            throw Error("That course code already exists.");
          if (kind === "curriculum") {
            if (x.effective_end && x.effective_end < x.effective_start)
              throw Error("Effective end must follow the start.");
            if (
              M.db.curricula.some(
                (c) =>
                  c.id !== id &&
                  c.program_id === x.program_id &&
                  c.version_label === x.version_label,
              )
            )
              throw Error("This program already has that version label.");
            if (
              old &&
              old.program_id !== x.program_id &&
              M.db.curricula.filter((c) => c.program_id === old.program_id)
                .length === 1
            )
              throw Error(
                "The original program must retain at least one curriculum.",
              );
          }
          if (kind === "curriculum-term") {
            x.curriculum_version_id =
              old?.curriculum_version_id || selectedCurriculum;
            if (
              M.db.curriculumTerms.some(
                (t) =>
                  t.id !== id &&
                  t.curriculum_version_id === x.curriculum_version_id &&
                  t.year_level === x.year_level &&
                  t.term_sequence === x.term_sequence,
              )
            )
              throw Error("That curriculum term already exists.");
          }
          if (kind === "slot") {
            x.curriculum_term_id = old?.curriculum_term_id || parent;
            x.is_elective_slot = !x.course_id;
            x.course_id = x.course_id || null;
            x.slot_label = x.is_elective_slot
              ? (old?.is_elective_slot && old.slot_label) ||
                nextElectiveLabel(x.curriculum_term_id, x.id)
              : "";
            if (
              old &&
              M.db.attempts.some((a) => a.curriculum_term_course_id === id) &&
              (old.course_id !== x.course_id ||
                old.is_elective_slot !== x.is_elective_slot)
            )
              throw Error(
                "A recorded attempt uses this slot. Create a new curriculum version for a different requirement.",
              );
          }
          if (kind === "term") {
            if (
              !Number.isInteger(x.start_year) ||
              !Number.isInteger(x.end_year)
            )
              throw Error("Enter a start year and an end year.");
            if (
              x.term_type === "Summer"
                ? x.end_year < x.start_year
                : x.end_year <= x.start_year
            )
              throw Error(
                x.term_type === "Summer"
                  ? "End year cannot be before the start year."
                  : "End year must be after the start year.",
              );
            if(!/^\d{4}-\d{2}-\d{2}$/.test(x.ends_on||'') ||
              new Date(x.ends_on+'T12:00:00Z').toISOString().slice(0,10)!==x.ends_on ||
              Number(x.ends_on.slice(0,4))<x.start_year || Number(x.ends_on.slice(0,4))>x.end_year)
              throw Error('Enter an actual term end date within the school-year range.');
            x.school_year = M.schoolYear(x.term_type, x.start_year, x.end_year);
            if (
              M.db.terms.some(
                (t) =>
                  t.id !== id &&
                  t.school_year === x.school_year &&
                  t.term_type === x.term_type,
              )
            )
              throw Error("That school year and term type already exist.");
            x.override_actor_id = x.override_flag ? current().id : null;
            x.override_at = x.override_flag ? new Date().toISOString() : null;
          }
          if (
            kind === "faculty" &&
            M.db.faculties.some(
              (f) =>
                f.id !== id && f.name.toLowerCase() === x.name.toLowerCase(),
            )
          )
            throw Error("That faculty already exists.");
          if (kind === "department") {
            if (!x.faculty_id) throw Error("Add a faculty first.");
            if (
              M.db.departments.some(
                (dp) =>
                  dp.id !== id &&
                  dp.name.toLowerCase() === x.name.toLowerCase(),
              )
            )
              throw Error("That department already exists.");
          }
          if (kind === "offering") {
            const t = M.find("terms", x.school_term_id);
            if (isLocked(t))
              throw Error(
                "The selected term is locked. Manage its admin override before editing.",
              );
            if (
              M.db.offerings.some(
                (o) =>
                  o.id !== id &&
                  o.school_term_id === x.school_term_id &&
                  o.course_id === x.course_id,
              )
            )
              throw Error("That course is already offered in this term.");
            if (
              M.find("courses", x.course_id).status === "discontinued" &&
              !x.is_by_request
            )
              throw Error("Discontinued courses must be offered by request.");
            if (
              old &&
              M.db.attempts.some((a) => a.course_offering_id === id) &&
              (old.course_id !== x.course_id ||
                old.school_term_id !== x.school_term_id)
            )
              throw Error(
                "This offering has enrollment history. Create a new offering instead.",
              );
          }
          if (kind === "prerequisite") {
            x.course_id = old?.course_id || course;
            if (x.course_id === x.prerequisite_course_id)
              throw Error("A course cannot be its own prerequisite.");
            if (
              M.db.prerequisites.some(
                (p) =>
                  p.id !== id &&
                  p.course_id === x.course_id &&
                  p.prerequisite_course_id === x.prerequisite_course_id,
              )
            )
              throw Error("That prerequisite is already linked.");
          }
          if (id) Object.assign(M.find(tn, id), x);
          else M.db[tn].push(x);
          if(kind==='program'||kind==='department')M.db.profiles.filter(p=>p.role==='student').forEach(p=>{const pr=M.find('programs',p.program_id);if(pr){p.department_id=pr.department_id;p.faculty_id=programCollege(pr);}});
          if (kind === "account" && !old && x.role === "student") {
            M.db.assignments.push({
              id: M.uid(),
              student_id: x.id,
              adviser_id: d.adviser_id,
              start_date: M.today,
              end_date: null,
              reason: "Initial assignment",
            });
            M.db.curriculumAssignments.push({
              id: M.uid(),
              student_id: x.id,
              curriculum_version_id: d.curriculum_version_id,
              start_date: M.today,
              end_date: null,
              reason: "Initial assignment",
            });
          }
          // Every newly provisioned program/version starts with one editable term and elective slot.
          if (kind === "program" && !old) {
            const cv = {
              id: M.uid(),
              program_id: x.id,
              version_label: "Draft 2026",
              effective_start: M.today,
              effective_end: null,
              delinquency_threshold: 12,
              total_units: 156,
              status: "draft",
            };
            M.db.curricula.push(cv);
            addInitialTerm(cv.id);
          }
          if (kind === "curriculum" && !old) addInitialTerm(x.id);
          if (kind === "curriculum-term" && !old)
            M.db.slots.push({
              id: M.uid(),
              curriculum_term_id: x.id,
              course_id: null,
              is_elective_slot: true,
              slot_label: "Elective 1",
              nominal_units: 3,
            });
          audit(kind + (id ? ".updated" : ".created"), kind, x.id, old, x);
          close();
          persist("Record saved.");
        }
        function nextElectiveLabel(termId, selfId) {
          const cv = M.find("curriculumTerms", termId)?.curriculum_version_id,
            terms = M.db.curriculumTerms
              .filter((t) => t.curriculum_version_id === cv)
              .map((t) => t.id),
            used = new Set(
              M.db.slots
                .filter(
                  (s) =>
                    s.id !== selfId && terms.includes(s.curriculum_term_id),
                )
                .map((s) => s.slot_label),
            );
          let n = 1;
          while (used.has("Elective " + n)) n++;
          return "Elective " + n;
        }
        function addInitialTerm(cv) {
          const t = {
            id: M.uid(),
            curriculum_version_id: cv,
            year_level: 1,
            term_sequence: 1,
          };
          M.db.curriculumTerms.push(t);
          M.db.slots.push({
            id: M.uid(),
            curriculum_term_id: t.id,
            course_id: null,
            is_elective_slot: true,
            slot_label: "Elective 1",
            nominal_units: 3,
          });
        }
        function deleteEntity(reason) {
          if (role() !== "admin")
            throw Error("Administrator access is required.");
          const { kind, id } = dialogContext,
            tn = {
              faculty: "faculties",
              department: "departments",
              program: "programs",
              curriculum: "curricula",
              "curriculum-term": "curriculumTerms",
              slot: "slots",
              course: "courses",
              offering: "offerings",
              prerequisite: "prerequisites",
            }[kind],
            x = M.find(tn, id);
          if (!x) throw Error("Record not found.");
          let used = false;
          if (kind === "faculty")
            used =
              M.db.departments.some((d) => d.faculty_id === id) ||
              M.db.programs.some((p) => p.faculty_id === id);
          if (kind === "department")
            used =
              M.db.courses.some((c) => c.department_id === id) ||
              M.db.profiles.some((p) => p.department_id === id)||M.db.programs.some(p=>p.department_id===id);
          if (kind === "program")
            used = M.db.curricula.some(
              (c) =>
                c.program_id === id &&
                M.db.curriculumAssignments.some(
                  (a) => a.curriculum_version_id === c.id,
                ),
            );
          if (kind === "curriculum")
            used =
              M.db.curriculumAssignments.some(
                (a) => a.curriculum_version_id === id,
              ) ||
              M.db.curricula.filter((c) => c.program_id === x.program_id)
                .length <= 1;
          if (kind === "curriculum-term")
            used =
              M.db.curriculumTerms.filter(
                (t) => t.curriculum_version_id === x.curriculum_version_id,
              ).length <= 1 ||
              M.db.slots.some(
                (s) =>
                  s.curriculum_term_id === id &&
                  M.db.attempts.some(
                    (a) => a.curriculum_term_course_id === s.id,
                  ),
              );
          if (kind === "slot")
            used =
              M.db.slots.filter(
                (s) => s.curriculum_term_id === x.curriculum_term_id,
              ).length <= 1 ||
              M.db.attempts.some((a) => a.curriculum_term_course_id === id) ||
              M.db.mappings.some((m) => m.curriculum_term_course_id === id) ||
              M.db.equivalencies.some(
                (q) => q.destination_curriculum_term_course_id === id,
              );
          if (kind === "course")
            used =
              M.db.offerings.some((o) => o.course_id === id) ||
              M.db.slots.some((s) => s.course_id === id) ||
              M.db.prerequisites.some(
                (p) => p.course_id === id || p.prerequisite_course_id === id,
              );
          if (kind === "offering")
            used =
              M.db.attempts.some((a) => a.course_offering_id === id) ||
              isLocked(M.find("terms", x.school_term_id));
          if (used && (kind === "faculty" || kind === "department"))
            throw Error(
              kind === "faculty"
                ? "This faculty still has departments or programs. Move or remove them first."
                : "This department is still used by courses or accounts. Reassign them first.",
            );
          if (used)
            throw Error(
              "This record is in use or is the last required child record. Preserve it and use archive / discontinue / close where available.",
            );
          if (kind === "program") {
            const cvs = M.db.curricula
              .filter((c) => c.program_id === id)
              .map((c) => c.id);
            const ts = M.db.curriculumTerms
              .filter((t) => cvs.includes(t.curriculum_version_id))
              .map((t) => t.id);
            M.db.slots = M.db.slots.filter(
              (s) => !ts.includes(s.curriculum_term_id),
            );
            M.db.curriculumTerms = M.db.curriculumTerms.filter(
              (t) => !cvs.includes(t.curriculum_version_id),
            );
            M.db.curricula = M.db.curricula.filter((c) => c.program_id !== id);
          }
          if (kind === "curriculum") {
            const ids = M.db.curriculumTerms
              .filter((t) => t.curriculum_version_id === id)
              .map((t) => t.id);
            M.db.slots = M.db.slots.filter(
              (s) => !ids.includes(s.curriculum_term_id),
            );
            M.db.curriculumTerms = M.db.curriculumTerms.filter(
              (t) => t.curriculum_version_id !== id,
            );
          }
          if (kind === "curriculum-term")
            M.db.slots = M.db.slots.filter((s) => s.curriculum_term_id !== id);
          M.db[tn] = M.db[tn].filter((o) => o.id !== id);
          audit(kind + ".deleted", kind, id, x, null, reason);
          close();
          persist("Unused record deleted. Audit history preserved.");
        }
        function prerequisites(course) {
          modal(
            "Course prerequisites",
            `<p>${esc(courseName(course))}. Strict prerequisites trigger confirmation; co-requisites and recommendations are advisory.</p>${table(
              ["Course", "Type", "Actions"],
              M.db.prerequisites
                .filter((p) => p.course_id === course)
                .map((p) => [
                  esc(courseName(p.prerequisite_course_id)),
                  esc(labels[p.type]),
                  manage("prerequisite", p.id),
                ]),
            )}<div class="actions" style="margin-top:20px">${button("Link prerequisite", "new-prerequisite", true)}</div>`,
            { course },
          );
        }
        function downloadCsv(rows, filename) {
          const keys = Object.keys(rows[0]),
            cell = (x) =>
              '"' +
              String(x ?? "")
                .replace(/^([=+@-])/, "\t$1")
                .replaceAll('"', '""') +
              '"';
          const csv = [
            keys.map(cell).join(","),
            ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
          ].join("\r\n");
          const url = URL.createObjectURL(
              new Blob([csv], { type: "text/csv;charset=utf-8" }),
            ),
            a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        const auditRow = (x) => ({
          ...x,
          old_value: JSON.stringify(x.old_value),
          new_value: JSON.stringify(x.new_value),
        });
        function exportData() {
          if (role() !== "admin" || !M.db.audit.length)
            return notify("No records to export.");
          downloadCsv(M.db.audit.map(auditRow), "saais-audit-log.csv");
          notify("Read-only CSV exported.");
        }
        function exportAuditEntry(id) {
          const x = M.find("audit", id);
          if (!x) throw Error("Audit entry not found.");
          downloadCsv([auditRow(x)], `saais-audit-${x.id}.csv`);
          notify("Audit entry exported as CSV.");
        }
        document.addEventListener(
          "click",
          (e) => {
            if(e.target.id==='offering-search'&&$('#offering-options')?.hidden)showOfferings();
            const option=e.target.closest('[data-offering]');
            if(option){e.preventDefault();chooseOffering(option.dataset.offering);return;}
            if(!e.target.closest('.offering-picker'))hideOfferings();
            const um = $("#user-menu-list");
            if (um && !um.hidden && !e.target.closest(".user-menu")) {
              um.hidden = true;
              $(".user-trigger")?.setAttribute("aria-expanded", "false");
            }
            const el = e.target.closest("[data-action]"),
              demo = e.target.closest("#proto-bar [data-role]"),
              jump = e.target.closest("[data-goto]");
            if (demo) {
              e.preventDefault();
              e.stopImmediatePropagation();
              const r = demo.dataset.role;
              setSession({ student: "s1", adviser: "a1", admin: "u1" }[r]);
              student = "s1";
              close();
              go(r + "/dashboard");
              return;
            }
            if (jump) {
              e.preventDefault();
              e.stopImmediatePropagation();
              const to = jump.dataset.goto,
                r = to.split("/")[0];
              if (["student", "adviser", "admin"].includes(r))
                setSession({ student: "s1", adviser: "a1", admin: "u1" }[r]);
              $("#proto-sitemap").classList.remove("open");
              go(to);
              return;
            }
            if (!el) {
              const a = e.target.closest('a[href^="#/"]');
              if (a) {
                e.stopImmediatePropagation();
                close();
                return;
              }
              const v = e.target.closest(".view.active");
              if (v) landingClick(e, v);
              return;
            }
            e.preventDefault();
            e.stopImmediatePropagation();
            const act = el.dataset.action,
              id = el.dataset.id;
            try {
              if (act === "close") {
                if ($("#app-dialog")?.open) close();
                else {
                  const f = el.closest("form");
                  f?.reset();
                }
                return;
              }
              if (act === "menu") {
                const side = $(".side");
                side.classList.toggle("open");
                el.setAttribute(
                  "aria-expanded",
                  side.classList.contains("open"),
                );
                return;
              }
              if (act === "user-menu") {
                const list = $("#user-menu-list"),
                  open = list.hidden;
                list.hidden = !open;
                el.setAttribute("aria-expanded", String(open));
                if (open) list.querySelector("a")?.focus();
                return;
              }
              if (act === "signout") {
                session = null;
                sessionStorage.removeItem("saais-session");
                go("login");
                return;
              }
              if (act === "fill-login") {
                const u = M.find(
                  "profiles",
                  { student: "s1", adviser: "a1", admin: "u1" }[
                    el.dataset.role
                  ],
                );
                $('[data-form="login"] [name=email]').value = u.email;
                $('[data-form="login"] [name=password]').value =
                  u.demo_password || "Demo2026!";
                return;
              }
              if (act === "google") {
                modal(
                  "Google sign-in preview",
                  "<p>Enter a Google email to demonstrate exact-match access. This does not connect to Google.</p>" +
                    form(
                      "google",
                      field("email", "Google account email", "", "email"),
                      "Continue",
                    ),
                );
                return;
              }
              if (act === "roster-current" || act === "roster-past") {
                rosterView = act.endsWith("current") ? "current" : "past";
                render();
                return;
              }
              if (act === "student") {
                student = id;advisingSelected.clear();
                go("adviser/advisees/"+id);
                return;
              }
              if(act==='override-grade'){gradeDialog(id,false,true);return;}
              if (act === "toggle-rec") {requireStaff();
                if (advisingSelected.has(id)) advisingSelected.delete(id);
                else advisingSelected.add(id);
                render();
                return;
              }
              if(act==='add-to-plan'){
 requireStaff();const t=advisingSchoolTerm(advisingTermFilter);if(!t)throw Error('No offering term available.');
 const eligible=advisingRecommendations(advisingTermFilter).eligible,existing=M.db.plans[student]||[],added=eligible.filter(x=>advisingSelected.has(x.key)&&!existing.some(p=>p.key===x.key&&p.school_term_id===t.id));
 if(!added.length)throw Error('Select at least one eligible course that is not already planned.');
 const old=structuredClone(existing);M.db.plans[student]=[...existing,...added.map(x=>({key:x.key,slotId:x.slot.id,courseId:x.course.id,school_term_id:t.id,addedBy:current().id,addedAt:new Date().toISOString()}))];
 audit('plan.updated','AdvisingPlan',student,old,M.db.plans[student]);advisingSelected.clear();persist('Recommendations saved and visible on the student dashboard.');return;
}
              if(act==='cancel-rec'){
 requireStaff();const t=advisingSchoolTerm(advisingTermFilter),old=structuredClone(M.db.plans[student]||[]);M.db.plans[student]=old.filter(p=>!(p.key===id&&p.school_term_id===t?.id));audit('plan.updated','AdvisingPlan',student,old,M.db.plans[student]);persist('Recommendation removed.');return;
}
              if (act === "activity") {
                modal("All Recent Activity", activities(true));
                return;
              }
              if (act === "notes-all") {
                modal(
                  "All advising notes · " + who(student),
                  studentNotes().map(noteRow).join("") ||
                    '<div class="empty">No advising notes yet.</div>',
                );
                return;
              }
              if (act === "assignment-history") {
                modal(
                  "Adviser assignment history",
                  table(
                    ["Adviser", "Start", "End", "Reason"],
                    M.db.assignments
                      .filter((a) => a.student_id === student)
                      .map((a) => [
                        esc(who(a.adviser_id)),
                        date(a.start_date),
                        date(a.end_date),
                        esc(a.reason),
                      ]),
                  ),
                );
                return;
              }
              if (act === "curriculum-history") {
                curriculumHistory();
                return;
              }
              if (act === "review-inc") {
                const a = M.find("attempts", id);
                student = a.student_id;
                go("adviser/advisees/grades");
                return;
              }
              if (act === "resolve-inc" || act === "grade") {
                gradeDialog(id, act === "resolve-inc");
                return;
              }
              if (act === "map" || act === "equivalency") {
                mappingDialog(act === "map" ? "mapping" : "equivalency");
                return;
              }
              if (act === "edit-exception") {
                mappingDialog(el.dataset.kind, id);
                return;
              }
              if (act === "revoke-exception") {
                modal(
                  "Revoke this decision?",
                  `<p>The requirement will be reevaluated. The original attempt and an audit of this decision remain in history.</p>` +
                    form(
                      "revoke",
                      textarea("reason", "Reason for revocation"),
                      "Revoke decision",
                    ),
                  { kind: el.dataset.kind, id },
                );
                return;
              }
              if (act === "remark") {
                requireStaff();
                modal(
                  "Add a staff-only remark",
                  form(
                    "remark",
                    select(
                      "slot_id",
                      "Checklist slot",
                      [
                        ["", "No slot"],
                        ...studentSlots().map((s) => [s.id, slotName(s.id)]),
                      ],
                      dialogContext.slot || "",
                      false,
                    ) +
                      select(
                        "attempt_id",
                        "Attempt (optional)",
                        [
                          ["", "No attempt — remark on empty slot"],
                          ...M.db.attempts
                            .filter((a) => a.student_id === student)
                            .map((a) => [
                              a.id,
                              `${M.course(a).code} · ${termName(M.find("offerings", a.course_offering_id).school_term_id)}`,
                            ]),
                        ],
                        "",
                        false,
                      ) +
                      textarea("body_text", "Remark"),
                    "Save remark",
                  ),
                );
                return;
              }
              if (act === "remarks") {
                const s = M.find("slots", id),
                  attemptIds = M.db.attempts
                    .filter(
                      (a) =>
                        a.student_id === student &&
                        (a.curriculum_term_course_id === id ||
                          M.course(a).id === s.course_id),
                    )
                    .map((a) => a.id);
                const remarks = M.db.remarks
                  .filter(
                    (r) =>
                      r.student_id === student &&
                      (r.curriculum_term_course_id === id ||
                        attemptIds.includes(r.attempt_id)),
                  )
                  .sort((a, b) => {
                    const ta = M.find("attempts", a.attempt_id),
                      tb = M.find("attempts", b.attempt_id);
                    return ta&&tb?attemptOrder(ta,tb):a.created_at.localeCompare(b.created_at);
                  });
                modal(
                  "Remarks · " + slotName(id),
                  remarks
                    .map(
                      (r) =>
                        `<article class="note-row"><div class="note-meta">${esc(who(r.authored_by))} · ${date(r.created_at)}</div><p>${esc(r.body_text)}</p><p class="muted">${r.attempt_id ? esc(termName(M.find("offerings", M.find("attempts", r.attempt_id).course_offering_id).school_term_id)) : "Checklist slot · no attempt"}</p></article>`,
                    )
                    .join("") +
                    (canEdit() ? button("Add slot remark", "remark") : ""),
                  { slot: id },
                );
                return;
              }
              if (act === "print") {
                window.print();
                return;
              }
              if (act === "export") {
                exportData();
                return;
              }
              if (act === "export-audit") {
                exportAuditEntry(id);
                return;
              }
              if (act === "audit-detail") {
                const a = M.find("audit", id);
                modal(
                  "Audit entry",
                  `<div class="audit-viewer-head"><p>${esc(a.action)} · ${esc(who(a.actor_id))}</p>${button("Export CSV", "export-audit", true, `data-id="${a.id}"`)}</div><pre>${esc(JSON.stringify(a, null, 2))}</pre>`,
                );
                return;
              }
              if (act === "reset") {
                modal(
                  "Reset the presentation data?",
                  "<p>This removes your local demo changes and restores the original fictional records.</p>" +
                    form("reset", "", "Reset demo data"),
                );
                return;
              }
              if (act === "account-curriculum") {
                student = id;
                modal(
                  "Assign curriculum · " + who(student),
                  form(
                    "assign-curriculum",
                    select(
                      "curriculum_version_id",
                      "New curriculum",
                      M.db.curricula.map((c) => [
                        c.id,
                        `${M.find("programs", c.program_id).code} · ${c.version_label}`,
                      ]),
                    ) +
                      field(
                        "start_date",
                        "Transition date",
                        M.today,
                        "date",
                        true,
                        `max="${M.today}"`,
                      ) +
                      textarea("reason", "Reason"),
                    "Assign curriculum",
                  ),
                );
                return;
              }
              if (act === "invite-account") {
                const p = M.find("profiles", id);
                dialogContext.inviteEmail = p.email;
                modal(
                  "Invitation preview",
                  `<p>Invite ${esc(p.full_name)} at ${esc(p.email)}. No email is sent in this demo.</p><a class="button primary" href="#/invite">Open invitation</a>`,
                  { inviteEmail: p.email },
                );
                audit("account.invite_preview", "Profile", id, null, {
                  email: p.email,
                });
                M.save();
                return;
              }
              if (act === "prerequisites") {
                prerequisites(id);
                return;
              }
              if (act.startsWith("new-") || act.startsWith("edit-")) {
                const kind = act.replace(/^(new|edit)-/, "");
                if (kind === "slot" && act.startsWith("new"))
                  dialogContext = { parent: id };
                editDialog(kind, act.startsWith("edit") ? id : null);
                return;
              }
              if (act.startsWith("delete-")) {
                const kind = act.slice(7);
                modal(
                  "Delete unused record?",
                  `<p>Records referenced by academic history cannot be deleted. The last required program version, term or slot is also protected.</p>` +
                    form(
                      "delete",
                      textarea("reason", "Reason"),
                      "Delete record",
                    ),
                  { kind, id },
                );
                return;
              }
            } catch (err) {
              notify(err.message);
            }
          },
          true,
        );
        let searchTimer;
        function syncSchoolYear(f) {
          if (dialogContext.kind !== "term" || !f.elements.school_year) return;
          const { term_type, start_year, end_year } = f.elements,
            st = Number(start_year.value),
            en = Number(end_year.value);
          f.elements.school_year.value =
            Number.isFinite(en) &&
            end_year.value !== "" &&
            (term_type.value === "Summer" ||
              (Number.isFinite(st) && start_year.value !== ""))
              ? M.schoolYear(term_type.value, st, en)
              : "";
        }
        document.addEventListener(
          "input",
          (e) => {
            if(e.target.id==='offering-search'){
              const f=e.target.closest('form');f.elements.course_offering_id.value='';
              $('#direct-slot').textContent='Choose a course offering to see its curriculum slot.';
              $('#prerequisite-preview').textContent='Choose a course offering to review its prerequisites.';
              showOfferings(e.target.value);return;
            }
            const tf = e.target.closest?.('[data-form="entity"]');
            if (tf) syncSchoolYear(tf);
            if (e.target.dataset.filter) {
              const type = e.target.dataset.filter,
                value = e.target.value,
                pos = e.target.selectionStart;
              clearTimeout(searchTimer);
              searchTimer = setTimeout(() => {
                if (type === "roster") rosterSearch = value;
                else adminSearch = value;
                render();
                const input = $(`[data-filter="${type}"]`);
                input?.focus();
                input?.setSelectionRange(pos, pos);
              }, 150);
            }
          },
          true,
        );
        document.addEventListener(
          "change",
          (e) => {
            const name = e.target.name,
              v = e.target.value;
            if(name==='school_term_id'&&e.target.closest('[data-form="enrollment"]')){
              const f=e.target.closest('form');
              f.elements.course_offering_id.value='';$('#offering-search').value='';
              f.elements.midterm_grade.value='';f.elements.final_grade.value='';
              $('#direct-slot').textContent='Choose a course offering to see its curriculum slot.';
              $('#prerequisite-preview').textContent='Choose a course offering to review its prerequisites.';
              $('#offering-options').innerHTML=offeringOptions();hideOfferings();return;
            }
            if(name==='account-college'){accountCollege=v;accountDepartment='all';render();return;}
            if(name==='account-department'){accountDepartment=v;render();return;}
            if(name==='shift-curriculum'){shiftTarget=v;$('#shift-results').innerHTML=shiftPreview(v);return;}
            if (name === "roster-standing") {
              rosterStanding = v;
              render();
            }
            if (name === "admin-filter") {
              adminFilter = v;
              render();
            }
            if (name === "checklist-filter") {
              checklistFilter = v;
              render();
            }
            if (name === "curriculum-version") {
              selectedCurriculum = v;
              render();
            }
            if (name === "selected-term") {
              selectedTerm = v;
              render();
            }
            if (name === "course-faculty") {
              courseFaculty = v;
              if (
                v !== "all" &&
                courseDept !== "all" &&
                M.find("departments", courseDept)?.faculty_id !== v
              )
                courseDept = "all";
              render();
            }
            if (name === "course-dept") {
              courseDept = v;
              render();
            }
            if (name === "offer-filter") {
              offerFilter = v;
              offerFilterValue =
                v === "faculty"
                  ? M.db.faculties[0]?.id || ""
                  : v === "department"
                    ? M.db.departments[0]?.id || ""
                    : "";
              render();
            }
            if (name === "offer-filter-value") {
              offerFilterValue = v;
              render();
            }
            if (name === "notes-checklist-term") {
              notesTerm = v;
              e.target.closest(".notes-checklist").outerHTML = notesChecklist();
              $('[name="notes-checklist-term"]')?.focus();
            }
            if (name === "enrollment-term") {
              enrollmentTerm = v;
              render();
              $('[name="enrollment-term"]')?.focus();
            }
            if (name === "record-term") {
              recordTerm = v;
              render();
              $('[name="record-term"]')?.focus();
            }
            if (name === "advising-term-filter") {
              advisingTermFilter = v;advisingSelected.clear();
              render();
              $('[name="advising-term-filter"]')?.focus();
            }
            const tf = e.target.closest('[data-form="entity"]');
            if (tf) syncSchoolYear(tf);

          },
          true,
        );
        function landingClick(e, v) {
          let n = e.target;
          for (let i = 0; n && n !== v && i < 5; i++, n = n.parentElement) {
            const t = n.textContent.trim().replace(/\s+/g, " ");
            const map = {
              "Sign in": "login",
              "Request a walkthrough": "login",
              "Read the API contract": "docs",
              Documentation: "docs",
              "API contract": "docs",
              "Student portal": "student/dashboard",
              "Adviser portal": "adviser/dashboard",
              "Admin portal": "admin/dashboard",
              "Open student portal": "student/dashboard",
            };
            if (map[t]) {
              e.preventDefault();
              e.stopImmediatePropagation();
              const to = map[t];
              if (to.includes("/"))
                setSession(
                  { student: "s1", adviser: "a1", admin: "u1" }[
                    to.split("/")[0]
                  ],
                );
              go(to);
              return;
            }
            if (
              ["Platform", "Portals", "Rules engine", "Compliance"].includes(t)
            ) {
              e.preventDefault();
              e.stopImmediatePropagation();
              const heading = [...v.querySelectorAll("h2,h3")].find((h) =>
                ({
                  Platform: /checklist|platform|academic/i,
                  Portals: /student|role|everyone/i,
                  "Rules engine": /rule|grade|history/i,
                  Compliance: /trust|account|audit/i,
                })[t].test(h.textContent),
              );
              heading?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (
              [
                "Checklist",
                "Rules engine",
                "Audit trail",
                "Plan",
                "Record",
                "Review",
                "Resolve",
                "Graduate",
              ].includes(t) &&
              n.matches("button,[role=button]")
            ) {
              e.preventDefault();
              e.stopImmediatePropagation();
              modal(
                t + " preview",
                `<p>Explore ${esc(t.toLowerCase())} in the working product screens.</p>${link("Open adviser workspace", "adviser/dashboard", true)}`,
              );
              if (!current()) setSession("a1");
              return;
            }
            if (n.matches("button") && /subscribe|release/i.test(t)) {
              e.preventDefault();
              e.stopImmediatePropagation();
              modal(
                "Release notes",
                "<p>This is a presentation prototype. Release-note subscription is not connected.</p>",
              );
              return;
            }
          }
        }
        window.addEventListener("hashchange", () => {
          adminSearch = "";
          adminFilter = "all";
          courseFaculty = "all";
          courseDept = "all";
          offerFilter = "all";
          offerFilterValue = "";
          close();
          render();
          window.scrollTo(0, 0);
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            if(e.target.id==='offering-search'&&$('#offering-options')?.hidden)showOfferings();
            const option=e.target.closest('[data-offering]');
            if(option){e.preventDefault();chooseOffering(option.dataset.offering);return;}
            if(!e.target.closest('.offering-picker'))hideOfferings();
            const um = $("#user-menu-list");
            if (um && !um.hidden) {
              um.hidden = true;
              const t = $(".user-trigger");
              t?.setAttribute("aria-expanded", "false");
              t?.focus();
            }
            $(".side")?.classList.remove("open");
            $("#proto-sitemap")?.classList.remove("open");
          }
          if (e.key === "Enter" && e.target.matches("[role=button]"))
            e.target.click();
        });
        window.SAAISDemo = {
          render,
          get session() {
            return session;
          },
          get student() {
            return student;
          },
        };
        render();
      })();
