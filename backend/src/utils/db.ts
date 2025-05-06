import mysql from 'mysql2/promise';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// 缓存数据库凭证以避免频繁调用 Secrets Manager
let cachedDbConfig: mysql.PoolOptions | null = null;
let cacheExpiration = new Date(0);

// 从 Secrets Manager 获取数据库凭证
async function getDbConfig(): Promise<mysql.PoolOptions> {
  // 如果缓存有效，直接返回缓存的凭证
  if (cachedDbConfig && new Date() < cacheExpiration) {
    return cachedDbConfig;
  }

  try {
    const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
    const secretId = process.env.DB_SECRETS_ID;

    if (!secretId) {
      throw new Error('未设置 DB_SECRETS_ID 环境变量');
    }

    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await secretsManager.send(command);

    if (!response.SecretString) {
      throw new Error('无法获取数据库凭证');
    }

    const secretData = JSON.parse(response.SecretString);

    // 设置缓存过期时间（15分钟后）
    cacheExpiration = new Date();
    cacheExpiration.setTime(cacheExpiration.getTime() + 15 * 60 * 1000);

    // 缓存数据库配置
    cachedDbConfig = {
      host: secretData.host,
      user: secretData.username,
      password: secretData.password,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    return cachedDbConfig;
  } catch (error) {
    console.error('获取数据库凭证失败:', error);
    throw error;
  }
}

// 延迟初始化的连接池
let poolPromise: Promise<mysql.Pool> | null = null;

// 获取数据库连接池
export async function getPool(): Promise<mysql.Pool> {
  if (!poolPromise) {
    poolPromise = getDbConfig().then(config => mysql.createPool(config)).catch(error => {
      console.error('初始化数据库连接池失败:', error);
      throw error;
    });
  }
  return poolPromise;
}

// 执行数据库查询
export async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  console.log("DB Query", sql, params);
  const pool = await getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}