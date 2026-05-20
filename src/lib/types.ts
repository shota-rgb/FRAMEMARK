export type Role = 'director' | 'editor'

export type VideoStatus =
  | 'draft'
  | 'review'
  | 'revision_requested'
  | 'revised'
  | 'approved'

export type NotificationType =
  | 'comment_added'
  | 'version_uploaded'
  | 'approved'

export interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string | null
  role: Role
  display_name: string | null
  avatar_url: string | null
  invited_email: string | null
  invitation_token: string | null
  is_accepted: boolean
  created_at: string
}

export interface Video {
  id: string
  workspace_id: string
  title: string
  status: VideoStatus
  uploader_id: string
  created_at: string
  updated_at: string
  video_versions?: VideoVersion[]
  comments?: Comment[]
  _count?: { comments: number }
}

export interface VideoVersion {
  id: string
  video_id: string
  version_number: number
  storage_path: string | null
  file_name: string
  file_size: number
  duration: number | null
  thumbnail_path: string | null
  uploaded_by: string | null
  is_deleted: boolean
  created_at: string
}

export interface Comment {
  id: string
  video_id: string
  video_version_id: string | null
  author_id: string
  content: string
  timecode: number | null
  is_resolved: boolean
  parent_id: string | null
  has_annotation: boolean
  image_path: string | null
  created_at: string
  updated_at: string
  annotation?: Annotation
  replies?: Comment[]
  author?: { display_name: string | null; email: string }
}

export interface Annotation {
  id: string
  comment_id: string
  canvas_data: object
  created_at: string
}

export interface CommentTemplate {
  id: string
  workspace_id: string
  content: string
  sort_order: number
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  workspace_id: string
  type: NotificationType
  video_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}
