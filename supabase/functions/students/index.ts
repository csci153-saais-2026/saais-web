// The shared router registers academic reads and writes from both runtime snapshots.
import { serve } from "../_shared/serve.ts";
import { preparePhoto } from "../_shared/student-photo.ts";
serve("students", preparePhoto);
