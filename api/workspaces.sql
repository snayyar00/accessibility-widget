CREATE TABLE workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  alias VARCHAR(255) NOT NULL,
  organization_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  created_by INT UNSIGNED NOT NULL,
  UNIQUE KEY unique_alias_org (alias, organization_id),
  KEY idx_workspace_org (organization_id)
);

CREATE TABLE workspace_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  workspace_id INT NOT NULL,
  role ENUM('member', 'admin', 'owner') DEFAULT 'member',
  status ENUM('pending', 'active', 'inactive', 'decline') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  invitation_token VARCHAR(255) NULL,
  UNIQUE KEY unique_user_workspace (user_id, workspace_id),
  KEY idx_workspace_users_workspace (workspace_id),
  KEY idx_workspace_users_user (user_id)
);

CREATE TABLE workspace_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  workspace_id INT NOT NULL,
  organization_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'expired') NOT NULL,
  role ENUM('member', 'admin', 'owner') DEFAULT 'member',
  valid_until DATETIME NOT NULL,
  invited_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_workspace (email, workspace_id),
  UNIQUE KEY unique_token (token),
  KEY idx_invitations_workspace (workspace_id),
  KEY idx_invitations_email (email)
);

ALTER TABLE workspaces 
ADD CONSTRAINT fk_workspaces_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_workspaces_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE workspace_users 
ADD CONSTRAINT fk_workspace_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_workspace_users_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE workspace_invitations 
ADD CONSTRAINT fk_workspace_invitations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_workspace_invitations_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_workspace_invitations_invited_by FOREIGN KEY (invited_by) REFERENCES users(id);