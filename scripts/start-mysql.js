/**
 * start-mysql.js
 * Starts MySQL if it isn't already running.
 * Works on Windows, macOS, and Linux.
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

const platform = os.platform();

function isRunning() {
  try {
    if (platform === 'win32') {
      const out = execSync('sc query MySQL 2>nul || sc query MySQL80 2>nul', { encoding: 'utf8' });
      return out.includes('RUNNING');
    } else {
      execSync('mysqladmin ping --silent 2>/dev/null', { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}

function startMySQL() {
  console.log('[MySQL] Starting MySQL...');

  try {
    if (platform === 'win32') {
      // Try common Windows service names
      try { execSync('net start MySQL80', { stdio: 'inherit' }); }
      catch { execSync('net start MySQL', { stdio: 'inherit' }); }

    } else if (platform === 'darwin') {
      // macOS — try brew services first, then mysqld_safe
      try { execSync('brew services start mysql', { stdio: 'inherit' }); }
      catch {
        spawn('mysqld_safe', [], { detached: true, stdio: 'ignore' }).unref();
      }

    } else {
      // Linux — try systemctl, then service, then mysqld_safe
      try { execSync('sudo systemctl start mysql', { stdio: 'inherit' }); }
      catch {
        try { execSync('sudo service mysql start', { stdio: 'inherit' }); }
        catch {
          spawn('mysqld_safe', [], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    }
  } catch (err) {
    console.error('[MySQL] Could not start MySQL automatically:', err.message);
    console.error('[MySQL] Please start MySQL manually and re-run.');
    process.exit(1);
  }
}

function waitUntilReady(retries = 15) {
  if (isRunning()) {
    console.log('[MySQL] ✅ MySQL is running.');
    return;
  }
  if (retries === 0) {
    console.error('[MySQL] ❌ MySQL did not start in time. Start it manually.');
    process.exit(1);
  }
  console.log(`[MySQL] Waiting for MySQL... (${retries} retries left)`);
  execSync('node -e "setTimeout(()=>{},2000)"'); // 2 second wait
  waitUntilReady(retries - 1);
}

if (isRunning()) {
  console.log('[MySQL] ✅ MySQL is already running.');
} else {
  startMySQL();
  waitUntilReady();
}
