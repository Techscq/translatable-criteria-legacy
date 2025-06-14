import { v4 as uuidv4 } from 'uuid';
import { GetTypedCriteriaSchema } from '../../../../types/schema.types.js';

export interface EntityBase {
  uuid: string;
  created_at: string;
}

export interface User extends EntityBase {
  email: string;
  username: string;
  addresses: Address[];
  permissions: Permission[];
  posts: Post[];
}

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: ['users', 'user', 'publisher'],
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    {
      alias: 'permissions',
      join_relation_type: 'many_to_many',
    },
    {
      alias: 'addresses',
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'posts',
      join_relation_type: 'one_to_many',
    },
  ],
});
export type UserSchema = typeof UserSchema;

export interface Post extends EntityBase {
  title: string;
  body: string;
  publisher: User;
  comments: Comment[];
}

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: ['uuid', 'title', 'body', 'user_uuid', 'created_at'],
  joins: [
    { alias: 'comments', join_relation_type: 'one_to_many' },
    { alias: 'publisher', join_relation_type: 'many_to_one' },
  ],
});
export type PostSchema = typeof PostSchema;

export interface Comment extends EntityBase {
  comment_text: string;
  post: Post;
  user: User;
}

export const PostCommentSchema = GetTypedCriteriaSchema({
  source_name: 'post_comment',
  alias: ['comments', 'comment'],
  fields: ['uuid', 'comment_text', 'user_uuid', 'post_uuid', 'created_at'],
  joins: [
    { alias: 'post', join_relation_type: 'many_to_one' },
    { alias: 'user', join_relation_type: 'many_to_one' },
  ],
});
export type PostCommentSchema = typeof PostCommentSchema;
export interface Permission extends EntityBase {
  name: string;
  users?: User[];
}

export const PermissionSchema = GetTypedCriteriaSchema({
  source_name: 'permission',
  alias: ['permissions', 'permission'],
  fields: ['uuid', 'name', 'created_at'],
  joins: [
    {
      alias: 'users',
      join_relation_type: 'many_to_many',
    },
  ],
});
export type PermissionSchema = typeof PermissionSchema;
export interface Address extends EntityBase {
  direction: string;
  user: User;
}

export const AddressSchema = GetTypedCriteriaSchema({
  source_name: 'address',
  alias: ['addresses', 'address'],
  fields: ['uuid', 'direction', 'user_uuid', 'created_at'],
  joins: [
    {
      alias: 'user',
      join_relation_type: 'many_to_one',
    },
  ],
});
export type AddressSchema = typeof AddressSchema;
export function generateFakeData() {
  let lastDate = new Date();
  const generateSequentialCreatedAt = (secondsDecrement = 1): string => {
    lastDate = new Date(lastDate.getTime() - secondsDecrement * 1000);
    return lastDate.toISOString();
  };

  const resetDateBase = () => {
    lastDate = new Date();
    lastDate.setDate(lastDate.getDate() - 200);
  };

  resetDateBase();

  const permissionsData: Permission[] = [];
  for (let i = 0; i < 5; i++) {
    permissionsData.push({
      uuid: uuidv4(),
      name: `permission_name_${i + 1}`,
      created_at: generateSequentialCreatedAt(10),
    });
  }

  const usersData: User[] = [];
  for (let i = 0; i < 8; i++) {
    const userPermissions: Permission[] = [];
    if (i === 0) {
      userPermissions.push(permissionsData[0]!, permissionsData[1]!);
    } else if (i === 1) {
      userPermissions.push(
        permissionsData[0]!,
        permissionsData[2]!,
        permissionsData[4]!,
      );
    } else {
      userPermissions.push(
        permissionsData[0]!,
        permissionsData[1]!,
        permissionsData[2]!,
        permissionsData[3]!,
      );
    }

    usersData.push({
      uuid: uuidv4(),
      email: `user${i + 1}@example.com`,
      username: `user_${i + 1}`,
      created_at: generateSequentialCreatedAt(20),
      addresses: [],
      posts: [],
      permissions: userPermissions,
    });
  }

  const addressesData: Address[] = [];
  usersData.forEach((user, index) => {
    const numAddresses = (index % 3) + 1;
    for (let i = 0; i < numAddresses; i++) {
      const address: Address = {
        uuid: uuidv4(),
        direction: `${(i + 1) * 100} Fake St, City ${index + 1}`,
        user: user,
        created_at: generateSequentialCreatedAt(5),
      };
      addressesData.push(address);
      user.addresses.push(address);
    }
  });

  const postsData: Post[] = [];
  for (let i = 0; i < 15; i++) {
    const publisherIndex = i % usersData.length;
    const post: Post = {
      uuid: uuidv4(),
      title: `Post Title ${i + 1}`,
      body: `This is the body of post ${i + 1}. Authored by ${usersData[publisherIndex]!.username}.`,
      publisher: usersData[publisherIndex]!,
      comments: [],
      created_at: generateSequentialCreatedAt(7),
    };
    postsData.push(post);
    usersData[publisherIndex]!.posts.push(post);
  }

  const allCommentsData: Comment[] = [];
  postsData.forEach((post, postIndex) => {
    for (let i = 0; i < 3; i++) {
      const mainCommentUserIndex = (postIndex + i) % usersData.length;
      const mainComment: Comment = {
        uuid: uuidv4(),
        comment_text: `Main comment ${i + 1} on "${post.title}" by ${usersData[mainCommentUserIndex]!.username}.`,
        post: post,
        user: usersData[mainCommentUserIndex]!,
        created_at: generateSequentialCreatedAt(3),
      };
      allCommentsData.push(mainComment);
      post.comments.push(mainComment);
    }
  });

  return {
    fakePermissions: permissionsData,
    fakeUsers: usersData,
    fakeAddresses: addressesData,
    fakePosts: postsData,
    fakeComments: allCommentsData,
  };
}
