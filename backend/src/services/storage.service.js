const fs = require('fs');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const config = require('../config/env');

class StorageService {
  constructor() {
    this.bucket = config.STORAGE_BUCKET;
    this.localDir = path.resolve(process.cwd(), './private_storage');

    if (config.STORAGE_ACCESS_KEY && config.STORAGE_SECRET_KEY) {
      this.useS3 = true;
      const s3Config = {
        credentials: {
          accessKeyId: config.STORAGE_ACCESS_KEY,
          secretAccessKey: config.STORAGE_SECRET_KEY,
        },
        region: config.STORAGE_REGION,
        forcePathStyle: true,
      };
      if (config.STORAGE_ENDPOINT) {
        s3Config.endpoint = config.STORAGE_ENDPOINT;
      }
      this.s3Client = new S3Client(s3Config);
    } else {
      this.useS3 = false;
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
    }
  }

  _getLocalPath(storageKey) {
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(this.localDir, safeKey);
    if (!fullPath.startsWith(this.localDir)) {
      throw new Error('Invalid storage key path traversal attempt');
    }
    return fullPath;
  }

  async saveObject(storageKey, fileBuffer, contentType) {
    if (this.useS3) {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: contentType,
      });
      await this.s3Client.send(command);
      return true;
    } else {
      const localPath = this._getLocalPath(storageKey);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, fileBuffer);
      return true;
    }
  }

  async getObject(storageKey) {
    if (this.useS3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      const response = await this.s3Client.send(command);
      const streamToBuffer = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      return await streamToBuffer(response.Body);
    } else {
      const localPath = this._getLocalPath(storageKey);
      if (!fs.existsSync(localPath)) {
        const err = new Error(`Storage key ${storageKey} not found`);
        err.statusCode = 404;
        throw err;
      }
      return fs.readFileSync(localPath);
    }
  }

  async getObjectSize(storageKey) {
    if (this.useS3) {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      const response = await this.s3Client.send(command);
      return response.ContentLength;
    } else {
      const localPath = this._getLocalPath(storageKey);
      if (!fs.existsSync(localPath)) {
        const err = new Error(`Storage key ${storageKey} not found`);
        err.statusCode = 404;
        throw err;
      }
      const stats = fs.statSync(localPath);
      return stats.size;
    }
  }

  async getObjectRange(storageKey, start, end) {
    if (this.useS3) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Range: `bytes=${start}-${end}`,
      });
      const response = await this.s3Client.send(command);
      const streamToBuffer = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      return await streamToBuffer(response.Body);
    } else {
      const localPath = this._getLocalPath(storageKey);
      if (!fs.existsSync(localPath)) {
        const err = new Error(`Storage key ${storageKey} not found`);
        err.statusCode = 404;
        throw err;
      }
      const length = end - start + 1;
      const buffer = Buffer.alloc(length);
      const fd = fs.openSync(localPath, 'r');
      fs.readSync(fd, buffer, 0, length, start);
      fs.closeSync(fd);
      return buffer;
    }
  }

  async deleteObject(storageKey) {
    if (this.useS3) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        });
        await this.s3Client.send(command);
        return true;
      } catch (e) {
        return false;
      }
    } else {
      const localPath = this._getLocalPath(storageKey);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
      return false;
    }
  }
}

module.exports = new StorageService();
