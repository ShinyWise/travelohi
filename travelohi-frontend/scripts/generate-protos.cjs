const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const protoDir = path.resolve(__dirname, '../../proto');
const outDir = path.resolve(__dirname, '../src/proto');


if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function getProtoFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getProtoFiles(fullPath));
    } else if (file.endsWith('.proto')) {
      results.push(fullPath);
    }
  });
  return results;
}

const protoFiles = getProtoFiles(protoDir);

if (protoFiles.length === 0) {
  console.error('No .proto files found in', protoDir);
  process.exit(1);
}

console.log(`Found ${protoFiles.length} proto files.`);
const command = `npx protoc --proto_path="${protoDir}" --ts_out="${outDir}" ${protoFiles.map(f => `"${f}"`).join(' ')}`;
console.log('Executing proto generation...');
try {
  execSync(command, { stdio: 'inherit' });
  console.log('Proto generation complete!');
} catch (err) {
  console.error('Error during proto generation:', err.message);
  process.exit(1);
}
