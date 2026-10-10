// Same format as the links in past fanmails:
// https://metalprogpop.s3.sa-east-1.amazonaws.com/videos/Programa095-Parte+1-Human.mp4
export function publicUrl({ bucket, region }, key) {
  const path = key
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%20/g, '+'))
    .join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
}
