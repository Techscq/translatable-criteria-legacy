import { DataSource, type EntitySchema, type QueryRunner } from 'typeorm';
import { UserEntity } from '../entities/user.entity.js';
import { AddressEntity } from '../entities/address.entity.js';
import { PostEntity } from '../entities/post.entity.js';
import { PermissionEntity } from '../entities/permission.entity.js';
import { PostCommentEntity } from '../entities/post-comments.entity.js';
import {
  type EntityBase,
  generateFakeData,
} from '../../test/fake/fake-entities.js';
import { initializeDatabase } from '../../mysql/test/mysql.utils.js';
import 'dotenv/config';

const dbHost = process.env.MYSQL_HOST || '';
const dbPort = parseInt(process.env.MYSQL_PORT || '', 10);
const dbUser = process.env.MYSQL_USER || '';
const dbPassword = process.env.MYSQL_PASSWORD || '';
const dbDatabase = process.env.MYSQL_DATABASE_NAME || '';

export const DbDatasource = new DataSource({
  type: 'mysql',
  host: dbHost,
  port: dbPort,
  username: dbUser,
  password: dbPassword,
  database: dbDatabase,
  entities: [
    UserEntity,
    AddressEntity,
    PostEntity,
    PermissionEntity,
    PostCommentEntity,
  ],
  synchronize: true,
  cache: false,
  dropSchema: true,
});

export async function initializeDataSource() {
  if (!DbDatasource.isInitialized) {
    try {
      await initializeDatabase();
      await DbDatasource.initialize();
    } catch (e) {
      console.error('Error connecting to database: ', e);
      throw e;
    }
  }
}

export const getTypeORMQueryBuilderFor = async <T extends EntityBase>(
  entitySchema: EntitySchema<T>,
  alias: string,
) => {
  await initializeDataSource();
  return DbDatasource.getRepository(entitySchema).createQueryBuilder(alias);
};

export async function seedDatabaseWith() {
  await initializeDataSource();
  const queryRunner: QueryRunner = DbDatasource.createQueryRunner();

  await queryRunner.connect();
  const allFakeData = generateFakeData();
  try {
    const manager = queryRunner.manager;

    await manager.getRepository(PostCommentEntity).deleteAll();
    await manager.getRepository(PostEntity).deleteAll();
    await manager.getRepository(AddressEntity).deleteAll();
    await manager.getRepository(UserEntity).deleteAll();
    await manager.getRepository(PermissionEntity).deleteAll();

    for (const permission of allFakeData.fakePermissions) {
      await manager.getRepository(PermissionEntity).save(permission);
    }
    for (const user of allFakeData.fakeUsers) {
      await manager.getRepository(UserEntity).save(user);
    }
    for (const address of allFakeData.fakeAddresses) {
      await manager.getRepository(AddressEntity).save(address);
    }
    for (const post of allFakeData.fakePosts) {
      await manager.getRepository(PostEntity).save(post);
    }
    for (const comment of allFakeData.fakeComments) {
      await manager.getRepository(PostCommentEntity).save(comment);
    }
  } catch (err) {
    console.error(
      '--- BEFOREALL: ERROR during data generation or seeding ---',
      err,
    );
    throw err;
  } finally {
    await queryRunner.release();
  }
  return allFakeData;
}
