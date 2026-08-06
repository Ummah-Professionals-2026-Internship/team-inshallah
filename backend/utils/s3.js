// Shared S3 client and URL signing.
//
// Uploads store the plain object URL, but the bucket is private, so anything
// handed to the browser has to be signed first or it comes back 403.

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function getSignedFileUrl(storedUrl) {
  if (!storedUrl) return "";

  const key = storedUrl.split(".amazonaws.com/")[1];
  if (!key) return storedUrl;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  const lowerKey = key.toLowerCase();

  if (lowerKey.endsWith(".pdf")) {
    params.ResponseContentDisposition = "inline";
    params.ResponseContentType = "application/pdf";
  } else if (lowerKey.endsWith(".docx")) {
    params.ResponseContentDisposition = "attachment";
    params.ResponseContentType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (lowerKey.endsWith(".doc")) {
    params.ResponseContentDisposition = "attachment";
    params.ResponseContentType = "application/msword";
  }

  const command = new GetObjectCommand(params);
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
