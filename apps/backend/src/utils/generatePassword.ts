import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'newPassword123';

console.log("Password: ", password);

// Hash with SHA256 first
const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');

// Then hash with bcrypt
bcrypt.hash(sha256Hash, 10).then(hashedPassword => {
  console.log(`\nPassword: ${password}`);
  console.log(`Hashed: ${hashedPassword}\n`);
  console.log(`MongoDB Update Command:`);
  console.log(`db.admins.updateOne({ email: "admin@platform.com" }, { $set: { password: "${hashedPassword}" } })`);
});