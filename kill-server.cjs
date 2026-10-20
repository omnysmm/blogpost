const { execSync } = require('child_process');
try {
  const out = execSync('netstat -ano | findstr ":3000" | findstr LISTENING', { encoding: 'utf8' });
  const match = out.match(/\s+(\d+)\s*$/);
  if (match) {
    console.log('Killing PID', match[1]);
    execSync(`taskkill /PID ${match[1]} /F`, { encoding: 'utf8' });
  }
} catch (e) {
  console.log('No process found or already killed');
}
