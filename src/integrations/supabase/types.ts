export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata_json: Json | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata_json?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata_json?: Json | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_extractions: {
        Row: {
          confidence_score: number | null
          created_at: string
          extracted_action: string | null
          extracted_deadline: string | null
          extracted_owner: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          thread_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          extracted_action?: string | null
          extracted_deadline?: string | null
          extracted_owner?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          thread_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          extracted_action?: string | null
          extracted_deadline?: string | null
          extracted_owner?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_extractions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          comment: string | null
          decided_at: string | null
          id: string
          payload_json: Json | null
          project_id: string | null
          requested_at: string
          requester_id: string
          reviewer_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string | null
          id?: string
          payload_json?: Json | null
          project_id?: string | null
          requested_at?: string
          requester_id: string
          reviewer_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          comment?: string | null
          decided_at?: string | null
          id?: string
          payload_json?: Json | null
          project_id?: string | null
          requested_at?: string
          requester_id?: string
          reviewer_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blockers: {
        Row: {
          description: string
          id: string
          project_id: string
          raised_at: string
          raised_by: string | null
          resolved_at: string | null
          task_id: string | null
        }
        Insert: {
          description: string
          id?: string
          project_id: string
          raised_at?: string
          raised_by?: string | null
          resolved_at?: string | null
          task_id?: string | null
        }
        Update: {
          description?: string
          id?: string
          project_id?: string
          raised_at?: string
          raised_by?: string | null
          resolved_at?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blockers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          end_time: string
          google_event_id: string | null
          id: string
          project_id: string | null
          start_time: string
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          google_event_id?: string | null
          id?: string
          project_id?: string | null
          start_time: string
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          project_id?: string | null
          start_time?: string
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          name: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          name: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          ai_summary: string | null
          client_id: string | null
          created_at: string
          from_email: string | null
          gmail_thread_id: string | null
          id: string
          last_message_at: string | null
          project_id: string | null
          risk_level: string | null
          status: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          from_email?: string | null
          gmail_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          project_id?: string | null
          risk_level?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          from_email?: string | null
          gmail_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          project_id?: string | null
          risk_level?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string
          created_by: string | null
          days_waiting: number | null
          escalated: boolean | null
          escalation_level: number | null
          id: string
          last_action: string | null
          next_action_date: string | null
          project_id: string | null
          status: string | null
          task_id: string | null
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_waiting?: number | null
          escalated?: boolean | null
          escalation_level?: number | null
          id?: string
          last_action?: string | null
          next_action_date?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_waiting?: number | null
          escalated?: boolean | null
          escalation_level?: number | null
          id?: string
          last_action?: string | null
          next_action_date?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      note_suggestions: {
        Row: {
          accepted: boolean | null
          confidence_score: number | null
          created_at: string
          id: string
          note_id: string
          suggested_entity_json: Json | null
          suggestion_type: string
        }
        Insert: {
          accepted?: boolean | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          note_id: string
          suggested_entity_json?: Json | null
          suggestion_type: string
        }
        Update: {
          accepted?: boolean | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          note_id?: string
          suggested_entity_json?: Json | null
          suggestion_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_suggestions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content_json: Json | null
          created_at: string
          id: string
          linked_project_ids: string[] | null
          parent_note_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          content_json?: Json | null
          created_at?: string
          id?: string
          linked_project_ids?: string[] | null
          parent_note_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          content_json?: Json | null
          created_at?: string
          id?: string
          linked_project_ids?: string[] | null
          parent_note_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_parent_note_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_ai_actions: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          executed_at: string | null
          id: string
          payload_json: Json | null
          scheduled_at: string | null
          status: string | null
          triggered_by_rule: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          id?: string
          payload_json?: Json | null
          scheduled_at?: string | null
          status?: string | null
          triggered_by_rule?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          id?: string
          payload_json?: Json | null
          scheduled_at?: string | null
          status?: string | null
          triggered_by_rule?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          capacity_hours_per_day: number | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          capacity_hours_per_day?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          capacity_hours_per_day?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          access_level: string | null
          added_at: string
          added_by: string | null
          id: string
          project_id: string
          role_in_project: string | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          added_at?: string
          added_by?: string | null
          id?: string
          project_id: string
          role_in_project?: string | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          added_at?: string
          added_by?: string | null
          id?: string
          project_id?: string
          role_in_project?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          health_score: string | null
          id: string
          last_updated: string | null
          methodology: string | null
          name: string
          pm_id: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          health_score?: string | null
          id?: string
          last_updated?: string | null
          methodology?: string | null
          name: string
          pm_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          health_score?: string | null
          id?: string
          last_updated?: string | null
          methodology?: string | null
          name?: string
          pm_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          template_text: string
          use_case: string
          version: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          template_text: string
          use_case: string
          version?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          template_text?: string
          use_case?: string
          version?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_json: Json | null
          generated_at: string
          id: string
          pdf_url: string | null
          project_id: string | null
          recipient_ids: string[] | null
          sent_at: string | null
          type: string
        }
        Insert: {
          content_json?: Json | null
          generated_at?: string
          id?: string
          pdf_url?: string | null
          project_id?: string | null
          recipient_ids?: string[] | null
          sent_at?: string | null
          type: string
        }
        Update: {
          content_json?: Json | null
          generated_at?: string
          id?: string
          pdf_url?: string | null
          project_id?: string | null
          recipient_ids?: string[] | null
          sent_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      retro_action_items: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          owner_id: string | null
          retro_item_id: string | null
          sprint_id: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          owner_id?: string | null
          retro_item_id?: string | null
          sprint_id: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          owner_id?: string | null
          retro_item_id?: string | null
          sprint_id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retro_action_items_retro_item_id_fkey"
            columns: ["retro_item_id"]
            isOneToOne: false
            referencedRelation: "retro_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retro_action_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retro_action_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      retro_items: {
        Row: {
          anonymous: boolean | null
          category: string
          content: string
          created_at: string
          id: string
          sprint_id: string
          user_id: string | null
        }
        Insert: {
          anonymous?: boolean | null
          category: string
          content: string
          created_at?: string
          id?: string
          sprint_id: string
          user_id?: string | null
        }
        Update: {
          anonymous?: boolean | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          sprint_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retro_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          impact: string | null
          mitigation: string | null
          owner_id: string | null
          probability: string | null
          project_id: string
          severity_score: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          mitigation?: string | null
          owner_id?: string | null
          probability?: string | null
          project_id: string
          severity_score?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          mitigation?: string | null
          owner_id?: string | null
          probability?: string | null
          project_id?: string
          severity_score?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          capacity_points: number | null
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: string | null
          velocity_actual: number | null
        }
        Insert: {
          capacity_points?: number | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: string | null
          velocity_actual?: number | null
        }
        Update: {
          capacity_points?: number | null
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: string | null
          velocity_actual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      standup_entries: {
        Row: {
          blockers: string | null
          date: string
          doing_today: string | null
          done_yesterday: string | null
          id: string
          sprint_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          blockers?: string | null
          date?: string
          doing_today?: string | null
          done_yesterday?: string | null
          id?: string
          sprint_id: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          blockers?: string | null
          date?: string
          doing_today?: string | null
          done_yesterday?: string | null
          id?: string
          sprint_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standup_entries_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata_json: Json | null
          new_tier: string | null
          old_tier: string | null
          triggered_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata_json?: Json | null
          new_tier?: string | null
          old_tier?: string | null
          triggered_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json | null
          new_tier?: string | null
          old_tier?: string | null
          triggered_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          due_date: string | null
          id: string
          parent_task_id: string
          status: string | null
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          parent_task_id: string
          status?: string | null
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          parent_task_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          linked_thread_id: string | null
          priority: string | null
          project_id: string
          sprint_id: string | null
          status: string | null
          story_points: number | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_thread_id?: string | null
          priority?: string | null
          project_id: string
          sprint_id?: string | null
          status?: string | null
          story_points?: number | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_thread_id?: string | null
          priority?: string | null
          project_id?: string
          sprint_id?: string | null
          status?: string | null
          story_points?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_usage: {
        Row: {
          ai_actions_count: number | null
          billing_period_end: string
          billing_period_start: string
          id: string
          overage_actions: number | null
          overage_charged_usd: number | null
          seats_active: number | null
          storage_gb: number | null
          workspace_id: string
        }
        Insert: {
          ai_actions_count?: number | null
          billing_period_end: string
          billing_period_start: string
          id?: string
          overage_actions?: number | null
          overage_charged_usd?: number | null
          seats_active?: number | null
          storage_gb?: number | null
          workspace_id: string
        }
        Update: {
          ai_actions_count?: number | null
          billing_period_end?: string
          billing_period_start?: string
          id?: string
          overage_actions?: number | null
          overage_charged_usd?: number | null
          seats_active?: number | null
          storage_gb?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ai_actions_used: number | null
          billing_cycle: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          seats_used: number | null
          storage_used_gb: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          trial_ends_at: string | null
        }
        Insert: {
          ai_actions_used?: number | null
          billing_cycle?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          seats_used?: number | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_ends_at?: string | null
        }
        Update: {
          ai_actions_used?: number | null
          billing_cycle?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          seats_used?: number | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "pm" | "team_member" | "owner"
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
      app_role: ["super_admin", "admin", "pm", "team_member", "owner"],
    },
  },
} as const
