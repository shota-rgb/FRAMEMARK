-- =====================
-- FRAMEMARK Database Schema
-- =====================

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workspace Members
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  display_name TEXT,
  avatar_url TEXT,
  invited_email TEXT,
  invitation_token TEXT,
  is_accepted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  uploader_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Video Versions
CREATE TABLE video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  storage_path TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration FLOAT,
  thumbnail_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(video_id, version_number)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  video_version_id UUID REFERENCES video_versions(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  timecode FLOAT,
  is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  has_annotation BOOLEAN DEFAULT FALSE NOT NULL,
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  canvas_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment Templates
CREATE TABLE comment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================
-- updated_at trigger
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- Default templates on workspace creation
-- =====================
CREATE OR REPLACE FUNCTION create_default_templates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO comment_templates (workspace_id, content, sort_order) VALUES
    (NEW.id, '【カット】この部分を削除してください', 1),
    (NEW.id, '【テロップ修正】テキストを「　」に変更してください', 2),
    (NEW.id, '【BGM】BGMをもう少し小さくしてください', 3),
    (NEW.id, '【尺調整】この部分をもう少し短くしてください', 4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_default_templates
  AFTER INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION create_default_templates();

-- =====================
-- Row Level Security
-- =====================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helpers: bypass RLS to avoid mutual recursion between workspaces ↔ workspace_members
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = uid
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_workspace_owner(ws_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = ws_id AND owner_id = uid
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Workspaces
CREATE POLICY "workspace_select" ON workspaces FOR SELECT USING (
  owner_id = auth.uid() OR
  is_workspace_member(id, auth.uid())
);
CREATE POLICY "workspace_insert" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspace_update" ON workspaces FOR UPDATE USING (owner_id = auth.uid());

-- Workspace Members
CREATE POLICY "members_select" ON workspace_members FOR SELECT USING (
  user_id = auth.uid() OR
  is_workspace_owner(workspace_id, auth.uid())
);
CREATE POLICY "members_insert" ON workspace_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "members_update" ON workspace_members FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "members_delete" ON workspace_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
);

-- Videos
CREATE POLICY "videos_select" ON videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = videos.workspace_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = videos.workspace_id AND user_id = auth.uid())
);
CREATE POLICY "videos_insert" ON videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces WHERE id = videos.workspace_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = videos.workspace_id AND user_id = auth.uid())
);
CREATE POLICY "videos_update" ON videos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = videos.workspace_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = videos.workspace_id AND user_id = auth.uid())
);

-- Video Versions
CREATE POLICY "versions_select" ON video_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM videos v WHERE v.id = video_versions.video_id AND (
      EXISTS (SELECT 1 FROM workspaces WHERE id = v.workspace_id AND owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = v.workspace_id AND user_id = auth.uid())
    )
  )
);
CREATE POLICY "versions_insert" ON video_versions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM videos v WHERE v.id = video_versions.video_id AND (
      EXISTS (SELECT 1 FROM workspaces WHERE id = v.workspace_id AND owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = v.workspace_id AND user_id = auth.uid())
    )
  )
);
CREATE POLICY "versions_update" ON video_versions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM videos v WHERE v.id = video_versions.video_id AND
    EXISTS (SELECT 1 FROM workspaces WHERE id = v.workspace_id AND owner_id = auth.uid())
  )
);

-- Comments
CREATE POLICY "comments_select" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM videos v WHERE v.id = comments.video_id AND (
      EXISTS (SELECT 1 FROM workspaces WHERE id = v.workspace_id AND owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = v.workspace_id AND user_id = auth.uid())
    )
  )
);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (
  author_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM videos v WHERE v.id = comments.video_id AND
    EXISTS (SELECT 1 FROM workspaces WHERE id = v.workspace_id AND owner_id = auth.uid())
  )
);

-- Annotations
CREATE POLICY "annotations_select" ON annotations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM comments c JOIN videos v ON v.id = c.video_id
    WHERE c.id = annotations.comment_id AND (
      EXISTS (SELECT 1 FROM workspaces WHERE id = v.workspace_id AND owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = v.workspace_id AND user_id = auth.uid())
    )
  )
);
CREATE POLICY "annotations_insert" ON annotations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM comments WHERE id = annotations.comment_id AND author_id = auth.uid())
);

-- Templates
CREATE POLICY "templates_select" ON comment_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = comment_templates.workspace_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = comment_templates.workspace_id AND user_id = auth.uid())
);
CREATE POLICY "templates_insert" ON comment_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces WHERE id = comment_templates.workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "templates_update" ON comment_templates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = comment_templates.workspace_id AND owner_id = auth.uid())
);
CREATE POLICY "templates_delete" ON comment_templates FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspaces WHERE id = comment_templates.workspace_id AND owner_id = auth.uid())
);

-- Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- =====================
-- Storage buckets (run in Supabase Dashboard > Storage)
-- Create bucket "videos" (public: false, file size: 5000MB)
-- Create bucket "images" (public: false, file size: 50MB)
-- =====================

-- =====================
-- Storage RLS policies (run after creating buckets)
-- =====================
CREATE POLICY "videos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');
CREATE POLICY "videos_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos');
CREATE POLICY "videos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'videos');
CREATE POLICY "videos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'videos');

CREATE POLICY "images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');
CREATE POLICY "images_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'images');
CREATE POLICY "images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images');
CREATE POLICY "images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images');
