import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard = fs.readFileSync(new URL('../js/auth-identity-guard-v1.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(guard, /from\('roles'\)/);
assert.match(guard, /No MOLMS access record is linked/);
assert.match(guard, /currentMemberId = authUser\.id/);
assert.match(guard, /onAuthStateChange/);
assert.match(guard, /window\.renderTopbarProfile = function/);
assert.match(guard, /selector\.style\.display = signedIn \? 'none' : ''/);
assert.doesNotMatch(guard, /from\('members'\)/);
assert.doesNotMatch(guard, /readObj\(LS\.userSettings\)/);
assert.match(shell, /molmsAuthIdentityGuardV1/);

console.log('MOLMS authenticated identity authority contract: PASS');
