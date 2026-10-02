"""Apply the panel's source-level changes to the existing artboard generators."""
from pathlib import Path
root = Path(__file__).parent
for name in ['base.py', 'gen_student.py', 'gen_adviser.py', 'gen_admin.py']:
    p = root / name
    s = p.read_text(encoding='utf-8')
    s = s.replace('Record an enrollment attempt', 'Record enrollment').replace('Record enrollment attempt', 'Record enrollment').replace('Record attempt', 'Record enrollment')
    s = s.replace('Quick actions', 'Quick Access')
    if name == 'base.py':
        s = s.replace('if on and sub:', 'if False and sub:  # Student tabs belong in the page, not global navigation.')
        s = s.replace('border-radius: 6px', 'border-radius: 14px').replace('border-radius: 4px', 'border-radius: 8px')
        s = s.replace('min-height: %dpx', 'min-height: 100vh; --artboard-height: %dpx')
    if name == 'gen_adviser.py':
        s = s.replace('+ override_dialog() +', '+ "" +')
        s = s.replace('Recorded decisions cannot be edited — supersede them with a new decision.', 'Edit or revoke a decision with a reason. Every change is retained in the audit history.')
        s = s.replace('Attempts bind a student to a specific course offering. Prerequisites are checked, ', 'Record a course enrollment for advising and grade history. This does not register a student with the registrar. Prerequisites are checked, ')
    p.write_text(s, encoding='utf-8')
