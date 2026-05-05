import fs from 'fs';
import path from 'path';

/**
 * ZINC Version Bumper
 * Automates the process of raising the version in:
 * - package.json
 * - package-lock.json
 * - public/version.json
 */

const packagePath = path.resolve(process.cwd(), 'package.json');
const packageLockPath = path.resolve(process.cwd(), 'package-lock.json');
const versionJsonPath = path.resolve(process.cwd(), 'public/version.json');

function bumpVersion() {
  try {
    // 1. Read package.json
    if (!fs.existsSync(packagePath)) {
      console.error('❌ Error: package.json not found');
      process.exit(1);
    }
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const oldVersion = pkg.version;
    
    // Increment version logic: supports '2.016' style or '1.0.0' style
    const versionParts = oldVersion.split('.');
    const lastPartIndex = versionParts.length - 1;
    const lastPart = versionParts[lastPartIndex];
    
    if (isNaN(Number(lastPart))) {
      console.error(`❌ Error: Last part of version "${lastPart}" is not a number.`);
      process.exit(1);
    }

    const newLastPart = (parseInt(lastPart) + 1).toString().padStart(lastPart.length, '0');
    versionParts[lastPartIndex] = newLastPart;
    const newVersion = versionParts.join('.');

    console.log(`🚀 Bumping version: ${oldVersion} -> ${newVersion}`);

    // 2. Update package.json
    pkg.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('✅ Updated package.json');

    // 3. Update package-lock.json
    if (fs.existsSync(packageLockPath)) {
      const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
      lock.version = newVersion;
      if (lock.packages && lock.packages['']) {
        lock.packages[''].version = newVersion;
      }
      fs.writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n');
      console.log('✅ Updated package-lock.json');
    }

    // 4. Update public/version.json
    if (fs.existsSync(versionJsonPath)) {
      const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      const oldReleaseDate = versionJson.releaseDate;
      const newReleaseDate = new Date().toISOString().split('T')[0];
      
      versionJson.version = newVersion;
      versionJson.releaseDate = newReleaseDate;
      
      // Keep old notes as a template if it was a manual bump without notes
      // Or set default ones
      versionJson.notes = {
        AR: "تحسينات عامة وتحديثات في استقرار النظام.",
        EN: "General improvements and system stability updates."
      };
      
      fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n');
      console.log(`✅ Updated public/version.json (Date: ${newReleaseDate})`);
    }

    // 5. Update public/preflight.js (New!)
    const preflightPath = path.resolve(process.cwd(), 'public/preflight.js');
    if (fs.existsSync(preflightPath)) {
      let content = fs.readFileSync(preflightPath, 'utf8');
      // Look for const CURRENT_VERSION = '...';
      const versionRegex = /const CURRENT_VERSION = '.*?';/;
      if (versionRegex.test(content)) {
        content = content.replace(versionRegex, `const CURRENT_VERSION = '${newVersion}';`);
        fs.writeFileSync(preflightPath, content);
        console.log('✅ Updated public/preflight.js');
      }
    }

    console.log('\n✨ Version bump complete! Everything is in sync.');
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
    process.exit(1);
  }
}

bumpVersion();
