/**
 * CI 用：若設定了 VITE_FIREBASE_HOSTING_SITE，覆寫 firebase.json 的 hosting.site。
 * 本機 firebase deploy 仍使用 repo 內 firebase.json 的預設值。
 */
import fs from 'node:fs';

const siteFromEnv = process.env.VITE_FIREBASE_HOSTING_SITE?.trim();
const path = 'firebase.json';
const cfg = JSON.parse(fs.readFileSync(path, 'utf8'));

if (siteFromEnv) {
  cfg.hosting.site = siteFromEnv;
  fs.writeFileSync(path, `${JSON.stringify(cfg, null, 2)}\n`);
  console.log(`Applied VITE_FIREBASE_HOSTING_SITE=${siteFromEnv}`);
} else {
  const committed = cfg.hosting?.site ?? '(none)';
  console.log(`VITE_FIREBASE_HOSTING_SITE not set; using firebase.json site=${committed}`);
}
