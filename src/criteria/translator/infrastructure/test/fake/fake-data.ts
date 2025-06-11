export interface EntityBase {
  uuid: string;
}

export interface User extends EntityBase {
  email: string;
  username: string;
  direction_uuid?: string;
}

export interface Post extends EntityBase {
  title: string;
  body: string;
  user_uuid: string;
}

export interface Comment extends EntityBase {
  comment_text: string;
  post_uuid: string;
  user_uuid: string;
  comment_uuid?: string;
}

export interface Permission extends EntityBase {
  name: string;
}

export interface Direction extends EntityBase {
  direction: string;
  user_uuid?: string;
}

export interface PermissionUserPivot {
  user_uuid: string;
  permission_uuid: string;
}

export interface InMemoryDb {
  user: User[];
  post: Post[];
  comment: Comment[];
  permission: Permission[];
  direction: Direction[];
  permission_user: PermissionUserPivot[];
}

export const fakeDb: InMemoryDb = {
  user: [
    {
      uuid: 'user-1',
      email: 'alice@example.com',
      username: 'alice',
      direction_uuid: 'dir-1',
    },
    {
      uuid: 'user-2',
      email: 'bob@example.com',
      username: 'bob',
      direction_uuid: 'dir-2',
    },
    { uuid: 'user-3', email: 'carol@example.com', username: 'carol' },
  ],
  post: [
    {
      uuid: 'post-1',
      title: 'First Post',
      body: 'Content of first post',
      user_uuid: 'user-1',
    },
    {
      uuid: 'post-2',
      title: 'Second Post',
      body: 'Content of second post',
      user_uuid: 'user-2',
    },
  ],
  comment: [
    {
      uuid: 'comment-1',
      comment_text: 'Great post!',
      post_uuid: 'post-1',
      user_uuid: 'user-2',
    },
    {
      uuid: 'comment-2',
      comment_text: 'Thanks!',
      post_uuid: 'post-1',
      user_uuid: 'user-1',
    },
    {
      uuid: 'comment-3',
      comment_text: 'Interesting.',
      post_uuid: 'post-2',
      comment_uuid: 'comment-1',
      user_uuid: 'user-3',
    },
  ],
  permission: [
    { uuid: 'perm-1', name: 'create_post' },
    { uuid: 'perm-2', name: 'edit_user' },
    { uuid: 'perm-3', name: 'view_stats' },
  ],
  direction: [
    { uuid: 'dir-1', direction: '123 Main St', user_uuid: 'user-1' },
    { uuid: 'dir-2', direction: '456 Oak Ave', user_uuid: 'user-2' },
  ],
  permission_user: [
    { user_uuid: 'user-1', permission_uuid: 'perm-1' },
    { user_uuid: 'user-1', permission_uuid: 'perm-3' },
    { user_uuid: 'user-2', permission_uuid: 'perm-1' },
    { user_uuid: 'user-3', permission_uuid: 'perm-2' },
  ],
};

export function getCollection<T>(db: InMemoryDb, sourceName: string): T[] {
  if (sourceName in db) {
    return db[sourceName as keyof InMemoryDb] as any as T[];
  }
  return [];
}
