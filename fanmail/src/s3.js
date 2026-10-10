import { GetObjectAclCommand, ListObjectsV2Command, PutObjectAclCommand, S3Client } from '@aws-sdk/client-s3';

const ALL_USERS = 'http://acs.amazonaws.com/groups/global/AllUsers';

export function createS3({ profile, region, bucket }) {
  const client = new S3Client({ region, profile });

  return {
    async listKeys() {
      const keys = [];
      let ContinuationToken;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }));
        for (const obj of page.Contents ?? []) keys.push(obj.Key);
        ContinuationToken = page.NextContinuationToken;
      } while (ContinuationToken);
      return keys;
    },

    async isPublic(key) {
      const acl = await client.send(new GetObjectAclCommand({ Bucket: bucket, Key: key }));
      return (acl.Grants ?? []).some((g) => g.Grantee?.URI === ALL_USERS && ['READ', 'FULL_CONTROL'].includes(g.Permission));
    },

    async makePublic(key) {
      await client.send(new PutObjectAclCommand({ Bucket: bucket, Key: key, ACL: 'public-read' }));
    },
  };
}
