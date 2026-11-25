export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      adviser_assignment: {
        Row: {
          adviser_id: string
          created_at: string
          end_date: string | null
          id: string
          reason: string
          start_date: string
          student_id: string
        }
        Insert: {
          adviser_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          reason: string
          start_date: string
          student_id: string
        }
        Update: {
          adviser_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          reason?: string
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adviser_assignment_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adviser_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      advising_note: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          author_name: string | null
          author_role_label: string | null
          authored_by: string
          body_text: string
          created_at: string
          id: string
          is_archived: boolean
          student_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          author_name?: string | null
          author_role_label?: string | null
          authored_by: string
          body_text: string
          created_at?: string
          id?: string
          is_archived?: boolean
          student_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          author_name?: string | null
          author_role_label?: string | null
          authored_by?: string
          body_text?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advising_note_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_note_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_note_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      advising_plan: {
        Row: {
          created_at: string
          created_by: string
          id: string
          revision: number
          school_term_id: string
          student_curriculum_assignment_id: string
          student_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          revision: number
          school_term_id: string
          student_curriculum_assignment_id: string
          student_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          revision?: number
          school_term_id?: string
          student_curriculum_assignment_id?: string
          student_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "advising_plan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_plan_school_term_id_fkey"
            columns: ["school_term_id"]
            isOneToOne: false
            referencedRelation: "school_term"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_plan_student_curriculum_assignment_id_student_id_fkey"
            columns: ["student_curriculum_assignment_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_curriculum_assignment"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "advising_plan_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_plan_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      advising_plan_item: {
        Row: {
          advising_plan_id: string
          course_offering_id: string
          created_at: string
          curriculum_term_course_id: string | null
          display_order: number
          id: string
          school_term_id: string
          student_id: string
        }
        Insert: {
          advising_plan_id: string
          course_offering_id: string
          created_at?: string
          curriculum_term_course_id?: string | null
          display_order: number
          id?: string
          school_term_id: string
          student_id: string
        }
        Update: {
          advising_plan_id?: string
          course_offering_id?: string
          created_at?: string
          curriculum_term_course_id?: string | null
          display_order?: number
          id?: string
          school_term_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advising_plan_item_advising_plan_id_student_id_school_term_fkey"
            columns: ["advising_plan_id", "student_id", "school_term_id"]
            isOneToOne: false
            referencedRelation: "advising_plan"
            referencedColumns: ["id", "student_id", "school_term_id"]
          },
          {
            foreignKeyName: "advising_plan_item_course_offering_id_school_term_id_fkey"
            columns: ["course_offering_id", "school_term_id"]
            isOneToOne: false
            referencedRelation: "course_offering"
            referencedColumns: ["id", "school_term_id"]
          },
          {
            foreignKeyName: "advising_plan_item_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt: {
        Row: {
          course_offering_id: string
          created_at: string
          created_by: string
          curriculum_term_course_id: string | null
          final_grade: number | null
          id: string
          inc_deadline: string | null
          instructor: string | null
          midterm_grade: number | null
          midterm_status: string | null
          prerequisite_grade_override: boolean
          prerequisite_override: boolean
          revision: number
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          units_attempted: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          course_offering_id: string
          created_at?: string
          created_by: string
          curriculum_term_course_id?: string | null
          final_grade?: number | null
          id?: string
          inc_deadline?: string | null
          instructor?: string | null
          midterm_grade?: number | null
          midterm_status?: string | null
          prerequisite_grade_override?: boolean
          prerequisite_override?: boolean
          revision?: number
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          units_attempted: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          course_offering_id?: string
          created_at?: string
          created_by?: string
          curriculum_term_course_id?: string | null
          final_grade?: number | null
          id?: string
          inc_deadline?: string | null
          instructor?: string | null
          midterm_grade?: number | null
          midterm_status?: string | null
          prerequisite_grade_override?: boolean
          prerequisite_override?: boolean
          revision?: number
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string
          units_attempted?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "course_offering"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_remark: {
        Row: {
          attempt_id: string | null
          authored_by: string
          body_text: string
          created_at: string
          curriculum_term_course_id: string | null
          id: string
          student_id: string
        }
        Insert: {
          attempt_id?: string | null
          authored_by: string
          body_text: string
          created_at?: string
          curriculum_term_course_id?: string | null
          id?: string
          student_id: string
        }
        Update: {
          attempt_id?: string | null
          authored_by?: string
          body_text?: string
          created_at?: string
          curriculum_term_course_id?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_remark_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_remark_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_remark_student_attempt_key"
            columns: ["attempt_id", "student_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "attempt_remark_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_entry: {
        Row: {
          action: string
          action_category: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: Database["public"]["Enums"]["role_type"] | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          student_id: string | null
        }
        Insert: {
          action: string
          action_category?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: Database["public"]["Enums"]["role_type"] | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          student_id?: string | null
        }
        Update: {
          action?: string
          action_category?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: Database["public"]["Enums"]["role_type"] | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_entry_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_entry_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      course: {
        Row: {
          category: string
          code: string
          department_id: string
          id: string
          is_elective: boolean
          lab_hours: number
          lecture_hours: number
          repeatable_type: Database["public"]["Enums"]["repeatable_type"]
          status: Database["public"]["Enums"]["course_status"]
          title: string
          units: number
        }
        Insert: {
          category?: string
          code: string
          department_id: string
          id?: string
          is_elective?: boolean
          lab_hours?: number
          lecture_hours?: number
          repeatable_type?: Database["public"]["Enums"]["repeatable_type"]
          status?: Database["public"]["Enums"]["course_status"]
          title: string
          units: number
        }
        Update: {
          category?: string
          code?: string
          department_id?: string
          id?: string
          is_elective?: boolean
          lab_hours?: number
          lecture_hours?: number
          repeatable_type?: Database["public"]["Enums"]["repeatable_type"]
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offering: {
        Row: {
          course_id: string
          id: string
          instructor: string | null
          is_by_request: boolean
          schedule: string | null
          school_term_id: string
          section: string | null
        }
        Insert: {
          course_id: string
          id?: string
          instructor?: string | null
          is_by_request?: boolean
          schedule?: string | null
          school_term_id: string
          section?: string | null
        }
        Update: {
          course_id?: string
          id?: string
          instructor?: string | null
          is_by_request?: boolean
          schedule?: string | null
          school_term_id?: string
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_offering_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offering_school_term_id_fkey"
            columns: ["school_term_id"]
            isOneToOne: false
            referencedRelation: "school_term"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_pair_equivalence: {
        Row: {
          created_at: string
          created_by: string
          from_curriculum_version_id: string
          id: string
          note: string | null
          source_course_id: string
          target_course_id: string
          to_curriculum_version_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          from_curriculum_version_id: string
          id?: string
          note?: string | null
          source_course_id: string
          target_course_id: string
          to_curriculum_version_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_curriculum_version_id?: string
          id?: string
          note?: string | null
          source_course_id?: string
          target_course_id?: string
          to_curriculum_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_pair_equivalence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_from_curriculum_version_id_fkey"
            columns: ["from_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_target_course_id_fkey"
            columns: ["target_course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_to_curriculum_version_id_fkey"
            columns: ["to_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_term: {
        Row: {
          curriculum_version_id: string
          id: string
          term_sequence: number
          year_level: number
        }
        Insert: {
          curriculum_version_id: string
          id?: string
          term_sequence: number
          year_level: number
        }
        Update: {
          curriculum_version_id?: string
          id?: string
          term_sequence?: number
          year_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_term_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_term_course: {
        Row: {
          course_id: string | null
          curriculum_term_id: string
          id: string
          is_elective_slot: boolean
          nominal_units: number
          slot_label: string | null
          slot_type: string
        }
        Insert: {
          course_id?: string | null
          curriculum_term_id: string
          id?: string
          is_elective_slot?: boolean
          nominal_units: number
          slot_label?: string | null
          slot_type?: string
        }
        Update: {
          course_id?: string | null
          curriculum_term_id?: string
          id?: string
          is_elective_slot?: boolean
          nominal_units?: number
          slot_label?: string | null
          slot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_term_course_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_term_course_curriculum_term_id_fkey"
            columns: ["curriculum_term_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_transfer_request: {
        Row: {
          carried_units: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          endorsed_by: string
          endorsement_note: string
          from_curriculum_version_id: string
          id: string
          status: string
          student_id: string
          to_curriculum_version_id: string
          updated_at: string
        }
        Insert: {
          carried_units?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          endorsed_by: string
          endorsement_note: string
          from_curriculum_version_id: string
          id?: string
          status?: string
          student_id: string
          to_curriculum_version_id: string
          updated_at?: string
        }
        Update: {
          carried_units?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          endorsed_by?: string
          endorsement_note?: string
          from_curriculum_version_id?: string
          id?: string
          status?: string
          student_id?: string
          to_curriculum_version_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_transfer_request_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_endorsed_by_fkey"
            columns: ["endorsed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_from_curriculum_version_id_fkey"
            columns: ["from_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_to_curriculum_version_id_fkey"
            columns: ["to_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_version: {
        Row: {
          delinquency_threshold: number
          effective_end: string | null
          effective_start: string
          id: string
          program_id: string
          status: Database["public"]["Enums"]["curriculum_version_status"]
          total_units: number
          version_label: string
        }
        Insert: {
          delinquency_threshold?: number
          effective_end?: string | null
          effective_start: string
          id?: string
          program_id: string
          status?: Database["public"]["Enums"]["curriculum_version_status"]
          total_units?: number
          version_label: string
        }
        Update: {
          delinquency_threshold?: number
          effective_end?: string | null
          effective_start?: string
          id?: string
          program_id?: string
          status?: Database["public"]["Enums"]["curriculum_version_status"]
          total_units?: number
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_version_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
        ]
      }
      department: {
        Row: {
          code: string | null
          faculty_id: string
          id: string
          letterhead_name: string | null
          letterhead_prefix: string | null
          name: string
        }
        Insert: {
          code?: string | null
          faculty_id: string
          id?: string
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name: string
        }
        Update: {
          code?: string | null
          faculty_id?: string
          id?: string
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      department_term_encoding: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closure_note: string | null
          department_id: string
          id: string
          is_closed: boolean
          school_term_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closure_note?: string | null
          department_id: string
          id?: string
          is_closed?: boolean
          school_term_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closure_note?: string | null
          department_id?: string
          id?: string
          is_closed?: boolean
          school_term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_term_encoding_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_term_encoding_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_term_encoding_school_term_id_fkey"
            columns: ["school_term_id"]
            isOneToOne: false
            referencedRelation: "school_term"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_mapping: {
        Row: {
          attempt_id: string
          created_at: string
          curriculum_term_course_id: string
          id: string
          justification: string
          mapped_by: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          student_id: string
          units_credited: number
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          curriculum_term_course_id: string
          id?: string
          justification: string
          mapped_by: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id: string
          units_credited: number
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          curriculum_term_course_id?: string
          id?: string
          justification?: string
          mapped_by?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id?: string
          units_credited?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_mapping_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_mapping_mapped_by_fkey"
            columns: ["mapped_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_mapping_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_mapping_source_key"
            columns: ["attempt_id", "student_id", "units_credited"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id", "units_attempted"]
          },
          {
            foreignKeyName: "elective_mapping_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      equivalency_decision: {
        Row: {
          attempt_id: string
          decided_at: string
          decided_by: string
          decision_type: Database["public"]["Enums"]["decision_type"]
          destination_curriculum_term_course_id: string
          id: string
          justification: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          student_id: string
          units_credited: number
          updated_at: string
        }
        Insert: {
          attempt_id: string
          decided_at?: string
          decided_by: string
          decision_type: Database["public"]["Enums"]["decision_type"]
          destination_curriculum_term_course_id: string
          id?: string
          justification: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id: string
          units_credited: number
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          decided_at?: string
          decided_by?: string
          decision_type?: Database["public"]["Enums"]["decision_type"]
          destination_curriculum_term_course_id?: string
          id?: string
          justification?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id?: string
          units_credited?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equivalency_decision_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalency_decision_destination_curriculum_term_course_id_fkey"
            columns: ["destination_curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalency_decision_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalency_decision_source_key"
            columns: ["attempt_id", "student_id", "units_credited"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id", "units_attempted"]
          },
          {
            foreignKeyName: "equivalency_decision_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          code: string | null
          id: string
          letterhead_name: string | null
          letterhead_prefix: string | null
          name: string
        }
        Insert: {
          code?: string | null
          id?: string
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name: string
        }
        Update: {
          code?: string | null
          id?: string
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name?: string
        }
        Relationships: []
      }
      grade_flag: {
        Row: {
          attempt_id: string
          corrected_grade: number | null
          corrected_status: Database["public"]["Enums"]["attempt_status"] | null
          created_at: string
          details: string
          id: string
          issue_type: string
          reported_grade_text: string | null
          reported_stage: string | null
          resolution_action: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          corrected_grade?: number | null
          corrected_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          created_at?: string
          details: string
          id?: string
          issue_type: string
          reported_grade_text?: string | null
          reported_stage?: string | null
          resolution_action?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          corrected_grade?: number | null
          corrected_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          created_at?: string
          details?: string
          id?: string
          issue_type?: string
          reported_grade_text?: string | null
          reported_stage?: string | null
          resolution_action?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_flag_attempt_id_student_id_fkey"
            columns: ["attempt_id", "student_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "grade_flag_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      inc_resolution: {
        Row: {
          attempt_id: string
          completion_grade: number
          effective_status: Database["public"]["Enums"]["attempt_status"] | null
          id: string
          reason: string
          resolved_at: string
          resolved_by: string
          student_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          attempt_id: string
          completion_grade: number
          effective_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          id?: string
          reason: string
          resolved_at?: string
          resolved_by: string
          student_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          attempt_id?: string
          completion_grade?: number
          effective_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          id?: string
          reason?: string
          resolved_at?: string
          resolved_by?: string
          student_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inc_resolution_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inc_resolution_student_attempt_key"
            columns: ["attempt_id", "student_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "inc_resolution_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inc_resolution_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          email_delivery_status: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          is_read: boolean
          kind: string
          read_at: string | null
          recipient_id: string
          target_route: string | null
          target_student_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          dedupe_key?: string | null
          email_delivery_status?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          is_read?: boolean
          kind: string
          read_at?: string | null
          recipient_id: string
          target_route?: string | null
          target_student_id?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string | null
          email_delivery_status?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          is_read?: boolean
          kind?: string
          read_at?: string | null
          recipient_id?: string
          target_route?: string | null
          target_student_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_target_student_id_fkey"
            columns: ["target_student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      outside_credit: {
        Row: {
          decided_at: string
          decided_by: string
          destination_curriculum_term_course_id: string
          entry_type: string
          grade: string
          id: string
          origin_school: string
          original_course_code: string
          original_course_title: string
          reason: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          student_id: string
          units: number
          units_credited: number
          updated_at: string
        }
        Insert: {
          decided_at?: string
          decided_by: string
          destination_curriculum_term_course_id: string
          entry_type: string
          grade: string
          id?: string
          origin_school: string
          original_course_code: string
          original_course_title: string
          reason: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id: string
          units: number
          units_credited: number
          updated_at?: string
        }
        Update: {
          decided_at?: string
          decided_by?: string
          destination_curriculum_term_course_id?: string
          entry_type?: string
          grade?: string
          id?: string
          origin_school?: string
          original_course_code?: string
          original_course_title?: string
          reason?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          student_id?: string
          units?: number
          units_credited?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outside_credit_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outside_credit_destination_curriculum_term_course_id_fkey"
            columns: ["destination_curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outside_credit_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outside_credit_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      prerequisite: {
        Row: {
          course_id: string
          id: string
          prerequisite_course_id: string
          type: Database["public"]["Enums"]["prerequisite_type"]
        }
        Insert: {
          course_id: string
          id?: string
          prerequisite_course_id: string
          type: Database["public"]["Enums"]["prerequisite_type"]
        }
        Update: {
          course_id?: string
          id?: string
          prerequisite_course_id?: string
          type?: Database["public"]["Enums"]["prerequisite_type"]
        }
        Relationships: [
          {
            foreignKeyName: "prerequisite_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerequisite_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          avatar_url: string | null
          consultation_hours: string | null
          created_at: string
          department_id: string | null
          email: string
          entry_year: number | null
          faculty_id: string | null
          full_name: string
          id: string
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_status: string | null
          role: Database["public"]["Enums"]["role_type"]
          status: Database["public"]["Enums"]["profile_status"]
          student_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          consultation_hours?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          entry_year?: number | null
          faculty_id?: string | null
          full_name: string
          id: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          role: Database["public"]["Enums"]["role_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          student_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          consultation_hours?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          entry_year?: number | null
          faculty_id?: string | null
          full_name?: string
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          student_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      program: {
        Row: {
          code: string
          department_id: string
          id: string
          name: string
          nominal_duration: number
          status: Database["public"]["Enums"]["program_status"]
        }
        Insert: {
          code: string
          department_id: string
          id?: string
          name: string
          nominal_duration: number
          status?: Database["public"]["Enums"]["program_status"]
        }
        Update: {
          code?: string
          department_id?: string
          id?: string
          name?: string
          nominal_duration?: number
          status?: Database["public"]["Enums"]["program_status"]
        }
        Relationships: [
          {
            foreignKeyName: "program_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignment: {
        Row: {
          created_at: string
          department_id: string | null
          faculty_id: string | null
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["role_type"]
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          faculty_id?: string | null
          id?: string
          profile_id: string
          role: Database["public"]["Enums"]["role_type"]
        }
        Update: {
          created_at?: string
          department_id?: string | null
          faculty_id?: string | null
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "role_assignment_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignment_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignment_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      school_term: {
        Row: {
          chronological_key: number | null
          closed_at: string | null
          closed_by: string | null
          closure_note: string | null
          default_inc_deadline: string | null
          encoding_deadline: string | null
          end_year: number
          ends_on: string
          id: string
          is_locked: boolean
          override_actor_id: string | null
          override_at: string | null
          override_flag: boolean
          school_year: string | null
          start_year: number
          starts_on: string | null
          term_type: Database["public"]["Enums"]["school_term_type"]
        }
        Insert: {
          chronological_key?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closure_note?: string | null
          default_inc_deadline?: string | null
          encoding_deadline?: string | null
          end_year: number
          ends_on: string
          id?: string
          is_locked?: boolean
          override_actor_id?: string | null
          override_at?: string | null
          override_flag?: boolean
          school_year?: string | null
          start_year: number
          starts_on?: string | null
          term_type: Database["public"]["Enums"]["school_term_type"]
        }
        Update: {
          chronological_key?: number | null
          closed_at?: string | null
          closed_by?: string | null
          closure_note?: string | null
          default_inc_deadline?: string | null
          encoding_deadline?: string | null
          end_year?: number
          ends_on?: string
          id?: string
          is_locked?: boolean
          override_actor_id?: string | null
          override_at?: string | null
          override_flag?: boolean
          school_year?: string | null
          start_year?: number
          starts_on?: string | null
          term_type?: Database["public"]["Enums"]["school_term_type"]
        }
        Relationships: [
          {
            foreignKeyName: "school_term_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_term_override_actor_id_fkey"
            columns: ["override_actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      student_curriculum_assignment: {
        Row: {
          created_at: string
          curriculum_version_id: string
          end_date: string | null
          id: string
          reason: string
          start_date: string
          student_id: string
        }
        Insert: {
          created_at?: string
          curriculum_version_id: string
          end_date?: string | null
          id?: string
          reason: string
          start_date: string
          student_id: string
        }
        Update: {
          created_at?: string
          curriculum_version_id?: string
          end_date?: string | null
          id?: string
          reason?: string
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_curriculum_assignment_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          department_id: string | null
          dismissal_pct: number
          id: string
          last_backup_at: string | null
          last_backup_by: string | null
          last_backup_location: string | null
          last_backup_reference: string | null
          last_backup_scope: string | null
          probation_pct: number
          sender_email: string
          updated_at: string
          warning_pct: number
        }
        Insert: {
          department_id?: string | null
          dismissal_pct: number
          id?: string
          last_backup_at?: string | null
          last_backup_by?: string | null
          last_backup_location?: string | null
          last_backup_reference?: string | null
          last_backup_scope?: string | null
          probation_pct: number
          sender_email: string
          updated_at?: string
          warning_pct: number
        }
        Update: {
          department_id?: string | null
          dismissal_pct?: number
          id?: string
          last_backup_at?: string | null
          last_backup_by?: string | null
          last_backup_location?: string | null
          last_backup_reference?: string | null
          last_backup_scope?: string | null
          probation_pct?: number
          sender_email?: string
          updated_at?: string
          warning_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_last_backup_by_fkey"
            columns: ["last_backup_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      jerome_operation: {
        Args: { p_body?: Json; p_operation: string; p_params?: Json }
        Returns: Json
      }
      matt_assistant_context: {
        Args: { p_body: Json; p_student_id: string }
        Returns: Json
      }
      matt_operation: {
        Args: { p_body?: Json; p_operation: string; p_params?: Json }
        Returns: Json
      }
      recompute_lapsed_inc_gwa: { Args: never; Returns: number }
      saais_before_user_created: { Args: { event: Json }; Returns: Json }
      saais_claim_email: {
        Args: { p_allowed_recipients: string[] }
        Returns: {
          email: string
          id: string
          kind: string
          lease: string
          message: string
          subject: string
          token: string
        }[]
      }
      saais_finish_email: {
        Args: {
          p_id: string
          p_kind: string
          p_lease: string
          p_outcome: string
        }
        Returns: undefined
      }
      saais_get_assistant_history: {
        Args: { p_student_id: string }
        Returns: Json
      }
      saais_invitation_service: {
        Args: {
          p_actor?: string
          p_body: Json
          p_operation: string
          p_profile?: string
          p_redemption?: string
          p_session?: string
          p_stage: string
          p_token?: string
        }
        Returns: Json
      }
      saais_photo_upload_authorize: {
        Args: { p_path: string; p_student: string }
        Returns: boolean
      }
      saais_record_assistant_turn: {
        Args: {
          p_adviser_id: string
          p_answer: string
          p_question: string
          p_student_id: string
        }
        Returns: undefined
      }
      saais_register_verified_photo: {
        Args: { p_actor: string; p_path: string; p_student: string }
        Returns: undefined
      }
    }
    Enums: {
      attempt_status:
        | "passed"
        | "failed"
        | "currently_enrolled"
        | "inc"
        | "dr"
        | "na"
      course_status: "active" | "discontinued"
      curriculum_version_status:
        | "draft"
        | "active"
        | "teach_out"
        | "closed"
        | "retired"
      decision_type: "transfer_equivalency" | "discontinued_course_equivalency"
      prerequisite_type: "strict" | "co_requisite" | "recommended"
      profile_status: "invited" | "active" | "disabled"
      program_status: "active" | "archived"
      repeatable_type: "none" | "grade_replacement" | "additional_credit"
      role_type:
        | "student"
        | "adviser"
        | "admin"
        | "department_head"
        | "department_staff"
        | "dean"
      school_term_type: "1st Semester" | "2nd Semester" | "Summer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  saais_api: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      adviser_assignment: {
        Row: {
          adviser_consultation_hours: string | null
          adviser_email: string | null
          adviser_faculty_name: string | null
          adviser_id: string | null
          adviser_name: string | null
          created_at: string | null
          end_date: string | null
          handed_over_to_adviser_id: string | null
          handed_over_to_name: string | null
          handover_label: string | null
          id: string | null
          start_date: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adviser_assignment_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adviser_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      advising_note: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          author_name: string | null
          author_role_label: string | null
          authored_by: string | null
          body_text: string | null
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          student_id: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          author_name?: string | null
          author_role_label?: string | null
          authored_by?: string | null
          body_text?: string | null
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          student_id?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          author_name?: string | null
          author_role_label?: string | null
          authored_by?: string | null
          body_text?: string | null
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advising_note_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_note_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_note_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      advising_plan: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          revision: number | null
          school_term_id: string | null
          student_curriculum_assignment_id: string | null
          student_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          revision?: number | null
          school_term_id?: string | null
          student_curriculum_assignment_id?: string | null
          student_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          revision?: number | null
          school_term_id?: string | null
          student_curriculum_assignment_id?: string | null
          student_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advising_plan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_plan_school_term_id_fkey"
            columns: ["school_term_id"]
            isOneToOne: false
            referencedRelation: "school_term"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_plan_student_curriculum_assignment_id_student_id_fkey"
            columns: ["student_curriculum_assignment_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_curriculum_assignment"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "advising_plan_student_curriculum_assignment_id_student_id_fkey"
            columns: ["student_curriculum_assignment_id", "student_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: [
              "student_curriculum_assignment_id",
              "student_id",
            ]
          },
          {
            foreignKeyName: "advising_plan_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advising_plan_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      advising_plan_item: {
        Row: {
          advising_plan_id: string | null
          course_offering_id: string | null
          created_at: string | null
          curriculum_term_course_id: string | null
          display_order: number | null
          id: string | null
          school_term_id: string | null
          student_id: string | null
        }
        Insert: {
          advising_plan_id?: string | null
          course_offering_id?: string | null
          created_at?: string | null
          curriculum_term_course_id?: string | null
          display_order?: number | null
          id?: string | null
          school_term_id?: string | null
          student_id?: string | null
        }
        Update: {
          advising_plan_id?: string | null
          course_offering_id?: string | null
          created_at?: string | null
          curriculum_term_course_id?: string | null
          display_order?: number | null
          id?: string | null
          school_term_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advising_plan_item_advising_plan_id_student_id_school_term_fkey"
            columns: ["advising_plan_id", "student_id", "school_term_id"]
            isOneToOne: false
            referencedRelation: "advising_plan"
            referencedColumns: ["id", "student_id", "school_term_id"]
          },
          {
            foreignKeyName: "advising_plan_item_course_offering_id_school_term_id_fkey"
            columns: ["course_offering_id", "school_term_id"]
            isOneToOne: false
            referencedRelation: "course_offering"
            referencedColumns: ["id", "school_term_id"]
          },
          {
            foreignKeyName: "advising_plan_item_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt: {
        Row: {
          course_offering_id: string | null
          created_at: string | null
          created_by: string | null
          curriculum_term_course_id: string | null
          final_grade: number | null
          id: string | null
          inc_deadline: string | null
          instructor: string | null
          midterm_grade: number | null
          midterm_status: string | null
          prerequisite_grade_override: boolean | null
          prerequisite_override: boolean | null
          revision: number | null
          status: Database["public"]["Enums"]["attempt_status"] | null
          student_id: string | null
          units_attempted: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          course_offering_id?: string | null
          created_at?: string | null
          created_by?: string | null
          curriculum_term_course_id?: string | null
          final_grade?: number | null
          id?: string | null
          inc_deadline?: string | null
          instructor?: string | null
          midterm_grade?: number | null
          midterm_status?: string | null
          prerequisite_grade_override?: boolean | null
          prerequisite_override?: boolean | null
          revision?: number | null
          status?: Database["public"]["Enums"]["attempt_status"] | null
          student_id?: string | null
          units_attempted?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          course_offering_id?: string | null
          created_at?: string | null
          created_by?: string | null
          curriculum_term_course_id?: string | null
          final_grade?: number | null
          id?: string | null
          inc_deadline?: string | null
          instructor?: string | null
          midterm_grade?: number | null
          midterm_status?: string | null
          prerequisite_grade_override?: boolean | null
          prerequisite_override?: boolean | null
          revision?: number | null
          status?: Database["public"]["Enums"]["attempt_status"] | null
          student_id?: string | null
          units_attempted?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "course_offering"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_remark: {
        Row: {
          attempt_id: string | null
          authored_by: string | null
          body_text: string | null
          created_at: string | null
          curriculum_term_course_id: string | null
          id: string | null
          student_id: string | null
        }
        Insert: {
          attempt_id?: string | null
          authored_by?: string | null
          body_text?: string | null
          created_at?: string | null
          curriculum_term_course_id?: string | null
          id?: string | null
          student_id?: string | null
        }
        Update: {
          attempt_id?: string | null
          authored_by?: string | null
          body_text?: string | null
          created_at?: string | null
          curriculum_term_course_id?: string | null
          id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_remark_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_remark_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_remark_student_attempt_key"
            columns: ["attempt_id", "student_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "attempt_remark_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_result: {
        Row: {
          completion_grade: number | null
          counts_toward_cumulative_gwa: boolean | null
          course_offering_id: string | null
          created_at: string | null
          curriculum_term_course_id: string | null
          effective_status: string | null
          final_grade: number | null
          gwa_grade: number | null
          id: string | null
          inc_deadline: string | null
          instructor: string | null
          is_lapsed_inc: boolean | null
          is_repeated: boolean | null
          midterm_grade: number | null
          midterm_status: string | null
          prerequisite_grade_override: boolean | null
          prerequisite_override: boolean | null
          recorded_status: string | null
          resolved_at: string | null
          revision: number | null
          student_id: string | null
          units_attempted: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_curriculum_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_entry: {
        Row: {
          action: string | null
          action_category: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: Database["public"]["Enums"]["role_type"] | null
          created_at: string | null
          details_summary: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          student_id: string | null
          student_name: string | null
          student_number: string | null
          target_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_entry_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_entry_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      course: {
        Row: {
          category: string | null
          code: string | null
          department_id: string | null
          id: string | null
          is_elective: boolean | null
          repeatable_type: Database["public"]["Enums"]["repeatable_type"] | null
          status: Database["public"]["Enums"]["course_status"] | null
          title: string | null
          units: number | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          department_id?: string | null
          id?: string | null
          is_elective?: boolean | null
          repeatable_type?:
            | Database["public"]["Enums"]["repeatable_type"]
            | null
          status?: Database["public"]["Enums"]["course_status"] | null
          title?: string | null
          units?: number | null
        }
        Update: {
          category?: string | null
          code?: string | null
          department_id?: string | null
          id?: string | null
          is_elective?: boolean | null
          repeatable_type?:
            | Database["public"]["Enums"]["repeatable_type"]
            | null
          status?: Database["public"]["Enums"]["course_status"] | null
          title?: string | null
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: ["department_id"]
          },
        ]
      }
      course_offering: {
        Row: {
          course_id: string | null
          id: string | null
          instructor: string | null
          is_by_request: boolean | null
          schedule: string | null
          school_term_id: string | null
          section: string | null
        }
        Insert: {
          course_id?: string | null
          id?: string | null
          instructor?: string | null
          is_by_request?: boolean | null
          schedule?: string | null
          school_term_id?: string | null
          section?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string | null
          instructor?: string | null
          is_by_request?: boolean | null
          schedule?: string | null
          school_term_id?: string | null
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_offering_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offering_school_term_id_fkey"
            columns: ["school_term_id"]
            isOneToOne: false
            referencedRelation: "school_term"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_pair_equivalence: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_curriculum_version_id: string | null
          id: string | null
          note: string | null
          source_course_id: string | null
          target_course_id: string | null
          to_curriculum_version_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_curriculum_version_id?: string | null
          id?: string | null
          note?: string | null
          source_course_id?: string | null
          target_course_id?: string | null
          to_curriculum_version_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_curriculum_version_id?: string | null
          id?: string | null
          note?: string | null
          source_course_id?: string | null
          target_course_id?: string | null
          to_curriculum_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_pair_equivalence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_from_curriculum_version_id_fkey"
            columns: ["from_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_source_course_id_fkey"
            columns: ["source_course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_target_course_id_fkey"
            columns: ["target_course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_pair_equivalence_to_curriculum_version_id_fkey"
            columns: ["to_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_term: {
        Row: {
          curriculum_version_id: string | null
          id: string | null
          term_sequence: number | null
          year_level: number | null
        }
        Insert: {
          curriculum_version_id?: string | null
          id?: string | null
          term_sequence?: number | null
          year_level?: number | null
        }
        Update: {
          curriculum_version_id?: string | null
          id?: string | null
          term_sequence?: number | null
          year_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_term_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_term_course: {
        Row: {
          course_id: string | null
          curriculum_term_id: string | null
          id: string | null
          is_elective_slot: boolean | null
          nominal_units: number | null
          slot_label: string | null
          slot_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_term_course_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_term_course_curriculum_term_id_fkey"
            columns: ["curriculum_term_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_transfer_request: {
        Row: {
          carried_units: number | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          decision_note: string | null
          endorsed_by: string | null
          endorsed_by_name: string | null
          endorsement_note: string | null
          from_curriculum_version_id: string | null
          id: string | null
          status: string | null
          student_id: string | null
          to_curriculum_version_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_transfer_request_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_endorsed_by_fkey"
            columns: ["endorsed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_from_curriculum_version_id_fkey"
            columns: ["from_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_transfer_request_to_curriculum_version_id_fkey"
            columns: ["to_curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_version: {
        Row: {
          delinquency_threshold: number | null
          effective_end: string | null
          effective_start: string | null
          enrolled_student_count: number | null
          id: string | null
          program_id: string | null
          status:
            | Database["public"]["Enums"]["curriculum_version_status"]
            | null
          total_units: number | null
          version_label: string | null
        }
        Insert: {
          delinquency_threshold?: number | null
          effective_end?: string | null
          effective_start?: string | null
          enrolled_student_count?: never
          id?: string | null
          program_id?: string | null
          status?:
            | Database["public"]["Enums"]["curriculum_version_status"]
            | null
          total_units?: number | null
          version_label?: string | null
        }
        Update: {
          delinquency_threshold?: number | null
          effective_end?: string | null
          effective_start?: string | null
          enrolled_student_count?: never
          id?: string | null
          program_id?: string | null
          status?:
            | Database["public"]["Enums"]["curriculum_version_status"]
            | null
          total_units?: number | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_version_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_version_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: ["program_id"]
          },
        ]
      }
      department: {
        Row: {
          code: string | null
          dean_name: string | null
          department_head_name: string | null
          faculty_id: string | null
          id: string | null
          letterhead_name: string | null
          letterhead_prefix: string | null
          name: string | null
        }
        Insert: {
          code?: string | null
          dean_name?: never
          department_head_name?: never
          faculty_id?: string | null
          id?: string | null
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name?: string | null
        }
        Update: {
          code?: string | null
          dean_name?: never
          department_head_name?: never
          faculty_id?: string | null
          id?: string | null
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      department_term_encoding: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          closure_note: string | null
          department_id: string | null
          id: string | null
          is_closed: boolean | null
          school_term_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: never
          closure_note?: string | null
          department_id?: string | null
          id?: string | null
          is_closed?: boolean | null
          school_term_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closed_by_name?: never
          closure_note?: string | null
          department_id?: string | null
          id?: string | null
          is_closed?: boolean | null
          school_term_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_term_encoding_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_term_encoding_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_term_encoding_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "department_term_encoding_school_term_id_fkey"
            columns: ["school_term_id"]
            isOneToOne: false
            referencedRelation: "school_term"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_mapping: {
        Row: {
          attempt_id: string | null
          created_at: string | null
          curriculum_term_course_id: string | null
          id: string | null
          mapped_by: string | null
          revoked_at: string | null
          student_id: string | null
          units_credited: number | null
          updated_at: string | null
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string | null
          curriculum_term_course_id?: string | null
          id?: string | null
          mapped_by?: string | null
          revoked_at?: string | null
          student_id?: string | null
          units_credited?: number | null
          updated_at?: string | null
        }
        Update: {
          attempt_id?: string | null
          created_at?: string | null
          curriculum_term_course_id?: string | null
          id?: string | null
          mapped_by?: string | null
          revoked_at?: string | null
          student_id?: string | null
          units_credited?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elective_mapping_curriculum_term_course_id_fkey"
            columns: ["curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_mapping_mapped_by_fkey"
            columns: ["mapped_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_mapping_source_key"
            columns: ["attempt_id", "student_id", "units_credited"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id", "units_attempted"]
          },
          {
            foreignKeyName: "elective_mapping_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      equivalency_decision: {
        Row: {
          attempt_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision_type: Database["public"]["Enums"]["decision_type"] | null
          destination_curriculum_term_course_id: string | null
          id: string | null
          revoked_at: string | null
          student_id: string | null
          units_credited: number | null
          updated_at: string | null
        }
        Insert: {
          attempt_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_type?: Database["public"]["Enums"]["decision_type"] | null
          destination_curriculum_term_course_id?: string | null
          id?: string | null
          revoked_at?: string | null
          student_id?: string | null
          units_credited?: number | null
          updated_at?: string | null
        }
        Update: {
          attempt_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_type?: Database["public"]["Enums"]["decision_type"] | null
          destination_curriculum_term_course_id?: string | null
          id?: string | null
          revoked_at?: string | null
          student_id?: string | null
          units_credited?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equivalency_decision_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalency_decision_destination_curriculum_term_course_id_fkey"
            columns: ["destination_curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalency_decision_source_key"
            columns: ["attempt_id", "student_id", "units_credited"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id", "units_attempted"]
          },
          {
            foreignKeyName: "equivalency_decision_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          code: string | null
          dean_name: string | null
          id: string | null
          letterhead_name: string | null
          letterhead_prefix: string | null
          name: string | null
        }
        Insert: {
          code?: string | null
          dean_name?: never
          id?: string | null
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name?: string | null
        }
        Update: {
          code?: string | null
          dean_name?: never
          id?: string | null
          letterhead_name?: string | null
          letterhead_prefix?: string | null
          name?: string | null
        }
        Relationships: []
      }
      grade_flag: {
        Row: {
          attempt_id: string | null
          corrected_grade: number | null
          corrected_status: Database["public"]["Enums"]["attempt_status"] | null
          created_at: string | null
          details: string | null
          id: string | null
          issue_type: string | null
          reported_grade_text: string | null
          reported_stage: string | null
          resolution_action: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_id?: string | null
          corrected_grade?: number | null
          corrected_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          created_at?: string | null
          details?: string | null
          id?: string | null
          issue_type?: string | null
          reported_grade_text?: string | null
          reported_stage?: string | null
          resolution_action?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_id?: string | null
          corrected_grade?: number | null
          corrected_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          created_at?: string | null
          details?: string | null
          id?: string | null
          issue_type?: string | null
          reported_grade_text?: string | null
          reported_stage?: string | null
          resolution_action?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_flag_attempt_id_student_id_fkey"
            columns: ["attempt_id", "student_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "grade_flag_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      inc_resolution: {
        Row: {
          attempt_id: string | null
          completion_grade: number | null
          effective_status: Database["public"]["Enums"]["attempt_status"] | null
          id: string | null
          resolved_at: string | null
          resolved_by: string | null
          student_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          attempt_id?: string | null
          completion_grade?: number | null
          effective_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          student_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          attempt_id?: string | null
          completion_grade?: number | null
          effective_status?:
            | Database["public"]["Enums"]["attempt_status"]
            | null
          id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          student_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inc_resolution_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inc_resolution_student_attempt_key"
            columns: ["attempt_id", "student_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id", "student_id"]
          },
          {
            foreignKeyName: "inc_resolution_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inc_resolution_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string | null
          dedupe_key: string | null
          email_delivery_status: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string | null
          is_read: boolean | null
          kind: string | null
          read_at: string | null
          recipient_id: string | null
          target_route: string | null
          target_student_id: string | null
          title: string | null
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          email_delivery_status?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string | null
          is_read?: boolean | null
          kind?: string | null
          read_at?: string | null
          recipient_id?: string | null
          target_route?: string | null
          target_student_id?: string | null
          title?: string | null
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          email_delivery_status?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string | null
          is_read?: boolean | null
          kind?: string | null
          read_at?: string | null
          recipient_id?: string | null
          target_route?: string | null
          target_student_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_target_student_id_fkey"
            columns: ["target_student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      outside_credit: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          destination_curriculum_term_course_id: string | null
          entry_type: string | null
          grade: string | null
          id: string | null
          origin_school: string | null
          original_course_code: string | null
          original_course_title: string | null
          revoked_at: string | null
          student_id: string | null
          units: number | null
          units_credited: number | null
          updated_at: string | null
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          destination_curriculum_term_course_id?: string | null
          entry_type?: string | null
          grade?: string | null
          id?: string | null
          origin_school?: string | null
          original_course_code?: string | null
          original_course_title?: string | null
          revoked_at?: string | null
          student_id?: string | null
          units?: number | null
          units_credited?: number | null
          updated_at?: string | null
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          destination_curriculum_term_course_id?: string | null
          entry_type?: string | null
          grade?: string | null
          id?: string | null
          origin_school?: string | null
          original_course_code?: string | null
          original_course_title?: string | null
          revoked_at?: string | null
          student_id?: string | null
          units?: number | null
          units_credited?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outside_credit_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outside_credit_destination_curriculum_term_course_id_fkey"
            columns: ["destination_curriculum_term_course_id"]
            isOneToOne: false
            referencedRelation: "curriculum_term_course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outside_credit_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      prerequisite: {
        Row: {
          course_id: string | null
          id: string | null
          prerequisite_course_id: string | null
          type: Database["public"]["Enums"]["prerequisite_type"] | null
        }
        Insert: {
          course_id?: string | null
          id?: string | null
          prerequisite_course_id?: string | null
          type?: Database["public"]["Enums"]["prerequisite_type"] | null
        }
        Update: {
          course_id?: string | null
          id?: string | null
          prerequisite_course_id?: string | null
          type?: Database["public"]["Enums"]["prerequisite_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "prerequisite_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerequisite_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          avatar_url: string | null
          consultation_hours: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          faculty_id: string | null
          full_name: string | null
          id: string | null
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_status: string | null
          role: Database["public"]["Enums"]["role_type"] | null
          roles: Database["public"]["Enums"]["role_type"][] | null
          status: Database["public"]["Enums"]["profile_status"] | null
          student_number: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          consultation_hours?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          faculty_id?: string | null
          full_name?: string | null
          id?: string | null
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: never
          role?: Database["public"]["Enums"]["role_type"] | null
          roles?: never
          status?: Database["public"]["Enums"]["profile_status"] | null
          student_number?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          consultation_hours?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          faculty_id?: string | null
          full_name?: string | null
          id?: string | null
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_status?: never
          role?: Database["public"]["Enums"]["role_type"] | null
          roles?: never
          status?: Database["public"]["Enums"]["profile_status"] | null
          student_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "profile_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      program: {
        Row: {
          code: string | null
          department_id: string | null
          id: string | null
          name: string | null
          nominal_duration: number | null
          status: Database["public"]["Enums"]["program_status"] | null
        }
        Insert: {
          code?: string | null
          department_id?: string | null
          id?: string | null
          name?: string | null
          nominal_duration?: number | null
          status?: Database["public"]["Enums"]["program_status"] | null
        }
        Update: {
          code?: string | null
          department_id?: string | null
          id?: string | null
          name?: string | null
          nominal_duration?: number | null
          status?: Database["public"]["Enums"]["program_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "program_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: ["department_id"]
          },
        ]
      }
      role_assignment: {
        Row: {
          created_at: string | null
          department_id: string | null
          faculty_id: string | null
          id: string | null
          profile_id: string | null
          role: Database["public"]["Enums"]["role_type"] | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          faculty_id?: string | null
          id?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["role_type"] | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          faculty_id?: string | null
          id?: string | null
          profile_id?: string | null
          role?: Database["public"]["Enums"]["role_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "role_assignment_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignment_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "student_organization"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "role_assignment_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignment_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      school_term: {
        Row: {
          chronological_key: number | null
          closed_at: string | null
          closed_by: string | null
          closed_by_name: string | null
          closure_note: string | null
          default_inc_deadline: string | null
          department_closures: Json | null
          encoding_deadline: string | null
          end_year: number | null
          ends_on: string | null
          id: string | null
          is_locked: boolean | null
          override_actor_id: string | null
          override_at: string | null
          override_flag: boolean | null
          school_year: string | null
          start_year: number | null
          starts_on: string | null
          term_type: Database["public"]["Enums"]["school_term_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "school_term_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_term_override_actor_id_fkey"
            columns: ["override_actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      student_curriculum_assignment: {
        Row: {
          change_note: string | null
          created_at: string | null
          curriculum_version_id: string | null
          end_date: string | null
          id: string | null
          start_date: string | null
          student_id: string | null
        }
        Insert: {
          change_note?: string | null
          created_at?: string | null
          curriculum_version_id?: string | null
          end_date?: string | null
          id?: string | null
          start_date?: string | null
          student_id?: string | null
        }
        Update: {
          change_note?: string | null
          created_at?: string | null
          curriculum_version_id?: string | null
          end_date?: string | null
          id?: string | null
          start_date?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_curriculum_assignment_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      student_organization: {
        Row: {
          adviser_id: string | null
          curriculum_version_id: string | null
          department_id: string | null
          entry_year: number | null
          faculty_id: string | null
          program_id: string | null
          student_curriculum_assignment_id: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adviser_assignment_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_assignment_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_assignment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          department_id: string | null
          dismissal_pct: number | null
          id: string | null
          last_backup_at: string | null
          last_backup_by: string | null
          last_backup_location: string | null
          last_backup_reference: string | null
          last_backup_scope: string | null
          probation_pct: number | null
          sender_email: string | null
          updated_at: string | null
          warning_pct: number | null
        }
        Insert: {
          department_id?: string | null
          dismissal_pct?: number | null
          id?: string | null
          last_backup_at?: string | null
          last_backup_by?: string | null
          last_backup_location?: string | null
          last_backup_reference?: string | null
          last_backup_scope?: string | null
          probation_pct?: number | null
          sender_email?: string | null
          updated_at?: string | null
          warning_pct?: number | null
        }
        Update: {
          department_id?: string | null
          dismissal_pct?: number | null
          id?: string | null
          last_backup_at?: string | null
          last_backup_by?: string | null
          last_backup_location?: string | null
          last_backup_reference?: string | null
          last_backup_scope?: string | null
          probation_pct?: number | null
          sender_email?: string | null
          updated_at?: string | null
          warning_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "department"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "student_organization"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "system_settings_last_backup_by_fkey"
            columns: ["last_backup_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attempt_status: [
        "passed",
        "failed",
        "currently_enrolled",
        "inc",
        "dr",
        "na",
      ],
      course_status: ["active", "discontinued"],
      curriculum_version_status: [
        "draft",
        "active",
        "teach_out",
        "closed",
        "retired",
      ],
      decision_type: [
        "transfer_equivalency",
        "discontinued_course_equivalency",
      ],
      prerequisite_type: ["strict", "co_requisite", "recommended"],
      profile_status: ["invited", "active", "disabled"],
      program_status: ["active", "archived"],
      repeatable_type: ["none", "grade_replacement", "additional_credit"],
      role_type: [
        "student",
        "adviser",
        "admin",
        "department_head",
        "department_staff",
        "dean",
      ],
      school_term_type: ["1st Semester", "2nd Semester", "Summer"],
    },
  },
  saais_api: {
    Enums: {},
  },
} as const
