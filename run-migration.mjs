import { readFileSync } from 'fs';
import { lookup } from 'dns/promises';
import pg from 'pg';

const host = 'db.udfqkkeupibrhighbizj.supabase.co';
try {
  const resolved = await lookup(host, { family: 0 });
  console.log(`Resolved ${host} → ${resolved.address} (family: ${resolved.family})`);
} catch (e) {
  console.log(`DNS lookup failed: ${e.message}`);
}

// Try pooler endpoint
for (const h of [
  host,
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
]) {
  try {
    const r = await lookup(h, { family: 0 });
    console.log(`${h} → ${r.address} (v${r.family})`);
  } catch (e) {
    console.log(`${h} → FAIL: ${e.code}`);
  }
}
