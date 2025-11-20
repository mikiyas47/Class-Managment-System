// Script to test bcrypt functionality
import bcrypt from 'bcryptjs';

async function testBcrypt() {
  try {
    console.log('Testing bcrypt functionality...');
    
    // Test password
    const password = 'miki1234';
    console.log('Original password:', password);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed password:', hashedPassword);
    
    // Test comparison with correct password
    const isMatch1 = await bcrypt.compare(password, hashedPassword);
    console.log('Comparison with correct password:', isMatch1);
    
    // Test comparison with incorrect password
    const isMatch2 = await bcrypt.compare('wrongpassword', hashedPassword);
    console.log('Comparison with incorrect password:', isMatch2);
    
    if (isMatch1 && !isMatch2) {
      console.log('✅ Bcrypt is working correctly!');
    } else {
      console.log('❌ Bcrypt is not working correctly!');
    }
  } catch (error) {
    console.error('❌ Error testing bcrypt:', error);
  }
}

testBcrypt();